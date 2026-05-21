import React from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "open" | "done";
  priority: "low" | "medium" | "high";
  dueAt: string | null;
}

export default function TasksScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data: tasks = [], isLoading, refetch, isRefetching } = useQuery<Task[]>({
    queryKey: ["/tasks"],
    queryFn: () => api<Task[]>("/tasks"),
  });

  const toggle = useMutation({
    mutationFn: (t: Task) =>
      api<Task>(`/tasks/${t.id}`, {
        method: "PATCH",
        body: { status: t.status === "open" ? "done" : "open" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/tasks"] }),
  });

  const priorityColor = (p: Task["priority"]) => (p === "high" ? colors.destructive : p === "medium" ? colors.warning : colors.mutedForeground);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => String(t.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.foreground} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => toggle.mutate(item)} disabled={toggle.isPending} hitSlop={12}>
                <Feather
                  name={item.status === "done" ? "check-square" : "square"}
                  size={24}
                  color={item.status === "done" ? colors.success : colors.mutedForeground}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: item.status === "done" ? colors.mutedForeground : colors.foreground,
                      textDecorationLine: item.status === "done" ? "line-through" : "none",
                    },
                  ]}
                >
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={[styles.meta, { color: priorityColor(item.priority) }]}>
                  {item.priority.toUpperCase()}
                  {item.dueAt ? ` · due ${formatDateTime(item.dueAt)}` : ""}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 32 }}>
              No tasks yet.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 13, marginTop: 4 },
  meta: { fontSize: 11, marginTop: 6, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
});
