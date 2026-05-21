import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";

interface Widgets {
  newLeadsToday?: number;
  hotLeads?: number;
  callsThisWeek?: number;
  emailsSent?: number;
  unpaidInvoices?: number;
  revenue?: number;
  quotesSent?: number;
  overdueAmount?: number;
  openTasks?: number;
  lowStockItems?: number;
  openPurchaseOrders?: number;
  stockValue?: number;
}

export default function HomeScreen() {
  const colors = useColors();
  const { user, org } = useAuth();
  const { data, isLoading, refetch, isRefetching, error } = useQuery<Widgets>({
    queryKey: ["/dashboard/widgets"],
    queryFn: () => api<Widgets>("/dashboard/widgets"),
  });

  const tiles: Array<{ label: string; value: string; tone?: "good" | "bad" | "warn" }> = [
    { label: "New leads today", value: String(data?.newLeadsToday ?? 0) },
    { label: "Hot leads", value: String(data?.hotLeads ?? 0), tone: "warn" },
    { label: "Open tasks", value: String(data?.openTasks ?? 0) },
    { label: "Revenue (30d)", value: formatCurrency(data?.revenue ?? 0), tone: "good" },
    { label: "Overdue", value: formatCurrency(data?.overdueAmount ?? 0), tone: "bad" },
    { label: "Unpaid invoices", value: String(data?.unpaidInvoices ?? 0) },
    { label: "Quotes sent", value: String(data?.quotesSent ?? 0) },
    { label: "Calls this week", value: String(data?.callsThisWeek ?? 0) },
    { label: "Low stock", value: String(data?.lowStockItems ?? 0), tone: "warn" },
    { label: "Open POs", value: String(data?.openPurchaseOrders ?? 0) },
    { label: "Stock value", value: formatCurrency(data?.stockValue ?? 0) },
    { label: "Emails sent", value: String(data?.emailsSent ?? 0) },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.foreground} />}
    >
      <Text style={[styles.greeting, { color: colors.foreground }]}>Hi {user?.name ?? "there"}</Text>
      <Text style={[styles.org, { color: colors.mutedForeground }]}>{org?.name ?? ""}</Text>

      {isLoading && !data ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {tiles.map((t) => {
            const tint = t.tone === "good" ? colors.success : t.tone === "bad" ? colors.destructive : t.tone === "warn" ? colors.warning : colors.foreground;
            return (
              <View key={t.label} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{t.label}</Text>
                <Text style={[styles.tileValue, { color: tint }]}>{t.value}</Text>
              </View>
            );
          })}
        </View>
      )}
      {error ? <Text style={{ color: colors.destructive, marginTop: 12 }}>{(error as Error).message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold" },
  org: { fontSize: 14, marginTop: 2, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", borderWidth: 1, borderRadius: 12, padding: 14 },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter_500Medium" },
  tileValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 6 },
});
