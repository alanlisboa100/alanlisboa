export type Quality = "low" | "medium";

export type ComposerMode = "chat" | "image" | "edit";

export type MessageRole = "user" | "assistant";

export type MessageKind = "text" | "image" | "error";

/** "Brain" selector: eco = cheap mini, forte = stronger model. */
export type Brain = "eco" | "forte";

/** Stored so a failed/again request can be retried in place. */
export interface RetryInfo {
  type: "chat" | "image" | "doc";
  prompt: string;
  quality: Quality;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  kind: MessageKind;
  /** Markdown / plain text content. */
  text: string;
  /** Local or remote image URI attached by the user (vision/edit input). */
  inputImageUri?: string;
  /** Name of a PDF/document the user attached for this message. */
  inputDocName?: string;
  /** Resulting image URL(s) produced by generate/edit. */
  imageUrls?: string[];
  /** Retry metadata (text-based requests only). */
  retry?: RetryInfo;
  createdAt: number;
  pending?: boolean;
}

/** A PDF "pinned" to a tab so its context persists across turns. */
export interface PinnedDoc {
  name: string;
  text: string;
  truncated: boolean;
}

export interface ChatTab {
  id: string;
  title: string;
  messages: ChatMessage[];
  /** Persistent document memory for this tab. */
  pinnedDoc?: PinnedDoc;
  createdAt: number;
  updatedAt: number;
}

export interface VantivoState {
  tabs: ChatTab[];
  activeTabId: string;
  /** Selected model brain (persisted). */
  brain: Brain;
}
