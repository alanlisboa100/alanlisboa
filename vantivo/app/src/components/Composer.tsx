import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ENV } from "../env";
import { useVantivo } from "../store";
import { theme } from "../theme";
import type { ComposerMode, Quality } from "../types";
import { captureFromCamera, pickFromLibrary, type PickedImage } from "../utils/image";

const MODES: { key: ComposerMode; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "image", label: "Image" },
  { key: "edit", label: "Edit" },
];

export function Composer() {
  const { send } = useVantivo();
  const [mode, setMode] = React.useState<ComposerMode>("chat");
  const [quality, setQuality] = React.useState<Quality>(ENV.defaultQuality);
  const [text, setText] = React.useState("");
  const [attachment, setAttachment] = React.useState<PickedImage | null>(null);
  const [sending, setSending] = React.useState(false);

  const showQuality = mode === "image" || mode === "edit";

  const attach = async (fromCamera: boolean) => {
    try {
      const picked = fromCamera
        ? await captureFromCamera()
        : await pickFromLibrary();
      if (picked) setAttachment(picked);
    } catch (e: any) {
      Alert.alert("Photo", e?.message || "Could not load the photo.");
    }
  };

  const resolveSlashMode = (raw: string): { mode: ComposerMode; text: string } => {
    const t = raw.trim();
    if (/^\/img(age)?\b/i.test(t)) {
      return { mode: "image", text: t.replace(/^\/img(age)?\s*/i, "") };
    }
    if (/^\/edit\b/i.test(t)) {
      return { mode: "edit", text: t.replace(/^\/edit\s*/i, "") };
    }
    return { mode, text: t };
  };

  const onSend = async () => {
    if (sending) return;
    const { mode: effectiveMode, text: cleanText } = resolveSlashMode(text);

    if (effectiveMode === "image" && !cleanText) {
      Alert.alert("Describe the image", "Type what you want to generate.");
      return;
    }
    if (effectiveMode === "edit") {
      if (!attachment) {
        Alert.alert("Attach a photo", "Add a photo to edit, then describe the change.");
        return;
      }
      if (!cleanText) {
        Alert.alert("Describe the edit", "Tell Vantivo how to change the photo.");
        return;
      }
    }
    if (effectiveMode === "chat" && !cleanText && !attachment) {
      return;
    }

    setSending(true);
    const payload = {
      mode: effectiveMode,
      text: cleanText,
      quality,
      imageUri: attachment?.uri,
      imageDataUri: attachment?.dataUri,
    };
    // optimistic UI reset
    setText("");
    setAttachment(null);
    try {
      await send(payload);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {/* mode chips + quality */}
      <View style={styles.controlsRow}>
        <View style={styles.modes}>
          {MODES.map((m) => {
            const active = m.key === mode;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showQuality && (
          <View style={styles.quality}>
            {(["low", "medium"] as Quality[]).map((q) => {
              const active = q === quality;
              return (
                <TouchableOpacity
                  key={q}
                  onPress={() => setQuality(q)}
                  style={[styles.qChip, active && styles.qChipActive]}
                >
                  <Text style={[styles.qText, active && styles.qTextActive]}>
                    1K {q}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* attachment preview */}
      {attachment && (
        <View style={styles.attachRow}>
          <Image source={{ uri: attachment.uri }} style={styles.attachThumb} />
          <Text style={styles.attachLabel}>
            {mode === "edit" ? "Photo to edit" : "Photo attached"}
          </Text>
          <TouchableOpacity
            onPress={() => setAttachment(null)}
            style={styles.attachRemove}
          >
            <Text style={styles.attachRemoveText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* input bar */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => attach(false)}>
          <Text style={styles.iconBtnText}>＋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => attach(true)}>
          <Text style={styles.iconBtnText}>📷</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={
            mode === "image"
              ? "Describe an image to create…"
              : mode === "edit"
                ? "Describe how to edit the photo…"
                : "Message Vantivo…"
          }
          placeholderTextColor={theme.colors.textFaint}
          multiline
          editable={!sending}
        />

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing(3),
    paddingTop: 8,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.bgElevated,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modes: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { color: theme.colors.textDim, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  quality: { flexDirection: "row", gap: 6 },
  qChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qChipActive: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.accent,
  },
  qText: { color: theme.colors.textFaint, fontWeight: "700", fontSize: 11 },
  qTextActive: { color: theme.colors.accent },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attachThumb: { width: 40, height: 40, borderRadius: 8 },
  attachLabel: { color: theme.colors.textDim, flex: 1, fontSize: 13 },
  attachRemove: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
  },
  attachRemoveText: { color: theme.colors.danger, fontSize: 12, fontWeight: "700" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: theme.colors.text, fontSize: 18 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    color: theme.colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
