import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useVantivo } from "../store";
import { theme } from "../theme";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>How can I help right now?</Text>
      <Text style={styles.emptyBody}>
        Chat, generate or edit images in 1K, read a photo or a PDF you send, or
        turn an answer into a PDF — all in this tab. Open a new tab for a
        different subject.
      </Text>
      <View style={styles.tips}>
        <Text style={styles.tip}>💬  Ask anything</Text>
        <Text style={styles.tip}>🖼️  Switch to Image and describe a picture</Text>
        <Text style={styles.tip}>✏️  Attach a photo + Edit to transform it</Text>
        <Text style={styles.tip}>📄  Attach a PDF to read, summarize or translate it</Text>
        <Text style={styles.tip}>🗂️  Use ＋ to merge several PDFs into one</Text>
      </View>
    </View>
  );
}

export function ChatThread() {
  const { activeTab } = useVantivo();
  const listRef = React.useRef<FlatList<ChatMessage>>(null);

  React.useEffect(() => {
    if (activeTab.messages.length > 0) {
      const t = setTimeout(
        () => listRef.current?.scrollToEnd({ animated: true }),
        80,
      );
      return () => clearTimeout(t);
    }
  }, [activeTab.messages.length, activeTab.id]);

  if (activeTab.messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      ref={listRef}
      data={activeTab.messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerStyle={styles.content}
      onContentSizeChange={() =>
        listRef.current?.scrollToEnd({ animated: true })
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing(3), paddingVertical: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyBody: {
    color: theme.colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 22,
  },
  tips: { gap: 10, alignSelf: "stretch" },
  tip: {
    color: theme.colors.textDim,
    fontSize: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
});
