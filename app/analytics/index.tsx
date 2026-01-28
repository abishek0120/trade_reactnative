import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Rect,
  Stop,
} from "react-native-svg";
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
  border: "#333333",
  grid: "#2A2A2A",
  chartBlue: "#2979FF",
  overlay: "rgba(0,0,0,0.85)",
};

const FONTS = {
  mono: Platform.OS === "ios" ? "Menlo" : "monospace",
};

/* -------------------------------------------------------------------------- */
/* CHART COMPONENT HELPERS                                                    */
/* -------------------------------------------------------------------------- */

// Helper to create the filled area path under the line
const createAreaPath = (
  points: string,
  width: number,
  height: number,
  padding: number,
) => {
  // Start at bottom-left, go to first point, follow points, go to bottom-right, close loop
  return `M${padding},${height - padding} ${points} L${width - padding},${height - padding} Z`;
};

function SmallRSIChart({
  data,
  buy,
  sell,
}: {
  data: any[];
  buy: number;
  sell: number;
}) {
  if (!data || data.length < 2)
    return <Text style={styles.errorText}>RSI data unavailable</Text>;

  const values = data.map((d) => d.rsi);
  const width = 320;
  const height = 120;
  const padding = 10;

  const scaleX = (i: number) =>
    padding + (i / (values.length - 1)) * (width - padding * 2);
  const scaleY = (v: number) =>
    height - padding - (v / 100) * (height - padding * 2);

  const points = values.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" "); // For Line
  const areaPath = `M${scaleX(0)},${scaleY(values[0])} ${points} L${scaleX(values.length - 1)},${scaleY(values[values.length - 1])}`; // Just the line path for gradient stroke usage if needed

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.4" />
          <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Safe Zone Background (30-70) */}
      <Rect
        x={padding}
        y={scaleY(sell)}
        width={width - padding * 2}
        height={scaleY(buy) - scaleY(sell)}
        fill="#FFFFFF"
        fillOpacity="0.05"
      />

      {/* Threshold Lines */}
      <Line
        x1={padding}
        x2={width - padding}
        y1={scaleY(buy)}
        y2={scaleY(buy)}
        stroke={COLORS.success}
        strokeDasharray="4,4"
        strokeOpacity={0.5}
      />
      <Line
        x1={padding}
        x2={width - padding}
        y1={scaleY(sell)}
        y2={scaleY(sell)}
        stroke={COLORS.failure}
        strokeDasharray="4,4"
        strokeOpacity={0.5}
      />

      {/* Main Line */}
      <Polyline
        points={points}
        fill="none"
        stroke={COLORS.primary}
        strokeWidth={2}
      />
    </Svg>
  );
}

function SmallPriceChart({ data }: { data: any[] }) {
  if (!data || data.length < 2)
    return <Text style={styles.errorText}>Price data unavailable</Text>;

  const prices = data.map((d) => d.price);
  const width = 320;
  const height = 120;
  const padding = 10;
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || 1;

  const scaleX = (i: number) =>
    padding + (i / (prices.length - 1)) * (width - padding * 2);
  const scaleY = (p: number) =>
    height - padding - ((p - min) / range) * (height - padding * 2);

  const points = prices.map((p, i) => `${scaleX(i)},${scaleY(p)}`).join(" ");
  const fillPath = createAreaPath(points, width, height, padding);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COLORS.chartBlue} stopOpacity="0.5" />
          <Stop offset="1" stopColor={COLORS.chartBlue} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Grid Lines */}
      {[0.25, 0.5, 0.75].map((g, i) => (
        <Line
          key={i}
          x1={padding}
          x2={width - padding}
          y1={padding + g * (height - padding * 2)}
          y2={padding + g * (height - padding * 2)}
          stroke={COLORS.grid}
          strokeWidth={1}
          strokeDasharray="2, 4"
        />
      ))}

      {/* Gradient Fill */}
      <Path d={fillPath} fill="url(#priceGrad)" />

      {/* Line Stroke */}
      <Polyline
        points={points}
        fill="none"
        stroke={COLORS.chartBlue}
        strokeWidth={2}
      />
    </Svg>
  );
}

