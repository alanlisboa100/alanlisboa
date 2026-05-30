import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { api, type ApiChatMessage } from "./api";
import { ENV } from "./env";
import type {
  ChatMessage,
  ChatTab,
  ComposerMode,
  Quality,
  VantivoState,
} from "./types";

const STORAGE_KEY = "vantivo:state:v1";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function newTab(index: number): ChatTab {
  const now = Date.now();
  return {
    id: uid(),
    title: `Chat ${index}`,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function initialState(): VantivoState {
  const first = newTab(1);
  return { tabs: [first], activeTabId: first.id };
}

type Action =
  | { type: "INIT"; state: VantivoState }
  | { type: "ADD_TAB"; tab: ChatTab }
  | { type: "CLOSE_TAB"; tabId: string }
  | { type: "RENAME_TAB"; tabId: string; title: string }
  | { type: "SET_ACTIVE"; tabId: string }
  | { type: "ADD_MESSAGE"; tabId: string; message: ChatMessage }
  | {
      type: "UPDATE_MESSAGE";
      tabId: string;
      messageId: string;
      patch: Partial<ChatMessage>;
    }
  | { type: "CLEAR_TAB"; tabId: string };

function touch(tab: ChatTab): ChatTab {
  return { ...tab, updatedAt: Date.now() };
}

function reducer(state: VantivoState, action: Action): VantivoState {
  switch (action.type) {
    case "INIT":
      return action.state;

    case "ADD_TAB": {
      if (state.tabs.length >= ENV.maxTabs) return state;
      return {
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };
    }

    case "CLOSE_TAB": {
      if (state.tabs.length <= 1) {
        // Keep at least one tab — clear it instead of removing.
        const cleared = state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, messages: [] } : t,
        );
        return { ...state, tabs: cleared };
      }
      const tabs = state.tabs.filter((t) => t.id !== action.tabId);
      const activeTabId =
        state.activeTabId === action.tabId
          ? tabs[tabs.length - 1].id
          : state.activeTabId;
      return { tabs, activeTabId };
    }

    case "RENAME_TAB":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, title: action.title } : t,
        ),
      };

    case "SET_ACTIVE":
      return { ...state, activeTabId: action.tabId };

    case "ADD_MESSAGE":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId
            ? touch({ ...t, messages: [...t.messages, action.message] })
            : t,
        ),
      };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId
            ? touch({
                ...t,
                messages: t.messages.map((m) =>
                  m.id === action.messageId ? { ...m, ...action.patch } : m,
                ),
              })
            : t,
        ),
      };

    case "CLEAR_TAB":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? touch({ ...t, messages: [] }) : t,
        ),
      };

    default:
      return state;
  }
}

export interface SendParams {
  mode: ComposerMode;
  text: string;
  quality: Quality;
  /** Local URI for display (optional attachment). */
  imageUri?: string;
  /** Base64 data URI sent to the server (optional attachment). */
  imageDataUri?: string;
}

interface VantivoContextValue {
  state: VantivoState;
  activeTab: ChatTab;
  ready: boolean;
  createTab: () => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  setActiveTab: (tabId: string) => void;
  clearTab: (tabId: string) => void;
  send: (params: SendParams) => Promise<void>;
}

const VantivoContext = createContext<VantivoContextValue | null>(null);

function buildHistory(tab: ChatTab): ApiChatMessage[] {
  return tab.messages
    .filter((m) => m.kind === "text" && !m.pending && m.text.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.text }));
}

