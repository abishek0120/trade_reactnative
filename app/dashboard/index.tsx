import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { apiPost } from "../services/api";

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                 */
/* -------------------------------------------------------------------------- */

function CandleGraph({ prices }: { prices: number[] }) {
  if (!prices || prices.length < 4) {
    return (
      <View style={graphStyles.loadingContainer}>
        <Text style={graphStyles.loadingText}>
          // WAITING FOR SIGNAL... CHECK YOUR INTERNET
        </Text>
      </View>
    );
  }

  const width = 340;
  const height = 200;
  const padding = 20;

  const CANDLE_SIZE = 4;
  const candles = [];

  for (let i = 0; i < prices.length; i += CANDLE_SIZE) {
    const slice = prices.slice(i, i + CANDLE_SIZE);
    if (slice.length < 2) continue;

    candles.push({
      open: slice[0],
      close: slice[slice.length - 1],
      high: Math.max(...slice),
      low: Math.min(...slice),
    });
  }

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const max = Math.max(...allPrices);
  const min = Math.min(...allPrices);
  const range = max - min || 1;

  const scaleY = (price: number) =>
    height - padding - ((price - min) / range) * (height - padding * 2);

  const candleWidth = (width - padding * 2) / candles.length;

  return (
    <View style={graphStyles.container}>
      <Svg width={width} height={height}>
        {/* Technical Grid (Dashed) */}
        {[0.25, 0.5, 0.75].map((g, i) => (
          <Line
            key={i}
            x1={padding}
            x2={width - padding}
            y1={padding + g * (height - padding * 2)}
            y2={padding + g * (height - padding * 2)}
            stroke="#989696"
            strokeWidth={1}
            strokeDasharray="4, 4"
          />
        ))}

        {/* Candles */}
        {candles.map((c, i) => {
          const x = padding + i * candleWidth + candleWidth / 2;
          const isBull = c.close >= c.open;
          const color = isBull ? "#00C853" : "#D50000";

          return (
            <React.Fragment key={i}>
              <Line
                x1={x}
                x2={x}
                y1={scaleY(c.high)}
                y2={scaleY(c.low)}
                stroke={color}
                strokeWidth={1}
              />
              <Line
                x1={x}
                x2={x}
                y1={scaleY(c.open)}
                y2={scaleY(c.close)}
                stroke={color}
                strokeWidth={5}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {/* Overlay Label */}
      <Text style={graphStyles.watermark}>1H INTERVAL</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */

export default function Dashboard() {
  const router = useRouter();

  // --- STATE ---
  const [asset, setAsset] = useState("—");
  const [price, setPrice] = useState("—");
  const [botRunning, setBotRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"BUY" | "SELL" | null>(null);
  const [quantity, setQuantity] = useState("");
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [risk, setRisk] = useState("MEDIUM");
  const [buyRSI, setBuyRSI] = useState(45);
  const [sellRSI, setSellRSI] = useState(55);
  const [candles, setCandles] = useState(90);
  const [prices, setPrices] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState("Abishek");

  // --- LOGIC ---
  async function loadState() {
    try {
      const state = await apiPost("/state/", {});
      setBotRunning(state.bot_running);
      setAsset(state.asset || "BTC / USDT");

      const market = await apiPost("/market-data/", {});
      setRisk(state.risk_level || "MEDIUM");
      setBuyRSI(state.buy_rsi || 45);
      setSellRSI(state.sell_rsi || 55);
      setCandles(state.candle_limit || 30);
      setUsername(state.username || "BV");
      setPrice(market?.prices?.slice(-1)[0]?.toFixed(2) ?? "—");
      setPrices(market?.prices || []);
    } catch (e) {
      console.log("State load failed", e);
    }
  }

  async function toggleBot() {
    if (loading) return;
    setLoading(true);
    try {
      if (botRunning) {
        await apiPost("/stop-bot/", {});
      } else {
        await apiPost("/start-bot/", {});
      }
      await loadState();
    } finally {
      setLoading(false);
    }
  }

  async function confirmTrade() {
    if (!quantity || Number(quantity) <= 0) {
      alert("Enter a valid quantity");
      return;
    }
    const payload = { quantity: Number(quantity) };
    if (tradeType === "BUY") {
      await apiPost("/buy/", payload);
    } else if (tradeType === "SELL") {
      await apiPost("/sell/", payload);
    }
    setTradeModalOpen(false);
    setTradeType(null);
    setQuantity("");
    await loadState();
  }

  function openBuy() {
    setTradeType("BUY");
    setQuantity("");
    setTradeModalOpen(true);
  }

  function openSell() {
    setTradeType("SELL");
    setQuantity("");
    setTradeModalOpen(true);
  }

  async function loadLogs() {
    try {
      const res = await apiPost("/history/", {});
      setLogs(res.history || []);
      setLogsOpen(true);
    } catch (e) {
      alert("Failed to load logs");
    }
  }

  async function logout() {
    await apiPost("/logout/", {});
    router.replace("/auth/login");
  }

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* UI                                     */
  /* ------------------------------------------------------------------------ */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TERMINAL v1.0</Text>

        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </Pressable>
      </View>

      {/* ASSET DISPLAY */}
      <View style={styles.heroSection}>
        <Text style={styles.assetName}>{asset}</Text>
        <Text style={styles.assetPrice}>{price}</Text>
      </View>

      {/* GRAPH */}
      <View style={styles.chartWrapper}>
        <CandleGraph prices={prices} />
      </View>

      {/* STATS GRID */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>RISK LEVEL</Text>
          {risk === "LOW" && (
            <Text style={[styles.statValue, { color: "#b7fd35" }]}>{risk}</Text>
          )}
          {risk === "MEDIUM" && (
            <Text style={[styles.statValue, { color: "#ff9800" }]}>{risk}</Text>
          )}
          {risk === "HIGH" && (
            <Text style={[styles.statValue, { color: "#f44336" }]}>{risk}</Text>
          )}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>BUY RSI</Text>
          <Text style={styles.statValue}>{buyRSI}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SELL RSI</Text>
          <Text style={styles.statValue}>{sellRSI}</Text>
        </View>
        {/* <View style={styles.statCard}>
          <Text style={styles.statLabel}>CANDLES</Text>
          <Text style={styles.statValue}>{candles}</Text>
        </View> */}
      </View>

      {/* MANUAL OVERRIDE SECTION */}
      <View style={styles.divider}>
        <Text style={styles.dividerText}>MANUAL OVERRIDE</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.btnBase,
            styles.btnBuy,
            pressed && styles.btnPressed,
          ]}
          onPress={openBuy}
        >
          <Text style={styles.btnText}>LONG / BUY</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.btnBase,
            styles.btnSell,
            pressed && styles.btnPressed,
          ]}
          onPress={openSell}
        >
          <Text style={styles.btnText}>SHORT / SELL</Text>
        </Pressable>
      </View>

      {/* FOOTER CONTROLS */}
      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              botRunning
                ? { backgroundColor: "#00C853" }
                : { backgroundColor: "#555" },
            ]}
          />
          <Text style={styles.statusText}>
            SYSTEM STATUS: {botRunning ? "ACTIVE" : "STANDBY"}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            botRunning ? styles.stopBtn : styles.startBtnColor,
            pressed && styles.btnPressed,
          ]}
          onPress={toggleBot}
        >
          <Text style={[styles.startText, botRunning && { color: "white" }]}>
            {botRunning ? "TERMINATE BOT" : "INITIALIZE BOT"}
          </Text>
        </Pressable>
      </View>

      {/* FLOATING ACTION BUTTON (LOGS) */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={loadLogs}
      >
        <Text style={styles.fabIcon}>⚡</Text>
      </Pressable>

      {/* ================= TRADE MODAL ================= */}
      {tradeModalOpen && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalHeader}>
              {tradeType === "BUY"
                ? "OPEN LONG POSITION"
                : "OPEN SHORT POSITION"}
            </Text>

            <Text style={styles.inputLabel}>ORDER QUANTITY</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="numeric"
              style={styles.inputField}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.btnCancel,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setTradeModalOpen(false)}
              >
                <Text style={styles.modalBtnText}>CANCEL</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.btnConfirm,
                  pressed && styles.btnPressed,
                ]}
                onPress={confirmTrade}
              >
                <Text style={[styles.modalBtnText, { color: "black" }]}>
                  EXECUTE
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ================= LOGS MODAL ================= */}
      {logsOpen && (
        <View style={styles.modalBackdrop}>
          <View style={styles.logsContainer}>
            <View style={styles.logsHeader}>
              <Text style={styles.logsTitle}>SYSTEM_LOGS.txt</Text>
              <Pressable onPress={() => setLogsOpen(false)}>
                <Text style={styles.logsClose}>[X]</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.logsScroll}>
              {logs.length === 0 && (
                <Text style={styles.logLine}>// No recent activity...</Text>
              )}
              {logs.map((l, i) => (
                <Text key={i} style={styles.logLine}>
                  <Text style={{ color: "#555" }}>{`[${l.time}]`}</Text>{" "}
                  {l.action}{" "}
                  <Text style={{ color: "#FDD835" }}>@{l.price}</Text>
                </Text>
              ))}
              <Text style={styles.logCursor}>_</Text>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ================= MENU MODAL ================= */}
      {menuOpen && (
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.username}>
                HELLO {username.toUpperCase()}!
              </Text>
            </View>

            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setMenuOpen(false);
                router.push("/analytics");
              }}
            >
              <Text style={styles.menuRowText}>ANALYTICS</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>

            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setMenuOpen(false);
                router.push("/history");
              }}
            >
              <Text style={styles.menuRowText}>TRADE HISTORY</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>

            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setMenuOpen(false);
                router.push("/settings");
              }}
            >
              <Text style={styles.menuRowText}>CONFIGURATIONS</Text>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>

            <Pressable
              style={[styles.menuRow, { borderBottomWidth: 0, marginTop: 20 }]}
              onPress={async () => {
                setMenuOpen(false);
                await logout();
              }}
            >
              <Text
                style={[
                  styles.menuRowText,
                  { color: "#D50000", fontWeight: "700", marginTop: 30 },
                ]}
              >
                DISCONNECT/LOGOUT
              </Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES                                   */