function SmallPnLChart({ data }: { data: any[] }) {
  if (!data || data.length < 2)
    return <Text style={styles.errorText}>PnL data unavailable</Text>;

  const values = data.map((d) => d.pnl);
  const width = 320;
  const height = 120;
  const padding = 10;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const isProfit = values[values.length - 1] >= 0;

  const scaleX = (i: number) =>
    padding + (i / (values.length - 1)) * (width - padding * 2);
  const scaleY = (v: number) =>
    height - padding - ((v - min) / range) * (height - padding * 2);

  const points = values.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ");
  const lineColor = isProfit ? COLORS.success : COLORS.failure;

  return (
    <Svg width={width} height={height}>
      <Line
        x1={padding}
        x2={width - padding}
        y1={scaleY(0)}
        y2={scaleY(0)}
        stroke={COLORS.textMuted}
        strokeDasharray="4,4"
        strokeWidth={1}
      />
      <Polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<string | null>(null);

  /* ---------------- LOAD ANALYTICS LOGIC (Unchanged) ---------------- */
  const roi = data?.roi?.roi_percent ?? null;
  let roiLabel = "—";
  let roiSentence = "ROI measures how much the balance changed due to trading.";
  if (roi !== null) {
    if (roi > 0) {
      roiLabel = "Positive Return";
      roiSentence = `The bot generated a positive return of ${roi}%, indicating profitable behavior.`;
    } else if (roi < 0) {
      roiLabel = "Negative Return";
      roiSentence = `The bot incurred a loss of ${Math.abs(roi)}%, indicating unfavorable conditions.`;
    } else {
      roiLabel = "Break Even";
      roiSentence = "The bot neither gained nor lost value.";
    }
  }

  const priceData = data?.price_vs_time?.data || [];
  let priceTrend = "—";
  if (priceData.length >= 2) {
    const first = priceData[0].price;
    const last = priceData[priceData.length - 1].price;
    if (last > first) priceTrend = "UP";
    else if (last < first) priceTrend = "DOWN";
    else priceTrend = "SIDEWAYS";
  }

  const rsiData = data?.rsi_vs_time?.data || [];
  const buyT = data?.rsi_vs_time?.thresholds?.buy;
  const sellT = data?.rsi_vs_time?.thresholds?.sell;
  let rsiZone = "—";
  if (rsiData.length > 0) {
    const lastRSI = rsiData[rsiData.length - 1].rsi;
    if (lastRSI < buyT) rsiZone = "OVERSOLD";
    else if (lastRSI > sellT) rsiZone = "OVERBOUGHT";
    else rsiZone = "NEUTRAL";
  }

  const pnlData = data?.profit_vs_loss?.data || [];
  let pnlTrend = "—";
  if (pnlData.length >= 2) {
    const first = pnlData[0].pnl;
    const last = pnlData[pnlData.length - 1].pnl;
    if (last > first) pnlTrend = "IMPROVING";
    else if (last < first) pnlTrend = "DECLINING";
    else pnlTrend = "FLAT";
  }

  async function loadAnalytics() {
    try {
      const res = await apiPost("/analytics/", {});
      setData(res);
    } catch (e) {
      console.log("Analytics load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  /* ---------------- UI RENDERING ---------------- */

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Initializing Analytics Module...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/dashboard")}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.title}>MARKET ANALYTICS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* DISCLAIMER */}
        <View style={styles.disclaimer}>
          <Ionicons
            name="warning-outline"
            size={16}
            color={COLORS.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.disclaimerText}>
            SIMULATION MODE ACTIVE // NO FINANCIAL ADVICE
          </Text>
        </View>

        {/* ================= ROI CARD ================= */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => setOpenCard("ROI")}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>RETURN ON INV.</Text>
            <Ionicons name="stats-chart" size={16} color={COLORS.textMuted} />
          </View>

          <View style={styles.valueRow}>
            <Text
              style={[
                styles.bigValue,
                { color: (roi ?? 0) >= 0 ? COLORS.success : COLORS.failure },
              ]}
            >
              {(roi ?? 0) > 0 ? "+" : ""}
              {roi ?? "—"}%
            </Text>
            <Ionicons
              name={(roi ?? 0) >= 0 ? "caret-up" : "caret-down"}
              size={20}
              color={(roi ?? 0) >= 0 ? COLORS.success : COLORS.failure}
            />
          </View>

          <Text style={styles.subLabel}>{roiLabel}</Text>
          <Text style={styles.cardMeaning} numberOfLines={2}>
            {roiSentence}
          </Text>
        </Pressable>

        {/* ================= PNL CARD ================= */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => setOpenCard("PNL")}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>PROFIT vs LOSS</Text>
            <Text
              style={[
                styles.trendBadge,
                {
                  color:
                    pnlTrend === "IMPROVING" ? COLORS.success : COLORS.failure,
                },
              ]}
            >
              {pnlTrend}
            </Text>
          </View>

          <View style={styles.chartContainer}>
            <SmallPnLChart data={data?.profit_vs_loss?.data} />
          </View>

          <Text style={styles.cardMeaning}>Cumulative profit trajectory.</Text>
        </Pressable>

        {/* ================= PRICE CARD ================= */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => setOpenCard("PRICE")}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>PRICE ACTION</Text>
            <Text style={styles.monoValue}>
              $
              {data?.price_vs_time?.data?.slice(-1)[0]?.price?.toFixed(2) ??
                "—"}
            </Text>
          </View>

          <View style={styles.chartContainer}>
            <SmallPriceChart data={data?.price_vs_time?.data} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TREND DIRECTION</Text>
            <Text style={[styles.metaValue, { color: COLORS.chartBlue }]}>
              {priceTrend}
            </Text>
          </View>
        </Pressable>

        {/* ================= RSI CARD ================= */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => setOpenCard("RSI")}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>RSI MOMENTUM</Text>
            <Text style={[styles.metaValue, { color: COLORS.primary }]}>
              {rsiZone}
            </Text>
          </View>

          <View style={styles.chartContainer}>
            <SmallRSIChart
              data={data?.rsi_vs_time?.data}
              buy={data?.rsi_vs_time?.thresholds?.buy}
              sell={data?.rsi_vs_time?.thresholds?.sell}
            />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>THRESHOLDS</Text>
            <Text style={styles.monoValue}>
              L:{data?.rsi_vs_time?.thresholds?.buy} / H:
              {data?.rsi_vs_time?.thresholds?.sell}
            </Text>
          </View>
        </Pressable>

        {/* ================= PREDICTIONS ROW ================= */}
        <View style={styles.row}>
          <Pressable
            style={[styles.card, styles.halfCard]}
            onPress={() => setOpenCard("NEXT_PRICE")}
          >
            <Text style={styles.cardTitle}>EST. PRICE</Text>
            <Text
              style={[styles.bigValue, { fontSize: 18, marginVertical: 8 }]}
            >
              {data?.next_price?.estimated_price
                ? `$${data.next_price.estimated_price}`
                : "—"}
            </Text>
            <Text style={styles.tinyLabel}>Linear Reg.</Text>
          </Pressable>

          <Pressable
            style={[styles.card, styles.halfCard]}
            onPress={() => setOpenCard("NEXT_RSI")}
          >
            <Text style={styles.cardTitle}>EST. RSI</Text>
            <Text
              style={[styles.bigValue, { fontSize: 18, marginVertical: 8 }]}
            >
              {data?.next_rsi?.estimated_rsi ?? "—"}
            </Text>
            <Text style={styles.tinyLabel}>Momentum</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ================= MODAL OVERLAY ================= */}
      {openCard && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  // DETAILED_VIEW: {openCard}
                </Text>
                <Pressable onPress={() => setOpenCard(null)}>
                  <Ionicons name="close" size={24} color={COLORS.failure} />
                </Pressable>
              </View>

              <Text style={styles.modalText}>
                Extended analytics module for {openCard} is currently
                aggregating real-time data nodes.
              </Text>

              <View style={styles.terminalLine}>
                <Text
                  style={{ color: COLORS.success, fontFamily: FONTS.mono }}
                >{`> Fetching deeper history...`}</Text>
              </View>
              <View style={styles.terminalLine}>
                <Text
                  style={{ color: COLORS.primary, fontFamily: FONTS.mono }}
                >{`> Rendering high-res charts...`}</Text>
              </View>

              <Pressable
                style={styles.closeBtn}
                onPress={() => setOpenCard(null)}
              >
                <Text style={styles.closeBtnText}>CLOSE TERMINAL</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.primary,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 12,
    alignSelf: "center",
    marginTop: 40,
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
  title: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 20,
  },
  backBtn: {
    padding: 4,
  },

  // DISCLAIMER
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(253, 216, 53, 0.1)", // Low opacity yellow
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  disclaimerText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: FONTS.mono,
    flex: 1,
  },

  // CARDS
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  cardPressed: {
    borderColor: COLORS.primary,
    transform: [{ scale: 0.99 }],
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // STATS & TYPOGRAPHY
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bigValue: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textMain,
    fontFamily: FONTS.mono,
    marginRight: 8,
  },
  subLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontWeight: "600",
  },
  cardMeaning: {
    fontSize: 11,
    color: "#666",
    lineHeight: 16,
  },
  monoValue: {
    color: COLORS.textMain,
    fontFamily: FONTS.mono,
    fontSize: 14,
  },
  trendBadge: {
    fontSize: 10,
    fontWeight: "bold",
  },

  // META DATA ROWS
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaLabel: {
    color: "#555",
    fontSize: 10,
    fontWeight: "bold",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "700",
  },

  // CHART CONTAINER
  chartContainer: {
    marginVertical: 4,
    alignItems: "center",
    overflow: "hidden",
  },

  // HALF CARDS
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  tinyLabel: {
    color: "#444",
    fontSize: 10,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#000",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 10,
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.mono,
    fontWeight: "700",
  },
  modalText: {
    color: COLORS.textMain,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },
  terminalLine: {
    marginBottom: 4,
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.failure,
  },
  closeBtnText: {
    color: COLORS.failure,
    fontWeight: "bold",
    fontSize: 12,
  },
});
