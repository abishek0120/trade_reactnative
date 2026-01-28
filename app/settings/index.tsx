import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiPost } from "../services/api";

/* -------------------------------------------------------------------------- */
/* THEME CONFIGURATION                                                        */
/* -------------------------------------------------------------------------- */
const COLORS = {
  bg: "#121212",
  card: "#1E1E1E",
  primary: "#FDD835", // Binance Yellow
  success: "#00C853", // Green
  failure: "#D50000", // Red
  textMain: "#FFFFFF",
  textMuted: "#B0B0B0",
  textInverse: "#000000",
  border: "#333333",
  inputBg: "#121212",
};

const FONTS = {
  mono: Platform.OS === "ios" ? "Menlo" : "monospace",
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export default function SettingsScreen() {
  const navigation = useNavigation();

  /* -------------------- STATE -------------------- */
  const [assetSymbol, setAssetSymbol] = useState("BTCUSDT");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("MEDIUM");

  const [buyRsi, setBuyRsi] = useState("45");
  const [sellRsi, setSellRsi] = useState("55");
  const [rsiError, setRsiError] = useState<string | null>(null);

  const [candleLimit, setCandleLimit] = useState("50");
  const [candleError, setCandleError] = useState<string | null>(null);

  const [loadingSection, setLoadingSection] = useState<
    null | "asset" | "risk" | "rsi" | "candles"
  >(null);

  /* -------------------- HELPERS -------------------- */
  const showSuccess = (message: string) => {
    Alert.alert("System Update", message);
  };

  const showError = (message: string) => {
    Alert.alert("Configuration Error", message);
  };

  /* -------------------- HANDLERS -------------------- */
  const handleChangeAsset = () => {
    Alert.alert(
      "WARNING: ASSET RESET",
      "Changing the trading pair will FORCE STOP the bot and reset all simulated wallet holdings to 0. Proceed?",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "CONFIRM RESET",
          style: "destructive",
          onPress: async () => {
            try {
              setLoadingSection("asset");
              await apiPost("/wallet/change-asset/", {
                asset_symbol: assetSymbol,
              });
              showSuccess("Asset updated. Wallet reset initiated.");
            } catch (err: any) {
              showError(err?.message || "Failed to change asset.");
            } finally {
              setLoadingSection(null);
            }
          },
        },
      ],
    );
  };

  const handleRiskSave = async () => {
    try {
      setLoadingSection("risk");
      await apiPost("/bot/risk/", { risk_level: riskLevel });
      showSuccess(`Strategy updated to ${riskLevel} RISK.`);
    } catch (err: any) {
      showError(err?.message || "Failed to update risk level.");
    } finally {
      setLoadingSection(null);
    }
  };

  const handleRsiSave = async () => {
    const buy = Number(buyRsi);
    const sell = Number(sellRsi);

    if (isNaN(buy) || isNaN(sell)) {
      setRsiError("INPUT_ERROR: Numeric values required.");
      return;
    }
    if (buy >= sell) {
      setRsiError("LOGIC_ERROR: Buy signal must be < Sell signal.");
      return;
    }
    setRsiError(null);

    try {
      setLoadingSection("rsi");
      await apiPost("/bot/thresholds/", { buy_rsi: buy, sell_rsi: sell });
      showSuccess("Oscillator thresholds updated.");
    } catch (err: any) {
      showError(err?.message || "Failed to update thresholds.");
    } finally {
      setLoadingSection(null);
    }
  };

  const handleCandleSave = async () => {
    const value = Number(candleLimit);

    if (isNaN(value) || value < 10) {
      setCandleError("MIN_LIMIT: Requires > 10 candles.");
      return;
    }
    setCandleError(null);

    try {
      setLoadingSection("candles");
      await apiPost("/bot/candles/", { candle_limit: value });
      showSuccess("Analysis window updated.");
    } catch (err: any) {
      showError(err?.message || "Failed to update candle count.");
    } finally {
      setLoadingSection(null);
    }
  };

  /* -------------------- UI COMPONENTS -------------------- */

  const SectionHeader = ({ title, icon }: { title: string; icon: any }) => (
    <View style={styles.sectionHeader}>
      <Ionicons
        name={icon}
        size={16}
        color={COLORS.primary}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>SYSTEM CONFIG</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* DISCLAIMER BANNER */}
          <View style={styles.banner}>
            <Ionicons name="flask-outline" size={18} color={COLORS.primary} />
            <Text style={styles.bannerText}>SIMULATION MODE ACTIVE</Text>
          </View>

          {/* -------- ASSET CONFIGURATION -------- */}
          <View style={styles.card}>
            <SectionHeader title="TRADING PAIR" icon="cube-outline" />
            <Text style={styles.description}>
              Target asset symbol (e.g., BTCUSDT).
            </Text>

            <TextInput
              style={styles.input}
              value={assetSymbol}
              onChangeText={setAssetSymbol}
              autoCapitalize="characters"
              placeholderTextColor="#555"
              placeholder="SYMBOL"
            />

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={14} color={COLORS.failure} />
              <Text style={styles.warningText}>ACTION WILL RESET WALLET</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnOutline,
                pressed && styles.btnPressed,
              ]}
              disabled={loadingSection === "asset"}
              onPress={handleChangeAsset}
            >
              {loadingSection === "asset" ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.btnTextOutline}>APPLY NEW ASSET</Text>
              )}
            </Pressable>
          </View>

          {/* -------- RISK STRATEGY -------- */}
          <View style={styles.card}>
            <SectionHeader title="RISK STRATEGY" icon="speedometer-outline" />

            <View style={styles.segmentContainer}>
              {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((level) => {
                const isActive = riskLevel === level;
                return (
                  <Pressable
                    key={level}
                    style={[
                      styles.segmentBtn,
                      isActive && styles.segmentBtnActive,
                    ]}
                    onPress={() => setRiskLevel(level)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isActive && styles.segmentTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
              disabled={loadingSection === "risk"}
              onPress={handleRiskSave}
            >
              {loadingSection === "risk" ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnTextPrimary}>UPDATE STRATEGY</Text>
              )}
            </Pressable>
          </View>

          {/* -------- RSI THRESHOLDS -------- */}
          <View style={styles.card}>
            <SectionHeader title="RSI OSCILLATOR" icon="pulse-outline" />

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>BUY (LOWER)</Text>
                <TextInput
                  style={styles.input}
                  value={buyRsi}
                  onChangeText={setBuyRsi}
                  keyboardType="numeric"
                  placeholderTextColor="#555"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>SELL (UPPER)</Text>
                <TextInput
                  style={styles.input}
                  value={sellRsi}
                  onChangeText={setSellRsi}
                  keyboardType="numeric"
                  placeholderTextColor="#555"
                />
              </View>
            </View>

            {rsiError && <Text style={styles.errorText}>{rsiError}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
              disabled={loadingSection === "rsi"}
              onPress={handleRsiSave}
            >
              {loadingSection === "rsi" ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnTextPrimary}>SYNC THRESHOLDS</Text>
              )}
            </Pressable>
          </View>

          {/* -------- CANDLE LIMIT -------- */}
          <View style={styles.card}>
            <SectionHeader title="ANALYSIS WINDOW" icon="stats-chart-outline" />
            <Text style={styles.description}>
              Data points used for calculation.
            </Text>

            <TextInput
              style={styles.input}
              value={candleLimit}
              onChangeText={setCandleLimit}
              keyboardType="numeric"
              placeholderTextColor="#555"
            />

            {candleError && <Text style={styles.errorText}>{candleError}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && styles.btnPressed,
              ]}
              disabled={loadingSection === "candles"}
              onPress={handleCandleSave}
            >
              {loadingSection === "candles" ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnTextPrimary}>UPDATE LIMIT</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  headerTitle: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  backBtn: {
    padding: 4,
  },

  // SCROLL
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // BANNER
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(253, 216, 53, 0.1)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(253, 216, 53, 0.3)",
    marginBottom: 20,
    gap: 8,
  },
  bannerText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // CARDS
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 11,
    color: "#666",
    marginBottom: 12,
  },

  // INPUTS
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    color: COLORS.textMain,
    padding: 12,
    fontSize: 14,
    fontFamily: FONTS.mono,
    marginBottom: 12,
  },
  label: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },

  // BUTTONS
  btn: {
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnTextPrimary: {
    color: COLORS.textInverse,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  btnTextOutline: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // SEGMENT CONTROL (RISK)
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.inputBg,
    borderRadius: 4,
    padding: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 2,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: COLORS.textInverse,
    fontWeight: "bold",
  },

  // FEEDBACK
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  warningText: {
    color: COLORS.failure,
    fontSize: 10,
    fontWeight: "700",
  },
  errorText: {
    color: COLORS.failure,
    fontSize: 11,
    marginBottom: 10,
    fontFamily: FONTS.mono,
  },
});
