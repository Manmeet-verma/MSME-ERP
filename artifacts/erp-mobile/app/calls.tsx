import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface Call {
  id: number;
  toNumber: string;
  fromNumber: string | null;
  status: string;
  durationSec: number | null;
  summary: string | null;
  leadId: number | null;
  createdAt: string;
}

export default function CallsScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [number, setNumber] = useState("");

  const { data: calls = [], isLoading, refetch } = useQuery<Call[]>({
    queryKey: ["/calls"],
    queryFn: () => api<Call[]>("/calls"),
  });

  const initiate = useMutation({
    mutationFn: (toNumber: string) =>
      api<Call>("/calls/initiate", { method: "POST", body: { toNumber } }),
    onSuccess: () => {
      setNumber("");
      qc.invalidateQueries({ queryKey: ["/calls"] });
      Alert.alert("Call initiated", "Twilio will ring your registered agent phone first, then connect the lead.");
    },
    onError: (e: Error) => Alert.alert("Could not initiate call", e.message),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Calls", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <View style={[styles.dialer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={number}
          onChangeText={setNumber}
          placeholder="+91 98xxxxxxxx"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          autoCorrect={false}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        />
        <Pressable
          onPress={() => number.trim() && initiate.mutate(number.trim())}
          disabled={!number.trim() || initiate.isPending}
          style={({ pressed }) => [
            styles.dialBtn,
            { backgroundColor: colors.accent, opacity: !number.trim() || initiate.isPending || pressed ? 0.7 : 1 },
          ]}
        >
          {initiate.isPending ? (
            <ActivityIndicator color={colors.accentForeground} />
          ) : (
            <>
              <Feather name="phone-call" size={18} color={colors.accentForeground} />
              <Text style={[styles.dialLabel, { color: colors.accentForeground }]}>Call</Text>
            </>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <Pressable
              disabled={!item.leadId}
              onPress={() => item.leadId && router.push({ pathname: "/lead/[id]", params: { id: String(item.leadId) } })}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="phone" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{item.toNumber}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {item.status} {item.durationSec ? `· ${item.durationSec}s` : ""} · {formatDateTime(item.createdAt)}
                </Text>
                {item.summary ? (
                  <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 32 }}>
              No calls yet. Configure Twilio in Settings → Integrations.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dialer: { flexDirection: "row", gap: 10, padding: 14, borderBottomWidth: 1, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_500Medium" },
  dialBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  dialLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
});
