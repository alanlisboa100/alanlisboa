import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
  return kind === "image" ? "Creating image" : "Thinking";
}

function TypingDots() {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  const dot = (start: number) => ({
    opacity: v.interpolate({
      inputRange: [0, start, start + 0.15, start + 0.3, 1],
      outputRange: [0.25, 0.25, 1, 0.25, 0.25],
    }),
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, start, start + 0.15, start + 0.3, 1],
          outputRange: [0, 0, -3, 0, 0],
        }),
      },
    ],
  });

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, dot(0)]} />
      <Animated.View style={[styles.dot, dot(0.2)]} />
      <Animated.View style={[styles.dot, dot(0.4)]} />
    </View>
  );
}

function Avatar() {
  return (
    <LinearGradient
      colors={theme.gradient.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatar}
    >
      <Text style={styles.avatarText}>V</Text>
    </LinearGradient>
  );
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
    message.kind === "text" && message.text.length > 0;

  // ---------------------------------------------------------------- USER ----
  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
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
          {message.text ? (
            <Text style={styles.userText}>{message.text}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  // ----------------------------------------------------------- ASSISTANT ----
  return (
    <View style={styles.assistantRow}>
      <Avatar />
      <View style={styles.assistantContent}>
        {message.pending ? (
          <View style={styles.pendingRow}>
            <TypingDots />
            <Text style={styles.pendingText}>{pendingLabel(message.kind)}</Text>
          </View>
        ) : (
          <>
            {message.text ? (
              message.kind === "error" ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{message.text}</Text>
                </View>
              ) : (
                <Markdown text={message.text} color={theme.colors.text} />
              )
            ) : null}

            {message.imageUrls?.map((url) => (
              <TouchableOpacity
                key={url}
                activeOpacity={0.9}
                onPress={() => setFullscreen(url)}
                style={styles.resultWrap}
              >
                <Image
                  source={{ uri: url }}
                  style={styles.resultImage}
                  resizeMode="cover"
                />
                <Text style={styles.tapHint}>Tap to view · save</Text>
              </TouchableOpacity>
            ))}

            {(showTextActions || message.retry) && (
              <View style={styles.actions}>
                {showTextActions && (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={onCopy}>
                      <Text style={styles.actionText}>
                        {copied ? "✓ Copied" : "Copy"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={onExportPdf}
                      disabled={exporting}
                    >
                      {exporting ? (
                        <ActivityIndicator color={theme.colors.textDim} size="small" />
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
  // user
  userRow: { width: "100%", alignItems: "flex-end", marginVertical: 6 },
  userBubble: {
    maxWidth: "84%",
    backgroundColor: theme.colors.userBubble,
    borderRadius: theme.radius.xl,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  userText: { color: theme.colors.text, fontSize: 15.5, lineHeight: 22 },

  // assistant
  assistantRow: { width: "100%", flexDirection: "row", marginVertical: 8, paddingRight: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  assistantContent: { flex: 1, paddingTop: 2 },

  pendingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  pendingText: { color: theme.colors.textDim, fontSize: 14 },
  dots: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },

  errorBox: {
    backgroundColor: "rgba(255,107,129,0.10)",
    borderColor: theme.colors.danger,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: theme.colors.danger, fontSize: 15, lineHeight: 21 },

  inputImage: {
    width: 190,
    height: 190,
    borderRadius: theme.radius.md,
    marginBottom: 8,
  },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    maxWidth: 220,
  },
  docChipIcon: { fontSize: 14 },
  docChipText: { color: theme.colors.text, fontSize: 12, fontWeight: "700", flexShrink: 1 },

  resultWrap: { marginTop: 8 },
  resultImage: {
    width: 264,
    height: 264,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  tapHint: {
    color: theme.colors.textFaint,
    fontSize: 11,
    marginTop: 5,
  },

  actions: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: { color: theme.colors.textDim, fontWeight: "700", fontSize: 12 },

  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
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
