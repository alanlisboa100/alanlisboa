import * as Clipboard from "expo-clipboard";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { exportMessageToPdf } from "../pdf";
import { useVantivo } from "../store";
import { theme } from "../theme";
import type { ChatMessage } from "../types";
import { saveImageToGallery } from "../utils/image";
import { Markdown } from "./Markdown";

function pendingLabel(kind: ChatMessage["kind"]): string {
  return kind === "image" ? "Creating image…" : "Thinking…";
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const { retry } = useVantivo();
  const [exporting, setExporting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

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

  const onCopy = async () => {
    await Clipboard.setStringAsync(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onSave = async (url: string) => {
    try {
      setSaving(true);
      await saveImageToGallery(url);
      Alert.alert("Saved", "Image saved to your gallery.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save the image.");
    } finally {
      setSaving(false);
    }
  };

  const showTextActions =
    !isUser && message.kind === "text" && message.text.length > 0;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          message.kind === "error" && styles.errorBubble,
        ]}
      >
        {message.inputImageUri && (
          <Image
            source={{ uri: message.inputImageUri }}
            style={styles.inputImage}
            resizeMode="cover"
          />
        )}

        {message.inputDocName && (
          <View style={styles.docChip}>
            <Text style={styles.docChipIcon}>📄</Text>
            <Text style={styles.docChipText} numberOfLines={1}>
              {message.inputDocName}
            </Text>
          </View>
        )}

        {message.pending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={theme.colors.textDim} size="small" />
            <Text style={styles.pendingText}>{pendingLabel(message.kind)}</Text>
          </View>
        ) : (
          <>
            {message.text ? (
              isUser ? (
                <Text style={[styles.text, styles.userText]}>{message.text}</Text>
              ) : message.kind === "error" ? (
                <Text style={[styles.text, styles.errorText]}>{message.text}</Text>
              ) : (
                <Markdown text={message.text} color={theme.colors.text} />
              )
            ) : null}

            {message.imageUrls?.map((url) => (
              <TouchableOpacity
                key={url}
                activeOpacity={0.9}
                onPress={() => setFullscreen(url)}
              >
                <Image
                  source={{ uri: url }}
                  style={styles.resultImage}
                  resizeMode="cover"
                />
                <Text style={styles.tapHint}>Tap to view · save</Text>
              </TouchableOpacity>
            ))}

            {/* action row */}
            {(showTextActions || message.retry) && (
              <View style={styles.actions}>
                {showTextActions && (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={onCopy}>
                      <Text style={styles.actionText}>
                        {copied ? "Copied!" : "Copy"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={onExportPdf}
                      disabled={exporting}
                    >
                      {exporting ? (
                        <ActivityIndicator color={theme.colors.primary} size="small" />
                      ) : (
                        <Text style={styles.actionText}>PDF</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                {message.retry && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => retry(message.id)}
                  >
                    <Text style={styles.actionText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      {/* fullscreen image viewer */}
      <Modal
        visible={fullscreen !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(null)}
      >
        <View style={styles.viewerBackdrop}>
          {fullscreen && (
            <Image
              source={{ uri: fullscreen }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.viewerActions}>
            <TouchableOpacity
              style={styles.viewerBtn}
              onPress={() => fullscreen && onSave(fullscreen)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.viewerBtnText}>Save to gallery</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewerBtn, styles.viewerClose]}
              onPress={() => setFullscreen(null)}
            >
              <Text style={styles.viewerBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", marginVertical: 5, paddingHorizontal: 4 },
  rowUser: { alignItems: "flex-end" },
  rowAssistant: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
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
  errorText: { color: theme.colors.danger },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingText: { color: theme.colors.textDim, fontSize: 14 },
  inputImage: {
    width: 180,
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: 8,
  },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    maxWidth: 220,
  },
  docChipIcon: { fontSize: 14 },
  docChipText: { color: "#fff", fontSize: 12, fontWeight: "700", flexShrink: 1 },
  resultImage: {
    width: 256,
    height: 256,
    borderRadius: theme.radius.md,
    marginTop: 8,
    backgroundColor: theme.colors.surfaceAlt,
  },
  tapHint: {
    color: theme.colors.textFaint,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionText: { color: theme.colors.text, fontWeight: "700", fontSize: 12 },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  viewerImage: { width: "100%", height: "78%" },
  viewerActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  viewerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  viewerClose: { backgroundColor: theme.colors.surfaceAlt },
  viewerBtnText: { color: "#fff", fontWeight: "700" },
});
