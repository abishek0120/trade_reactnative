import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { apiPost } from "../services/api";
import { saveToken } from "../storage/token";

/* -------------------------------------------------------------------------- */
/* THEME CONFIGURATION                                                        */
/* -------------------------------------------------------------------------- */
const COLORS = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#FDD835", // Binance Yellow
  textMain: "#FFFFFF",
  textMuted: "#666666",
  textPlaceholder: "#555555",
  border: "#333333",
  inputBg: "#1A1A1A",
  errorBg: "rgba(213, 0, 0, 0.15)",
  errorText: "#FF5252",
};

export default function Login() {
  const router = useRouter();

  // Form State
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    setErrorMsg(null);

    if (!phone || !password) {
      setErrorMsg("Credentials required.");
      Vibration.vibrate(50);
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/login/", { phone, password });
      if (res.token) {
        await saveToken(res.token);
        router.replace("/dashboard");
      } else {
        setErrorMsg(res.detail || "Authentication Failed");
        Vibration.vibrate(100);
      }
    } catch (e) {
      setErrorMsg("Network Connection Failed");
      Vibration.vibrate(100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* FIXED: KeyboardAvoidingView needs to wrap a ScrollView for stability */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled" // CRITICAL: Allows tapping without dismissing keyboard
        >
          <Animated.View
            style={[
              styles.contentContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* LOGO & HEADER */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                {/* Ensure path is correct */}
                <Image
                  source={require("../../assets/images/logo2.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>SYSTEM LOGIN</Text>
              <Text style={styles.subtitle}>AUTHENTICATE TO CONTINUE</Text>
            </View>

            {/* ERROR BOX */}
            {errorMsg && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={COLORS.errorText}
                />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* FORM */}
            <View style={styles.formSection}>
              {/* PHONE INPUT */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHONE ID</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={COLORS.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter registered phone"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* PASSWORD INPUT */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSPHRASE</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={COLORS.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter secure password"
                    placeholderTextColor={COLORS.textPlaceholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* LOGIN BUTTON */}
              <Pressable
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.loginBtnText}>INITIALIZE SESSION</Text>
                )}
              </Pressable>

              {/* REGISTER LINK */}
              <Pressable
                style={styles.registerLink}
                onPress={() => router.push("/auth/register")}
              >
                <Text style={styles.registerText}>
                  NEW USER?{" "}
                  <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                    CREATE IDENTITY
                  </Text>
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingHorizontal: 30,
    width: "100%",
    maxWidth: 450,
    alignSelf: "center",
  },

  // HEADER
  headerSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoContainer: {
    marginTop: -160,
    width: 200,
    height: 200,
    padding: 15,
    marginBottom: 20,
    elevation: 10,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    color: COLORS.textMain,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "600",
  },

  // ERROR BOX
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.errorText,
    gap: 8,
  },
  errorText: {
    color: COLORS.errorText,
    fontSize: 12,
    fontWeight: "600",
  },

  // FORM
  formSection: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // INPUT WRAPPER
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 50,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    color: COLORS.textMain,
    fontSize: 14,
    height: "100%",
  },
  eyeIcon: {
    paddingRight: 12,
    paddingLeft: 8,
  },

  // BUTTONS
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loginBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },

  // FOOTER
  registerLink: {
    marginTop: 34,
    alignItems: "center",
  },
  registerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
