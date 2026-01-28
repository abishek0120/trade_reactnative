import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
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
  border: "#333333",
  divider: "#2A2A2A",
};

const FONTS = {
  mono: Platform.OS === "ios" ? "Menlo" : "monospace",
};

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD HISTORY ---------------- */
  async function loadHistory() {
    try {
      const res = await apiPost("/history/", {});
      setHistory(res.history || []);
    } catch (e) {
      console.log("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  /* ---------------- EXPORT CSV ---------------- */
  async function exportCSV() {
    try {
      await apiPost("/export/", {});
      alert("CSV Export Initiated");
    } catch (e) {
      alert("Failed to export CSV");
    }
  }

  /* ---------------- SUMMARY CALCULATIONS ---------------- */
  const totalTrades = history.length;
  const totalPnL = history.reduce((sum, h) => sum + (h.profit_loss || 0), 0);

  /* ---------------- RENDER ROW ---------------- */
  function renderItem({ item }: { item: any }) {
    const isBuy = item.action === "BUY";
    const pnl = item.profit_loss || 0;
    const isProfit = pnl >= 0;

    return (
      <View style={styles.row}>
        {/* COL 1: Time & Type */}
        <View style={[styles.col, { flex: 1.2 }]}>
          <Text style={styles.cellTime}>
            {item.time.split(" ")[1] || item.time}
          </Text>
          <Text style={styles.cellDate}>{item.time.split(" ")[0]}</Text>
        </View>

        {/* COL 2: Action Badge */}
        <View style={[styles.col, { flex: 0.8, alignItems: "center" }]}>
          <View
            style={[styles.badge, isBuy ? styles.badgeBuy : styles.badgeSell]}
          >
            <Text
              style={[
                styles.badgeText,
                isBuy ? styles.textBuy : styles.textSell,
              ]}
            >
              {item.action}
            </Text>
          </View>
        </View>

        {/* COL 3: Price & Qty */}
        <View style={[styles.col, { flex: 1.2, alignItems: "flex-end" }]}>
          <Text style={styles.cellMono}>{item.price}</Text>
          <Text style={styles.cellSubMono}>x{item.quantity}</Text>
        </View>

        {/* COL 4: PnL & Event */}
        <View style={[styles.col, { flex: 1.2, alignItems: "flex-end" }]}>
          <Text
            style={[
              styles.cellMono,
              { color: isProfit ? COLORS.success : COLORS.failure },
            ]}
          >
            {pnl > 0 ? "+" : ""}
            {pnl.toFixed(2)}
          </Text>
          <Text style={styles.cellEvent}>{item.event_type}</Text>
        </View>
      </View>
    );
  }

  /* ---------------- UI RENDERING ---------------- */
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Synchronizing Ledger...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.title}>TRADE LEDGER</Text>
        <Pressable onPress={exportCSV} style={styles.exportBtn}>
          <Ionicons name="download-outline" size={20} color={COLORS.textMain} />
        </Pressable>
      </View>

      {/* SUMMARY CARD */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TOTAL EXECUTIONS</Text>
            <Text style={styles.summaryValue}>{totalTrades}</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>NET REALIZED P/L</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: totalPnL >= 0 ? COLORS.success : COLORS.failure },
              ]}
            >
              {totalPnL >= 0 ? "+" : ""}
              {totalPnL.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* LIST HEADER */}
      <View style={styles.listHeader}>
        <Text style={[styles.hText, { flex: 1.2 }]}>TIME</Text>
        <Text style={[styles.hText, { flex: 0.8, textAlign: "center" }]}>
          SIDE
        </Text>
        <Text style={[styles.hText, { flex: 1.2, textAlign: "right" }]}>
          PRICE (QTY)
        </Text>
        <Text style={[styles.hText, { flex: 1.2, textAlign: "right" }]}>
          P/L (USDT)
        </Text>
      </View>

      {/* LIST */}
      <FlatList
        data={history}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No trade records found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontFamily: FONTS.mono,
    fontSize: 12,
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
  backBtn: {
    padding: 4,
  },
  title: {
    color: COLORS.textMain,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  exportBtn: {
    padding: 4,
  },

  // SUMMARY SECTION
  summaryContainer: {
    padding: 16,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  dividerVertical: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: COLORS.textMain,
    fontSize: 20,
    fontFamily: FONTS.mono,
    fontWeight: "700",
  },

  // LIST HEADER
  listHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  hText: {
    color: "#666",
    fontSize: 10,
    fontWeight: "700",
  },

  // LIST ROW
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  col: {
    justifyContent: "center",
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  // CELL TYPOGRAPHY
  cellTime: {
    color: COLORS.textMain,
    fontSize: 12,
    fontFamily: FONTS.mono,
    fontWeight: "600",
  },
  cellDate: {
    color: "#555",
    fontSize: 10,
    marginTop: 2,
  },
  cellMono: {
    color: COLORS.textMain,
    fontSize: 12,
    fontFamily: FONTS.mono,
  },
  cellSubMono: {
    color: "#666",
    fontSize: 10,
    fontFamily: FONTS.mono,
    marginTop: 2,
  },
  cellEvent: {
    color: COLORS.primary,
    fontSize: 9,
    marginTop: 2,
    textTransform: "uppercase",
  },

  // BADGES
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 50,
    alignItems: "center",
  },
  badgeBuy: {
    backgroundColor: "rgba(0, 200, 83, 0.15)",
  },
  badgeSell: {
    backgroundColor: "rgba(213, 0, 0, 0.15)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textBuy: { color: COLORS.success },
  textSell: { color: COLORS.failure },

  // EMPTY STATE
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    opacity: 0.5,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 10,
    fontSize: 14,
  },
});
