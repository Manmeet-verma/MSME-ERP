import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { registerForPush } from "@/lib/notifications";

interface Integration {
  id: number;
  provider: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
}
interface PushToken {
  id: number;
  platform: string;
  deviceName: string | null;
  lastUsedAt: string;
}

const SYNC_PROVIDERS: Array<{ key: string; label: string; path: string }> = [
  { key: "indiamart", label: "IndiaMart", path: "/integrations/indiamart/sync" },
  { key: "tradeindia", label: "TradeIndia", path: "/integrations/tradeindia/sync" },
  { key: "justdial", label: "JustDial", path: "/integrations/justdial/sync" },
  { key: "fb_lead_ads", label: "Facebook Lead Ads", path: "/integrations/fb-lead-ads/sync" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { user, org, signOut } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [tokens, setTokens] = useState<PushToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ints, toks] = await Promise.all([
        api<Integration[]>("/integrations").catch(() => []),
        api<PushToken[]>("/push/tokens").catch(() => []),
      ]);
      setIntegrations(ints);
      setTokens(toks);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sync = async (path: string, label: string) => {
    setBusy(path);
    try {
      const r = await api<{ imported: number; message: string }>(path, { method: "POST" });
      Alert.alert(label, r.message);
      load();
    } catch (e) {
      Alert.alert(label, (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const enableNotifications = async () => {
    setBusy("push");
    try {
      const t = await registerForPush();
      Alert.alert("Push", t ? "Notifications enabled on this device." : "Could not enable notifications.");
      load();
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("push-test");
    try {
      const r = await api<{ sent: number; failed: number }>("/push/test", { method: "POST", body: {} });
      Alert.alert("Push test", `Sent: ${r.sent} · Failed: ${r.failed}`);
    } catch (e) {
      Alert.alert("Push test failed", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const findIntegration = (k: string) => integrations.find((i) => i.provider === k);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text style={[styles.h2, { color: colors.foreground }]}>{user?.name}</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>{user?.email}</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>{org?.name} · {org?.role}</Text>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Notifications</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.foreground, marginBottom: 8 }}>
          {tokens.length > 0
            ? `${tokens.length} device${tokens.length > 1 ? "s" : ""} registered for push.`
            : "Push notifications not enabled yet."}
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            disabled={busy === "push"}
            onPress={enableNotifications}
            style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.btnText}>{busy === "push" ? "…" : "Enable on this device"}</Text>
          </Pressable>
          {tokens.length > 0 ? (
            <Pressable
              disabled={busy === "push-test"}
              onPress={sendTest}
              style={({ pressed }) => [styles.btn, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>Send test</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Lead-source sync</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {SYNC_PROVIDERS.map((p) => {
          const integ = findIntegration(p.key);
          return (
            <View key={p.key} style={[styles.intRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{p.label}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {integ?.lastSyncedAt
                    ? `Last sync: ${new Date(integ.lastSyncedAt).toLocaleString("en-IN")} · ${integ.lastSyncStatus ?? "—"}`
                    : "Not yet synced"}
                </Text>
                {integ?.lastSyncMessage ? (
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                    {integ.lastSyncMessage}
                  </Text>
                ) : null}
              </View>
              <Pressable
                disabled={busy === p.path || !integ?.enabled}
                onPress={() => sync(p.path, p.label)}
                style={({ pressed }) => [
                  styles.syncBtn,
                  { borderColor: colors.border, opacity: pressed || !integ?.enabled ? 0.5 : 1 },
                ]}
              >
                {busy === p.path ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <Feather name="refresh-cw" size={16} color={colors.foreground} />
                )}
              </Pressable>
            </View>
          );
        })}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 10 }}>
          Configure API keys in the web app (Settings → Integrations) before syncing.
        </Text>
      </View>

      <Pressable
        onPress={() => signOut()}
        style={({ pressed }) => [styles.btn, { backgroundColor: colors.destructive, opacity: pressed ? 0.7 : 1, marginTop: 24 }]}
      >
        <Text style={styles.btnText}>Sign out</Text>
      </Pressable>

      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, marginTop: 2 },
  section: { fontSize: 11, marginTop: 24, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  intRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  syncBtn: { borderWidth: 1, borderRadius: 8, padding: 10 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", flexShrink: 1 },
  btnText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
});
