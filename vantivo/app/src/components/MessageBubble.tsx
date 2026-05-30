import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { exportMessageToPdf } from "../pdf";
import { theme } from "../theme";
import type { ChatMessage } from "../types";

function pendingLabel(kind: ChatMessage["kind"]): string {
  return kind === "image" ? "Creating image…" : "Thinking…";
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [exporting, setExporting] = React.useState(false);

  const onExportPdf = async () => {
    try {
      setExporting(true);
      await exportMessageToPdf(message);
    } catch (e: any) {
      Alert.alert("Export failed", e?.message || "Could not create the PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          message.kind === "error" && styles.errorBubble,
        ]}
      >
        {/* user attachment preview */}
        {message.inputImageUri && (
          <Image
            source={{ uri: message.inputImageUri }}
            style={styles.inputImage}
            resizeMode="cover"
          />
        )}

        {message.pending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={theme.colors.textDim} size="small" />
            <Text style={styles.pendingText}>{pendingLabel(message.kind)}</Text>
          </View>
        ) : (
          <>
            {message.text ? (
              <Text
                style={[
                  styles.text,
                  isUser ? styles.userText : styles.assistantText,
                  message.kind === "error" && styles.errorText,
                ]}
              >
                {message.text}
              </Text>
            ) : null}

            {message.imageUrls?.map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={styles.resultImage}
                resizeMode="cover"
              />
            ))}

            {/* per-message PDF export for assistant text */}
            {!isUser && message.kind === "text" && message.text.length > 0 && (
              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={onExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                ) : (
                  <Text style={styles.pdfBtnText}>Export as PDF</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", marginVertical: 5, paddingHorizontal: 4 },
  rowUser: { alignItems: "flex-end" },
  rowAssistant: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "86%",
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: theme.colors.userBubble,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: theme.colors.assistantBubble,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 6,
  },
  errorBubble: {
    backgroundColor: "rgba(255,107,129,0.12)",
    borderColor: theme.colors.danger,
  },
  text: { fontSize: 15, lineHeight: 21 },
  userText: { color: "#fff" },
  assistantText: { color: theme.colors.text },
  errorText: { color: theme.colors.danger },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingText: { color: theme.colors.textDim, fontSize: 14 },
  inputImage: {
    width: 180,
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: 8,
  },
  resultImage: {
    width: 256,
    height: 256,
    borderRadius: theme.radius.md,
    marginTop: 8,
    backgroundColor: theme.colors.surfaceAlt,
  },
  pdfBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  pdfBtnText: { color: theme.colors.text, fontWeight: "700", fontSize: 12 },
});
