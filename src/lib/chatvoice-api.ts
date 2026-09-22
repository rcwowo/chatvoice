/**
 * Shared chat types, re-exported from the browser-native Twitch IRC client
 * so the rest of the codebase has a single import path.
 */

export type {
  TwitchChatMessage as ChatMessageEvent,
  TwitchConnectionState as ChatConnectionState,
} from "@/lib/twitch-chat"
