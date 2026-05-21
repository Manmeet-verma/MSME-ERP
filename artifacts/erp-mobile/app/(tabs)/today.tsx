import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueries } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface Task {
  id: number;
  title: string;
  status: "open" | "done";
  priority: "low" | "medium" | "high";
  dueAt: string | null;
}
interface Lead {
  id: number;
  name: string;
  company: string | null;
  priority: "hot" | "warm" | "cold";
  score: number;
  nextAction: string | null;
  status: string;
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const results = useQueries({
    queries: [
      { queryKey: ["/tasks"], queryFn: () => api<Task[]>("/tasks") },
      { queryKey: ["/leads"], queryFn: () => api<Lead[]>("/leads") },
    ],
  });
  const tasksQ = results[0];
  const leadsQ = results[1];

  const isLoading = tasksQ.isLoading || leadsQ.isLoading;
  const refetch = () => {
    tasksQ.refetch();
    leadsQ.refetch();
  };
  const refreshing = tasksQ.isRefetching || leadsQ.isRefetching;

  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const todayTasks = (tasksQ.data ?? []).filter((t) => {
    if (t.status !== "open") return false;
    if (!t.dueAt) return true;
    const d = new Date(t.dueAt);
    return d <= todayEnd;
  });
  const hotLeads = (leadsQ.data ?? [])
    .filter((l) => l.priority === "hot" && l.status !== "won" && l.status !== "lost")
    .slice(0, 10);
  const followups = (leadsQ.data ?? [])
    .filter((l) => l.nextAction && l.status !== "won" && l.status !== "lost")
    .slice(0, 15);

  const Quick = ({ icon, label, path }: { icon: keyof typeof Feather.glyphMap; label: string; path: "/calls" | "/expense" | "/barcode" }) => (
    <Pressable
      onPress={() => router.push(path as never)}
      style={({ pressed }) => [
        styles.quick,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={22} color={colors.accent} />
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  const priorityColor = (p: Lead["priority"]) => (p === "hot" ? colors.destructive : p === "warm" ? colors.warning : colors.mutedForeground);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.foreground} />}
    >
      <Text style={[styles.h1, { color: colors.foreground }]}>Today</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        {todayStart.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </Text>

      <View style={styles.quickGrid}>
        <Quick icon="phone" label="Call" path="/calls" />
        <Quick icon="camera" label="Expense" path="/expense" />
        <Quick icon="maximize" label="Barcode" path="/barcode" />
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Hot leads ({hotLeads.length})</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isLoading && hotLeads.length === 0 ? (
          <ActivityIndicator color={colors.accent} />
        ) : hotLeads.length === 0 ? (
          <Text style={{ color: colors.mutedForeground }}>No hot leads right now.</Text>
        ) : (
          hotLeads.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push({ pathname: "/lead/[id]", params: { id: String(l.id) } })}
              style={({ pressed }) => [styles.itemRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.dot, { backgroundColor: priorityColor(l.priority) }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{l.name}</Text>
                {l.company ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{l.company}</Text> : null}
                {l.nextAction ? <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>{l.nextAction}</Text> : null}
              </View>
              <Text style={{ color: priorityColor(l.priority), fontFamily: "Inter_700Bold" }}>{l.score}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Due today ({todayTasks.length})</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {todayTasks.length === 0 ? (
          <Text style={{ color: colors.mutedForeground }}>Nothing due today. 🎉</Text>
        ) : (
          todayTasks.map((t) => (
            <View key={t.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <Feather name="clock" size={16} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground }}>{t.title}</Text>
                {t.dueAt ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{formatDateTime(t.dueAt)}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Follow-ups ({followups.length})</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {followups.length === 0 ? (
          <Text style={{ color: colors.mutedForeground }}>No follow-ups suggested.</Text>
        ) : (
          followups.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push({ pathname: "/lead/[id]", params: { id: String(l.id) } })}
              style={({ pressed }) => [styles.itemRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground }} numberOfLines={1}>{l.name}</Text>
                <Text style={{ color: colors.accent, fontSize: 12 }}>{l.nextAction}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  quickGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  quick: { flex: 1, alignItems: "center", gap: 6, padding: 14, borderRadius: 12, borderWidth: 1 },
  quickLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { fontSize: 11, marginTop: 24, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  card: { borderWidth: 1, borderRadius: 12, padding: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
