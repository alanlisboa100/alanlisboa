import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api";
import { ENV } from "../env";
import { useVantivo } from "../store";
import { theme } from "../theme";
import type { ComposerMode, Quality } from "../types";
import {
  pickPdf,
  pickPdfs,
  saveAndShareBase64Pdf,
  type PickedPdf,
} from "../utils/document";
import {
  captureFromCamera,
  pickFromLibrary,
  type PickedImage,
} from "../utils/image";

const MODES: { key: ComposerMode; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "image", label: "Image" },
  { key: "edit", label: "Edit" },
];

interface DocState {
  name: string;
  text: string;
  truncated: boolean;
}

const DOC_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Resumir", prompt: "Resuma este documento em tópicos claros e objetivos." },
  { label: "Traduzir", prompt: "Traduza este documento para português, mantendo a formatação." },
  { label: "Reescrever", prompt: "Reescreva este documento de forma mais clara e profissional." },
];

export function Composer() {
  const { send } = useVantivo();
  const [mode, setMode] = React.useState<ComposerMode>("chat");
  const [quality, setQuality] = React.useState<Quality>(ENV.defaultQuality);
  const [text, setText] = React.useState("");
  const [attachment, setAttachment] = React.useState<PickedImage | null>(null);
  const [doc, setDoc] = React.useState<DocState | null>(null);
  const [docLoading, setDocLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [merging, setMerging] = React.useState(false);

  const showQuality = (mode === "image" || mode === "edit") && !doc;

  const attachImage = async (fromCamera: boolean) => {
    setMenuOpen(false);
    try {
      const picked = fromCamera
        ? await captureFromCamera()
        : await pickFromLibrary();
      if (picked) {
        setDoc(null);
        setAttachment(picked);
      }
    } catch (e: any) {
      Alert.alert("Photo", e?.message || "Could not load the photo.");
    }
  };

  const attachPdf = async () => {
    setMenuOpen(false);
    try {
      const picked = await pickPdf();
      if (!picked) return;
      setAttachment(null);
      setMode("chat");
      setDocLoading(true);
      const read = await api.readPdf(picked.base64);
      if (!read.text || read.text.trim().length === 0) {
        Alert.alert(
          "PDF sem texto",
          "Não consegui extrair texto. O PDF pode ser escaneado (somente imagem).",
        );
        setDocLoading(false);
        return;
      }
      setDoc({ name: picked.name, text: read.text, truncated: read.truncated });
    } catch (e: any) {
      Alert.alert("PDF", e?.message || "Could not read the PDF.");
    } finally {
      setDocLoading(false);
    }
  };

  const mergePdfs = async () => {
    setMenuOpen(false);
    try {
      const files: PickedPdf[] = await pickPdfs();
      if (files.length === 0) return;
      if (files.length < 2) {
        Alert.alert("Juntar PDFs", "Selecione pelo menos 2 arquivos PDF.");
        return;
      }
      setMerging(true);
      const merged = await api.mergePdfs(files.map((f) => f.base64));
      await saveAndShareBase64Pdf(merged, "vantivo-merged.pdf");
    } catch (e: any) {
      Alert.alert("Juntar PDFs", e?.message || "Could not merge the PDFs.");
    } finally {
      setMerging(false);
    }
  };

  const resolveSlashMode = (
    raw: string,
  ): { mode: ComposerMode; text: string } => {
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
    if (sending || docLoading) return;

    // A PDF attachment always means "chat about the document".
    if (doc) {
      const cleanText = text.trim();
      setSending(true);
      const payload = {
        mode: "chat" as ComposerMode,
        text: cleanText,
        quality,
        docText: doc.text,
        docName: doc.name,
      };
      setText("");
      setDoc(null);
      try {
        await send(payload);
      } finally {
        setSending(false);
      }
      return;
    }

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

      {/* quick actions when a PDF is attached */}
      {doc && (
        <View style={styles.docActions}>
          {DOC_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.docActionChip}
              onPress={() => setText(a.prompt)}
            >
              <Text style={styles.docActionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* image attachment preview */}
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

      {/* pdf attachment preview */}
      {(doc || docLoading) && (
        <View style={styles.attachRow}>
          <Text style={styles.docIcon}>📄</Text>
          {docLoading ? (
            <View style={styles.docLoadingRow}>
              <ActivityIndicator color={theme.colors.textDim} size="small" />
              <Text style={styles.attachLabel}>Reading PDF…</Text>
            </View>
          ) : (
            <Text style={styles.attachLabel} numberOfLines={1}>
              {doc?.name}
              {doc?.truncated ? "  (long — using first pages)" : ""}
            </Text>
          )}
          {doc && (
            <TouchableOpacity
              onPress={() => setDoc(null)}
              style={styles.attachRemove}
            >
              <Text style={styles.attachRemoveText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* input bar */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          disabled={merging}
        >
          {merging ? (
            <ActivityIndicator color={theme.colors.text} size="small" />
          ) : (
            <Text style={styles.iconBtnText}>＋</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={
            doc
              ? "Ask about the PDF, or pick an action above…"
              : mode === "image"
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
          style={[styles.sendBtn, (sending || docLoading) && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={sending || docLoading}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* attach menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Attach</Text>
            <MenuItem icon="🖼️" label="Photo from library" onPress={() => attachImage(false)} />
            <MenuItem icon="📷" label="Take a photo" onPress={() => attachImage(true)} />
            <MenuItem icon="📄" label="PDF — read & ask / edit" onPress={attachPdf} />
            <MenuItem icon="🗂️" label="Merge PDFs into one" onPress={mergePdfs} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
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
  docActions: { flexDirection: "row", gap: 8, marginBottom: 8 },
  docActionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  docActionText: { color: theme.colors.text, fontWeight: "700", fontSize: 12 },
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
  docIcon: { fontSize: 22 },
  docLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  menuCard: {
    backgroundColor: theme.colors.bgElevated,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 18,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  menuTitle: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: theme.radius.md,
  },
  menuIcon: { fontSize: 22 },
  menuLabel: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
});