/* -------------------------------------------------------------------------- */

// Helper for monospace font across platforms
const monoFont = Platform.OS === "ios" ? "Menlo" : "monospace";

const graphStyles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  loadingText: {
    color: "#555",
    fontFamily: monoFont,
    fontSize: 12,
  },
  watermark: {
    position: "absolute",
    top: 10,
    left: 10,
    color: "rgba(255,255,255,0.1)",
    fontSize: 10,
    fontWeight: "bold",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 50, // Safe area space
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },

  headerTitle: {
    color: "#49e086",
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  menuIcon: {
    color: "#fff",
    fontSize: 24,
    padding: 4,
  },

  // Hero Section (Asset & Price)
  heroSection: {
    marginBottom: 20,
  },
  assetName: {
    color: "#d5d5d5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  assetPrice: {
    color: "#fff",
    fontSize: 36,
    fontFamily: monoFont,
    fontWeight: "700",
    letterSpacing: -1,
  },

  // Chart
  chartWrapper: {
    marginBottom: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "nowrap", // prevent wrapping
    gap: 10,
    marginBottom: 24,
    justifyContent: "space-between", // spread them evenly
  },
  statCard: {
    flex: 1,
    minWidth: "30%", // allow 3 cards in one row
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#333",
  },

  statLabel: {
    color: "#666",
    fontSize: 10,
    marginBottom: 4,
    fontWeight: "700",
  },
  statValue: {
    color: "#fff",
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: "600",
  },

  // Dividers
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dividerText: {
    color: "#444",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  // Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  btnBase: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  btnBuy: { backgroundColor: "#00C853" },
  btnSell: { backgroundColor: "#D50000" },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Footer & Status
  footer: {
    marginTop: "auto", // Pushes to bottom
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  statusDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginRight: 8,
  },
  statusText: {
    color: "#2afbb5",
    fontSize: 12,
    fontFamily: monoFont,
  },
  startBtn: {
    marginBottom: 110,
    padding: 18,
    marginLeft: 12,
    borderRadius: 10,
    width: "95%",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 4,
    shadowRadius: 4.65,
    elevation: 8,
  },
  startBtnColor: {
    backgroundColor: "#FDD835",
    shadowColor: "#FDD835", // Glow effect
  },
  stopBtn: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#D50000",
    shadowColor: "#D50000",
  },
  startText: {
    fontWeight: "800",
    color: "#000",
    fontSize: 16,
    letterSpacing: 1,
  },

  // Floating Action Button
  fab: {
    position: "absolute",
    bottom: 680,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDD835",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 10,
  },
  fabPressed: { transform: [{ scale: 0.9 }] },
  fabIcon: { fontSize: 20, color: "#FDD835" },

  // Modals (General)
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)", // Darker backdrop
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },

  // Trade Modal
  modalContainer: {
    width: "85%",
    backgroundColor: "#1E1E1E",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 1,
  },
  inputLabel: {
    color: "#888",
    fontSize: 10,
    marginBottom: 8,
    fontWeight: "bold",
  },
  inputField: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 14,
    color: "#fff",
    fontFamily: monoFont,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnCancel: { backgroundColor: "#333" },
  btnConfirm: { backgroundColor: "#FDD835" },
  modalBtnText: { fontWeight: "700", color: "#fff", fontSize: 13 },

  // Logs Modal (Terminal Style)
  logsContainer: {
    width: "90%",
    height: "60%",
    backgroundColor: "#000",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDD835", // Yellow border like old monitor
    overflow: "hidden",
  },
  logsHeader: {
    backgroundColor: "#111",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logsTitle: { color: "#FDD835", fontSize: 12, fontFamily: monoFont },
  logsClose: { color: "#D50000", fontSize: 12, fontWeight: "bold" },
  logsScroll: { padding: 12 },
  logLine: {
    color: "#00C853", // Hacker Green
    fontSize: 11,
    fontFamily: monoFont,
    marginBottom: 4,
    lineHeight: 16,
  },
  logCursor: { color: "#00C853", fontSize: 12, marginBottom: 20 },

  // Menu Modal
  menuContainer: {
    width: "70%",
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#1A1A1A",
    paddingTop: 60,
    paddingHorizontal: 20,
    borderLeftWidth: 1,
    borderLeftColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  menuHeader: { marginBottom: 30 },
  menuTitle: {
    color: "#555",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "bold",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#252525",
  },
  menuRowText: { color: "#eee", fontSize: 14, fontWeight: "500" },
  menuArrow: { color: "#444" },

  username: {
    color: "#e0e0e0", // softer than pure white
    fontSize: 20, // slightly larger for emphasis
    fontWeight: "bold", // bold but cleaner than "700"
    marginBottom: 12, // more breathing room
    textShadowColor: "#000", // subtle shadow for contrast
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    padding: 8,
  },
});
