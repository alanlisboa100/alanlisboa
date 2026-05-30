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
  Brain,
  ChatMessage,
  ChatTab,
  ComposerMode,
  PinnedDoc,
  Quality,
  RetryInfo,
  VantivoState,
} from "./types";

const STORAGE_KEY = "vantivo:state:v2";

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
  return { tabs: [first], activeTabId: first.id, brain: "eco" };
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
  | { type: "CLEAR_TAB"; tabId: string }
  | { type: "PIN_DOC"; tabId: string; doc: PinnedDoc }
  | { type: "UNPIN_DOC"; tabId: string }
  | { type: "SET_BRAIN"; brain: Brain };

function touch(tab: ChatTab): ChatTab {
  return { ...tab, updatedAt: Date.now() };
}

function reducer(state: VantivoState, action: Action): VantivoState {
  switch (action.type) {
    case "INIT":
      return action.state;

    case "ADD_TAB": {
      if (state.tabs.length >= ENV.maxTabs) return state;
      return { ...state, tabs: [...state.tabs, action.tab], activeTabId: action.tab.id };
    }

    case "CLOSE_TAB": {
      if (state.tabs.length <= 1) {
        const cleared = state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, messages: [], pinnedDoc: undefined } : t,
        );
        return { ...state, tabs: cleared };
      }
      const tabs = state.tabs.filter((t) => t.id !== action.tabId);
      const activeTabId =
        state.activeTabId === action.tabId
          ? tabs[tabs.length - 1].id
          : state.activeTabId;
      return { ...state, tabs, activeTabId };
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
          t.id === action.tabId
            ? touch({ ...t, messages: [], pinnedDoc: undefined })
            : t,
        ),
      };

    case "PIN_DOC":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? touch({ ...t, pinnedDoc: action.doc }) : t,
        ),
      };

    case "UNPIN_DOC":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? touch({ ...t, pinnedDoc: undefined }) : t,
        ),
      };

    case "SET_BRAIN":
      return { ...state, brain: action.brain };

    default:
      return state;
  }
}

export interface SendParams {
  mode: ComposerMode;
  text: string;
  quality: Quality;
  /** Local URI for display (optional photo attachment). */
  imageUri?: string;
  /** Base64 data URI sent to the server (optional photo attachment). */
  imageDataUri?: string;
}

interface VantivoContextValue {
  state: VantivoState;
  activeTab: ChatTab;
  brain: Brain;
  ready: boolean;
  createTab: () => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  setActiveTab: (tabId: string) => void;
  clearTab: (tabId: string) => void;
  pinDoc: (doc: PinnedDoc) => void;
  unpinDoc: () => void;
  setBrain: (brain: Brain) => void;
  send: (params: SendParams) => Promise<void>;
  retry: (messageId: string) => Promise<void>;
}

const VantivoContext = createContext<VantivoContextValue | null>(null);

function buildHistory(messages: ChatMessage[]): ApiChatMessage[] {
  return messages
    .filter((m) => m.kind === "text" && !m.pending && m.text.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.text }));
}