export function VantivoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = React.useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load persisted state once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as VantivoState;
          if (parsed?.tabs?.length) {
            dispatch({ type: "INIT", state: parsed });
          }
        }
      } catch {
        // ignore — start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Persist on every change (after initial load).
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const activeTab = useMemo(
    () =>
      state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0],
    [state],
  );

  const createTab = useCallback(() => {
    const index = stateRef.current.tabs.length + 1;
    dispatch({ type: "ADD_TAB", tab: newTab(index) });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: "CLOSE_TAB", tabId });
  }, []);

  const renameTab = useCallback((tabId: string, title: string) => {
    dispatch({ type: "RENAME_TAB", tabId, title: title.trim() || "Chat" });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    dispatch({ type: "SET_ACTIVE", tabId });
  }, []);

  const clearTab = useCallback((tabId: string) => {
    dispatch({ type: "CLEAR_TAB", tabId });
  }, []);

  const send = useCallback(async (params: SendParams) => {
    const tabId = stateRef.current.activeTabId;
    const tabBefore = stateRef.current.tabs.find((t) => t.id === tabId);
    if (!tabBefore) return;

    const { mode, text, quality, imageUri, imageDataUri } = params;
    const trimmed = text.trim();

    // Build the user-facing message text.
    let userText = trimmed;
    if (!userText && mode === "chat" && imageUri) {
      userText = "What's in this photo?";
    }

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      kind: "text",
      text: userText || "(no text)",
      inputImageUri: imageUri,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_MESSAGE", tabId, message: userMessage });

    // Auto-title the tab from the first user message.
    if (tabBefore.messages.length === 0 && userText) {
      const title = userText.slice(0, 28) + (userText.length > 28 ? "…" : "");
      dispatch({ type: "RENAME_TAB", tabId, title });
    }

    const assistantId = uid();
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      kind: mode === "chat" ? "text" : "image",
      text: "",
      createdAt: Date.now(),
      pending: true,
    };
    dispatch({ type: "ADD_MESSAGE", tabId, message: placeholder });

    try {
      if (mode === "image") {
        const images = await api.generateImage(trimmed, quality);
        dispatch({
          type: "UPDATE_MESSAGE",
          tabId,
          messageId: assistantId,
          patch: {
            pending: false,
            kind: "image",
            imageUrls: images,
            text: images.length ? "" : "No image was returned.",
          },
        });
      } else if (mode === "edit") {
        if (!imageDataUri) throw new Error("Attach a photo to edit first.");
        const images = await api.editImage(trimmed, imageDataUri, quality);
        dispatch({
          type: "UPDATE_MESSAGE",
          tabId,
          messageId: assistantId,
          patch: {
            pending: false,
            kind: "image",
            imageUrls: images,
            text: images.length ? "" : "No image was returned.",
          },
        });
      } else if (imageDataUri) {
        // chat mode WITH a photo -> vision (reads the photo)
        const history = buildHistory(tabBefore);
        const reply = await api.vision(
          userText || "Describe this image.",
          imageDataUri,
          history,
        );
        dispatch({
          type: "UPDATE_MESSAGE",
          tabId,
          messageId: assistantId,
          patch: { pending: false, kind: "text", text: reply },
        });
      } else {
        // plain chat
        const history = buildHistory(tabBefore);
        const reply = await api.chat([
          ...history,
          { role: "user", content: userText },
        ]);
        dispatch({
          type: "UPDATE_MESSAGE",
          tabId,
          messageId: assistantId,
          patch: { pending: false, kind: "text", text: reply },
        });
      }
    } catch (err: any) {
      dispatch({
        type: "UPDATE_MESSAGE",
        tabId,
        messageId: assistantId,
        patch: {
          pending: false,
          kind: "error",
          text: err?.message || "Something went wrong. Please try again.",
        },
      });
    }
  }, []);

  const value: VantivoContextValue = {
    state,
    activeTab,
    ready,
    createTab,
    closeTab,
    renameTab,
    setActiveTab,
    clearTab,
    send,
  };

  return (
    <VantivoContext.Provider value={value}>{children}</VantivoContext.Provider>
  );
}

export function useVantivo(): VantivoContextValue {
  const ctx = useContext(VantivoContext);
  if (!ctx) throw new Error("useVantivo must be used within VantivoProvider");
  return ctx;
}
