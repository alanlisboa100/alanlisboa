import React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { exportThreadToPdf } from "../pdf";
import { useVantivo } from "../store";
import { theme } from "../theme";

export function Header() {
  const { activeTab, clearTab } = useVantivo();
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
        <View style={styles.logoDot} />
        <View>
          <Text style={styles.title}>Vantivo</Text>
          <Text style={styles.subtitle}>chat · vision · images · pdf</Text>
        </View>
      </View>
      <View style={styles.actions}>
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
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: theme.colors.textFaint, fontSize: 11, marginTop: 1 },
  actions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  iconText: { color: theme.colors.text, fontWeight: "700", fontSize: 12 },
});
