import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
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
  notes: string | null;
  nextAction: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
}
interface Activity {
  id: number;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
}
interface WhatsappMessage {
  id: number;
  direction: "inbound" | "outbound";
  body: string | null;
  templateName: string | null;
  status: string;
  createdAt: string;
}

export default function LeadDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [waBody, setWaBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, a, m] = await Promise.all([
        api<Lead>(`/leads/${leadId}`),
        api<Activity[]>(`/leads/${leadId}/activities`).catch(() => []),
        api<WhatsappMessage[]>(`/whatsapp/messages`, { query: { leadId } }).catch(() => []),
      ]);
      setLead(l);
      setActivities(a);
      setMessages(m);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const call = () => {
    if (!lead?.phone) return;
    Linking.openURL(`tel:${lead.phone}`).catch(() => Alert.alert("Could not open dialer"));
  };

  const sendWhatsapp = async () => {
    if (!lead?.phone) {
      Alert.alert("This lead has no phone number");
      return;
    }
    if (!waBody.trim()) {
      Alert.alert("Type a message first");
      return;
    }
    setSending(true);
    try {
      await api(`/whatsapp/send`, {
        method: "POST",
        body: { phone: lead.phone, body: waBody.trim(), leadId },
      });
      setWaBody("");
      load();
    } catch (e) {
      Alert.alert("WhatsApp send failed", (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading || !lead) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const priorityColor = lead.priority === "hot" ? colors.destructive : lead.priority === "warm" ? colors.warning : colors.mutedForeground;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.dot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.h1, { color: colors.foreground, flex: 1 }]}>{lead.name}</Text>
          <Text style={[styles.score, { color: priorityColor }]}>{lead.score}</Text>
        </View>
        {lead.company ? <Text style={[styles.sub, { color: colors.mutedForeground }]}>{lead.company}</Text> : null}
        {lead.product ? <Text style={[styles.sub, { color: colors.mutedForeground }]}>Product: {lead.product}</Text> : null}
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {lead.source.toUpperCase()} · {lead.status} · {formatDate(lead.createdAt)}
        </Text>
        {lead.nextAction ? (
          <Text style={[styles.next, { color: colors.accent }]}>Next: {lead.nextAction}</Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          disabled={!lead.phone}
          onPress={call}
          style={({ pressed }) => [styles.action, { backgroundColor: colors.primary, opacity: lead.phone ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Feather name="phone" size={18} color="#fff" />
          <Text style={styles.actionText}>Call</Text>
        </Pressable>
        <Pressable
          disabled={!lead.email}
          onPress={() => lead.email && Linking.openURL(`mailto:${lead.email}`)}
          style={({ pressed }) => [styles.action, { backgroundColor: colors.secondary, opacity: lead.email ? (pressed ? 0.7 : 1) : 0.4 }]}
        >
          <Feather name="mail" size={18} color={colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>Email</Text>
        </Pressable>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>WhatsApp</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={waBody}
          onChangeText={setWaBody}
          placeholder="Type a WhatsApp message…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        />
        <Pressable
          disabled={sending}
          onPress={sendWhatsapp}
          style={({ pressed }) => [styles.sendBtn, { backgroundColor: "#25d366", opacity: sending || pressed ? 0.7 : 1 }]}
        >
          <Feather name="send" size={16} color="#fff" />
          <Text style={styles.actionText}>{sending ? "Sending…" : "Send"}</Text>
        </Pressable>
        <View style={{ marginTop: 12, gap: 8 }}>
          {messages.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No WhatsApp messages yet.</Text>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  {
                    alignSelf: m.direction === "outbound" ? "flex-end" : "flex-start",
                    backgroundColor: m.direction === "outbound" ? colors.primary : colors.secondary,
                  },
                ]}
              >
                <Text style={{ color: m.direction === "outbound" ? "#fff" : colors.foreground }}>
                  {m.body ?? `Template: ${m.templateName ?? "—"}`}
                </Text>
                <Text style={{ fontSize: 10, color: m.direction === "outbound" ? "rgba(255,255,255,0.7)" : colors.mutedForeground, marginTop: 2 }}>
                  {m.status} · {new Date(m.createdAt).toLocaleString("en-IN")}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Activity</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activities.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No activity yet.</Text>
        ) : (
          activities.map((a) => (
            <View key={a.id} style={[styles.actRow, { borderBottomColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{a.title}</Text>
              {a.body ? <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }}>{a.body}</Text> : null}
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                {a.type.toUpperCase()} · {new Date(a.createdAt).toLocaleString("en-IN")}
              </Text>
            </View>
          ))
        )}
      </View>

      {lead.notes ? (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>Notes</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground }}>{lead.notes}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  h1: { fontSize: 22, fontFamily: "Inter_700Bold" },
  score: { fontSize: 24, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, marginTop: 4 },
  meta: { fontSize: 11, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  next: { fontSize: 13, marginTop: 8, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  action: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
  actionText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  section: { fontSize: 11, marginTop: 24, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 80, fontSize: 14, textAlignVertical: "top" },
  sendBtn: { marginTop: 10, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10 },
  bubble: { padding: 10, borderRadius: 10, maxWidth: "85%" },
  actRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
