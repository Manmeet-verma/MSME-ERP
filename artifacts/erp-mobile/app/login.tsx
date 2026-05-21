import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const colors = useColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Enter email and password");
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert("Login failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, "#0a1530"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={[styles.brand, { color: colors.accent }]}>MSME Pro</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Business OS for Indian MSMEs</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <Pressable
              disabled={busy}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: colors.primary, opacity: pressed || busy ? 0.7 : 1 },
              ]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Sign up or invite teammates from the web app first.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 96, flexGrow: 1 },
  brand: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 32 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, fontFamily: "Inter_400Regular" },
  btn: { marginTop: 24, padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, marginTop: 16, textAlign: "center" },
});
