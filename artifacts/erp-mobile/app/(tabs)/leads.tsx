import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  priority: "hot" | "warm" | "cold";
  score: number;
  product: string | null;
  createdAt: string;
}

export default function LeadsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data: leads = [], isLoading, refetch, isRefetching } = useQuery<Lead[]>({
    queryKey: ["/leads"],
    queryFn: () => api<Lead[]>("/leads"),
  });

  const filtered = leads.filter((l) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      l.name.toLowerCase().includes(s) ||
      (l.company?.toLowerCase().includes(s) ?? false) ||
      (l.phone?.includes(s) ?? false) ||
      (l.product?.toLowerCase().includes(s) ?? false)
    );
  });

  const priorityColor = (p: Lead["priority"]) => (p === "hot" ? colors.destructive : p === "warm" ? colors.warning : colors.mutedForeground);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search leads…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => String(l.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.foreground} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/lead/[id]", params: { id: String(item.id) } })}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: priorityColor(item.priority) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {[item.company, item.product].filter(Boolean).join(" · ") || item.phone || "—"}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.source} · {item.status} · score {item.score} · {formatDate(item.createdAt)}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 32 }}>
              No leads yet. Sync from Settings → Integrations.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 13, marginTop: 2 },
  meta: { fontSize: 11, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.4 },
});