function docPromptFor(doc: PinnedDoc, request: string): string {
  return (
    `The user attached a PDF named "${doc.name}". ` +
    `Use its content below to answer.\n\n` +
    `=== DOCUMENT START ===\n${doc.text}\n=== DOCUMENT END ===\n\n` +
    `Request: ${request}`
  );
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
            dispatch({
              type: "INIT",
              state: { ...parsed, brain: parsed.brain === "forte" ? "forte" : "eco" },
            });
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
    () => state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0],
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

  const pinDoc = useCallback((doc: PinnedDoc) => {
    dispatch({ type: "PIN_DOC", tabId: stateRef.current.activeTabId, doc });
  }, []);

  const unpinDoc = useCallback(() => {
    dispatch({ type: "UNPIN_DOC", tabId: stateRef.current.activeTabId });
  }, []);

  const setBrain = useCallback((brain: Brain) => {
    dispatch({ type: "SET_BRAIN", brain });
  }, []);

  const chatModel = useCallback(
    () =>
      stateRef.current.brain === "forte" ? ENV.chatModelForte : ENV.chatModel,
    [],
  );

  const send = useCallback(
    async (params: SendParams) => {
      const tabId = stateRef.current.activeTabId;
      const tabBefore = stateRef.current.tabs.find((t) => t.id === tabId);
      if (!tabBefore) return;

      const { mode, text, quality, imageUri, imageDataUri } = params;
      const trimmed = text.trim();
      const pinnedDoc = tabBefore.pinnedDoc;
      const usingDoc = mode === "chat" && !imageDataUri && !!pinnedDoc;

      let userText = trimmed;
      if (!userText && mode === "chat" && imageUri) userText = "What's in this photo?";
      if (!userText && usingDoc) userText = "Resuma os pontos principais deste documento.";

      const userMessage: ChatMessage = {
        id: uid(),
        role: "user",
        kind: "text",
        text: userText || "(no text)",
        inputImageUri: imageUri,
        inputDocName: usingDoc ? pinnedDoc!.name : undefined,
        createdAt: Date.now(),
      };
      dispatch({ type: "ADD_MESSAGE", tabId, message: userMessage });

      if (tabBefore.messages.length === 0 && userText) {
        const title = userText.slice(0, 28) + (userText.length > 28 ? "…" : "");
        dispatch({ type: "RENAME_TAB", tabId, title });
      }

      let retryInfo: RetryInfo | undefined;
      if (mode === "image") retryInfo = { type: "image", prompt: trimmed, quality };
      else if (usingDoc) retryInfo = { type: "doc", prompt: userText, quality };
      else if (mode === "chat" && !imageDataUri)
        retryInfo = { type: "chat", prompt: userText, quality };

      const assistantId = uid();
      dispatch({
        type: "ADD_MESSAGE",
        tabId,
        message: {
          id: assistantId,
          role: "assistant",
          kind: mode === "chat" ? "text" : "image",
          text: "",
          createdAt: Date.now(),
          pending: true,
          retry: retryInfo,
        },
      });

      const history = buildHistory(tabBefore.messages);
      const model = chatModel();

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
          const reply = await api.vision(
            userText || "Describe this image.",
            imageDataUri,
            history,
            model,
          );
          dispatch({
            type: "UPDATE_MESSAGE",
            tabId,
            messageId: assistantId,
            patch: { pending: false, kind: "text", text: reply },
          });
        } else if (usingDoc) {
          const reply = await api.chat(
            [...history, { role: "user", content: docPromptFor(pinnedDoc!, userText) }],
            model,
          );
          dispatch({
            type: "UPDATE_MESSAGE",
            tabId,
            messageId: assistantId,
            patch: { pending: false, kind: "text", text: reply },
          });
        } else {
          const reply = await api.chat(
            [...history, { role: "user", content: userText }],
            model,
          );
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
    },
    [chatModel],
  );

  const retry = useCallback(
    async (messageId: string) => {
      const tab = stateRef.current.tabs.find((t) =>
        t.messages.some((m) => m.id === messageId),
      );
      if (!tab) return;
      const idx = tab.messages.findIndex((m) => m.id === messageId);
      const msg = tab.messages[idx];
      if (!msg?.retry) return;

      const { type, prompt, quality } = msg.retry;
      const tabId = tab.id;
      const history = buildHistory(tab.messages.slice(0, Math.max(0, idx - 1)));
      const model = chatModel();

      dispatch({
        type: "UPDATE_MESSAGE",
        tabId,
        messageId,
        patch: {
          pending: true,
          kind: type === "image" ? "image" : "text",
          text: "",
          imageUrls: undefined,
        },
      });

      try {
        if (type === "image") {
          const images = await api.generateImage(prompt, quality);
          dispatch({
            type: "UPDATE_MESSAGE",
            tabId,
            messageId,
            patch: {
              pending: false,
              kind: "image",
              imageUrls: images,
              text: images.length ? "" : "No image was returned.",
            },
          });
        } else {
          const content =
            type === "doc" && tab.pinnedDoc
              ? docPromptFor(tab.pinnedDoc, prompt)
              : prompt;
          const reply = await api.chat([...history, { role: "user", content }], model);
          dispatch({
            type: "UPDATE_MESSAGE",
            tabId,
            messageId,
            patch: { pending: false, kind: "text", text: reply },
          });
        }
      } catch (err: any) {
        dispatch({
          type: "UPDATE_MESSAGE",
          tabId,
          messageId,
          patch: {
            pending: false,
            kind: "error",
            text: err?.message || "Something went wrong. Please try again.",
          },
        });
      }
    },
    [chatModel],
  );

  const value: VantivoContextValue = {
    state,
    activeTab,
    brain: state.brain,
    ready,
    createTab,
    closeTab,
    renameTab,
    setActiveTab,
    clearTab,
    pinDoc,
    unpinDoc,
    setBrain,
    send,
    retry,
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
