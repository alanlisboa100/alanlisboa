import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { ChatThread } from "./src/components/ChatThread";
import { Composer } from "./src/components/Composer";
import { Header } from "./src/components/Header";
import { TabBar } from "./src/components/TabBar";
import { useVantivo, VantivoProvider } from "./src/store";
import { theme } from "./src/theme";

function Shell() {
  const { ready } = useVantivo();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header />
      <TabBar />
      {ready ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={styles.flex}>
            <ChatThread />
          </View>
          <Composer />
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <VantivoProvider>
          <Shell />
        </VantivoProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
