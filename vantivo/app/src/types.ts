export type Quality = "low" | "medium";

export type ComposerMode = "chat" | "image" | "edit";

export type MessageRole = "user" | "assistant";

export type MessageKind = "text" | "image" | "error";

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
  createdAt: number;
  pending?: boolean;
}

export interface ChatTab {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface VantivoState {
  tabs: ChatTab[];
  activeTabId: string;
}
