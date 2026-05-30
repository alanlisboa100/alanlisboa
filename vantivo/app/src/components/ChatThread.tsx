import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useVantivo } from "../store";
import { theme } from "../theme";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

const SUGGESTIONS: { icon: string; title: string; prompt: string }[] = [
  {
    icon: "💡",
    title: "Ideias de conteúdo",
    prompt: "Me dê 5 ideias de conteúdo para Instagram sobre tecnologia.",
  },
  {
    icon: "✍️",
    title: "Escrever um e-mail",
    prompt: "Escreva um e-mail profissional e cordial pedindo uma reunião.",
  },
  {
    icon: "🧠",
    title: "Explicar de forma simples",
    prompt: "Explique de forma simples o que é inteligência artificial.",
  },
  {
    icon: "🗒️",
    title: "Planejar meu dia",
    prompt: "Monte um plano produtivo e realista para o meu dia.",
  },
];

function EmptyState() {
  const { send } = useVantivo();
  return (
    <View style={styles.empty}>
      <LinearGradient
        colors={theme.gradient.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroLogo}
      >
        <Text style={styles.heroLetter}>V</Text>
      </LinearGradient>
      <Text style={styles.emptyTitle}>Como posso ajudar?</Text>
      <Text style={styles.emptyBody}>
        Converse, crie e edite imagens, leia fotos e PDFs, e gere documentos —
        tudo aqui. Abra uma nova aba para outro assunto.
      </Text>

      <View style={styles.grid}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.title}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => send({ mode: "chat", text: s.prompt, quality: "low" })}
          >
            <Text style={styles.cardIcon}>{s.icon}</Text>
            <Text style={styles.cardTitle}>{s.title}</Text>
          </TouchableOpacity>
        ))}
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
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing(4), paddingVertical: 14 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  heroLogo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroLetter: { color: "#fff", fontWeight: "900", fontSize: 30 },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyBody: {
    color: theme.colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  card: {
    width: "47%",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  cardIcon: { fontSize: 20, marginBottom: 8 },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
  },
});
