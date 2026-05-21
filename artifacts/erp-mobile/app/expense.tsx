import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api, getBaseUrl, loadToken } from "@/lib/api";

interface ExpenseCategory {
  id: number;
  name: string;
}

interface UploadResponse {
  url: string;
}

async function uploadReceipt(uri: string): Promise<string> {
  const token = await loadToken();
  const form = new FormData();
  const name = uri.split("/").pop() ?? "receipt.jpg";
  const ext = (name.split(".").pop() ?? "jpg").toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  // React Native FormData accepts { uri, name, type } per its polyfill.
  form.append("file", { uri, name, type } as unknown as Blob);
  const resp = await fetch(`${getBaseUrl()}/api/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
  const data = (await resp.json()) as UploadResponse;
  return data.url;
}

export default function ExpenseScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [photo, setPhoto] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [vendor, setVendor] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/expense-categories"],
    queryFn: () => api<ExpenseCategory[]>("/expense-categories"),
  });

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access required", "Enable camera permissions in Settings to capture receipts.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!r.canceled && r.assets?.[0]) setPhoto(r.assets[0].uri);
  };
  const pickFromLibrary = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) setPhoto(r.assets[0].uri);
  };

  const save = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
      if (!categoryId) throw new Error("Pick a category");
      let receiptUrl: string | null = null;
      if (photo) receiptUrl = await uploadReceipt(photo);
      return api<{ id: number }>("/expenses", {
        method: "POST",
        body: {
          categoryId,
          amount: amt,
          vendor: vendor || null,
          note: note || null,
          receiptUrl,
          paymentMethod: "cash",
          incurredOn: new Date().toISOString().slice(0, 10),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/expenses"] });
      qc.invalidateQueries({ queryKey: ["/dashboard/widgets"] });
      Alert.alert("Saved", "Expense recorded.");
      router.back();
    },
    onError: (e: Error) => Alert.alert("Could not save", e.message),
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
      <Stack.Screen options={{ title: "New expense", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />

      {photo ? (
        <View style={[styles.photoBox, { borderColor: colors.border }]}>
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          <Pressable onPress={() => setPhoto(null)} style={[styles.removeBtn, { backgroundColor: colors.destructive }]}>
            <Feather name="x" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraRow}>
          <Pressable
            onPress={pickFromCamera}
            style={({ pressed }) => [styles.cameraBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="camera" size={20} color={colors.accentForeground} />
            <Text style={[styles.cameraLabel, { color: colors.accentForeground }]}>Capture receipt</Text>
          </Pressable>
          <Pressable
            onPress={pickFromLibrary}
            style={({ pressed }) => [
              styles.cameraBtn,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="image" size={20} color={colors.foreground} />
            <Text style={[styles.cameraLabel, { color: colors.foreground }]}>Library</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (₹)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: categoryId === c.id ? colors.accent : colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={{ color: categoryId === c.id ? colors.accentForeground : colors.foreground, fontFamily: "Inter_500Medium" }}>
              {c.name}
            </Text>
          </Pressable>
        ))}
        {categories.length === 0 ? <Text style={{ color: colors.mutedForeground }}>No categories. Add one on web.</Text> : null}
      </ScrollView>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Vendor (optional)</Text>
      <TextInput
        value={vendor}
        onChangeText={setVendor}
        placeholder="e.g. Reliance Fresh"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      <Text style={[styles.label, { color: colors.mutedForeground }]}>Note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What was this for?"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, minHeight: 70 }]}
      />

      <Pressable
        onPress={() => save.mutate()}
        disabled={save.isPending}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: save.isPending || pressed ? 0.7 : 1 },
        ]}
      >
        {save.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>Save expense</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cameraRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  cameraBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 12 },
  cameraLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  photoBox: { borderWidth: 1, borderRadius: 12, overflow: "hidden", aspectRatio: 4 / 3, marginBottom: 8 },
  photo: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 6, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_500Medium" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  saveBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveLabel: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
