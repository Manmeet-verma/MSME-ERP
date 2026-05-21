import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Item {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  hsn: string | null;
  gstRate: string | null;
  salePrice: string | null;
  purchasePrice: string | null;
  currentStock: string | number | null;
  lowStockThreshold: string | number | null;
}

export default function BarcodeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setScannedCode(data);
    setLoading(true);
    try {
      const items = await api<Item[]>("/items", { query: { search: data } });
      const match = items.find((i) => i.sku.trim().toLowerCase() === data.trim().toLowerCase()) ?? items[0] ?? null;
      setItem(match);
      if (!match) Alert.alert("No match", `No item found for SKU "${data}".`);
    } catch (e) {
      Alert.alert("Lookup failed", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setScannedCode(null);
    setItem(null);
    setScanning(true);
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Scan barcode", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Scan barcode", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
        <Feather name="camera-off" size={36} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, marginTop: 16, textAlign: "center", paddingHorizontal: 24 }}>
          Camera access is needed to scan item barcodes.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.btn, { backgroundColor: colors.accent, marginTop: 16, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: colors.accentForeground }]}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Scan barcode", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanning ? handleScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "itf14"] }}
        />
        <View pointerEvents="none" style={[styles.reticle, { borderColor: colors.accent }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
        ) : scannedCode ? (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scannedLabel, { color: colors.mutedForeground }]}>Scanned</Text>
            <Text style={[styles.scannedCode, { color: colors.foreground }]}>{scannedCode}</Text>

            {item ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={{ color: colors.mutedForeground, marginTop: 2 }}>SKU {item.sku}</Text>
                <View style={styles.kvRow}>
                  <Text style={{ color: colors.mutedForeground }}>Sale price</Text>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{formatCurrency(item.salePrice ?? 0)}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={{ color: colors.mutedForeground }}>Stock</Text>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                    {item.currentStock ?? 0} {item.unit}
                  </Text>
                </View>
                {item.category ? (
                  <View style={styles.kvRow}>
                    <Text style={{ color: colors.mutedForeground }}>Category</Text>
                    <Text style={{ color: colors.foreground }}>{item.category}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>No matching item.</Text>
            )}

            <Pressable
              onPress={reset}
              style={({ pressed }) => [styles.btn, { backgroundColor: colors.accent, marginTop: 16, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="refresh-cw" size={16} color={colors.accentForeground} />
              <Text style={[styles.btnLabel, { color: colors.accentForeground }]}>Scan again</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>Point camera at a barcode.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  cameraBox: { height: 320, backgroundColor: "#000", position: "relative" },
  reticle: { position: "absolute", top: 50, left: 40, right: 40, bottom: 50, borderWidth: 2, borderRadius: 12 },
  resultCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  scannedLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter_500Medium" },
  scannedCode: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 4 },
  divider: { height: 1, marginVertical: 14 },
  itemName: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  kvRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  btnLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
