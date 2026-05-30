import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ENV } from "../env";
import { useVantivo } from "../store";
import { theme } from "../theme";

export function TabBar() {
  const {
    state,
    activeTab,
    createTab,
    closeTab,
    setActiveTab,
    renameTab,
  } = useVantivo();

  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const canAdd = state.tabs.length < ENV.maxTabs;

  const openRename = (id: string, current: string) => {
    setDraft(current);
    setRenaming(id);
  };

  const commitRename = () => {
    if (renaming) renameTab(renaming, draft);
    setRenaming(null);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {state.tabs.map((tab) => {
          const active = tab.id === activeTab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              onLongPress={() => openRename(tab.id, tab.title)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.8}
            >
              <Text
                numberOfLines={1}
                style={[styles.tabText, active && styles.tabTextActive]}
              >
                {tab.title}
              </Text>
              {active && (
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => closeTab(tab.id)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={createTab}
          disabled={!canAdd}
          style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
          accessibilityLabel="New tab"
        >
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </ScrollView>

      {!canAdd && (
        <Text style={styles.limitHint}>Max {ENV.maxTabs} tabs</Text>
      )}

      <Modal
        visible={renaming !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename tab</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              style={styles.input}
              placeholder="Tab name"
              placeholderTextColor={theme.colors.textFaint}
              autoFocus
              maxLength={40}
              onSubmitEditing={commitRename}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setRenaming(null)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={commitRename}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 10, paddingBottom: 8 },
  row: {
    paddingHorizontal: theme.spacing(4),
    gap: 8,
    alignItems: "center",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    maxWidth: 180,
  },
  tabActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  tabText: { color: theme.colors.textDim, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: theme.colors.text },
  closeBtn: { marginLeft: 8 },
  closeText: { color: theme.colors.textDim, fontSize: 18, lineHeight: 18 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.35 },
  addText: { color: theme.colors.text, fontSize: 20, lineHeight: 22 },
  limitHint: {
    color: theme.colors.textFaint,
    fontSize: 10,
    paddingHorizontal: theme.spacing(4),
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: theme.radius.pill },
  modalBtnPrimary: { backgroundColor: theme.colors.primary },
  modalBtnText: { color: theme.colors.textDim, fontWeight: "700" },
  modalBtnTextPrimary: { color: "#fff" },
});
