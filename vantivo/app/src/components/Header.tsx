import React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { exportThreadToPdf } from "../pdf";
import { useVantivo } from "../store";
import { theme } from "../theme";

export function Header() {
  const { activeTab, clearTab, brain, setBrain } = useVantivo();
  const [exporting, setExporting] = React.useState(false);

  const onExport = async () => {
    if (!activeTab.messages.some((m) => !m.pending)) {
      Alert.alert("Nothing to export", "Send a message first, then export.");
      return;
    }
    try {
      setExporting(true);
      await exportThreadToPdf(activeTab);
    } catch (e: any) {
      Alert.alert("Export failed", e?.message || "Could not create the PDF.");
    } finally {
      setExporting(false);
    }
  };

  const onClear = () => {
    Alert.alert("Clear chat", "Remove all messages in this tab?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => clearTab(activeTab.id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <LinearGradient
          colors={theme.gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoDot}
        >
          <Text style={styles.logoLetter}>V</Text>
        </LinearGradient>
        <View>
          <Text style={styles.title}>Vantivo</Text>
          <Text style={styles.subtitle}>
            {brain === "forte" ? "Forte · gpt-5.4-mini" : "Eco · gpt-4o-mini"}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.brainToggle}>
          <TouchableOpacity
            onPress={() => setBrain("eco")}
            style={[styles.brainSeg, brain === "eco" && styles.brainSegActive]}
          >
            <Text
              style={[styles.brainText, brain === "eco" && styles.brainTextActive]}
            >
              Eco
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBrain("forte")}
            style={[styles.brainSeg, brain === "forte" && styles.brainSegActive]}
          >
            <Text
              style={[
                styles.brainText,
                brain === "forte" && styles.brainTextActive,
              ]}
            >
              Forte
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onExport}
          disabled={exporting}
          accessibilityLabel="Export conversation to PDF"
        >
          {exporting ? (
            <ActivityIndicator color={theme.colors.text} size="small" />
          ) : (
            <Text style={styles.iconText}>PDF</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onClear}
          accessibilityLabel="Clear conversation"
        >
          <Text style={styles.iconText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: "#fff", fontWeight: "900", fontSize: 17 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: theme.colors.textFaint, fontSize: 11, marginTop: 1 },
  actions: { flexDirection: "row", gap: 6, alignItems: "center" },
  brainToggle: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 2,
  },
  brainSeg: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  brainSegActive: { backgroundColor: theme.colors.primary },
  brainText: { color: theme.colors.textDim, fontWeight: "700", fontSize: 11 },
  brainTextActive: { color: "#fff" },
  iconBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  iconText: { color: theme.colors.text, fontWeight: "700", fontSize: 12 },
});
