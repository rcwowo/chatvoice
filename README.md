# Chatvoice

Chatvoice is a local-first web app for Twitch broadcasters who want chat messages read out loud.
It connects to Twitch chat with `twurple`, synthesizes speech with `edge-tts`, and keeps dashboard state entirely inside the browser.

## Features

- Connect to a Twitch chatroom from a local dashboard.
- Randomly assign each chatter a saved voice profile, then persist that assignment locally.
- Tune playback filters, queue limits, blocklists, and speech templates.
- Export and restore versioned local backups.
- Use shadcn/ui components without replacing their design language.

## Stack

- React + Vite + TypeScript
- shadcn/ui
- Express local bridge server
- `@twurple/chat` + `@twurple/auth`
- `edge-tts`

## Running locally

Install dependencies:

```bash
bun install
```

Start the client and local bridge together:

```bash
bun run dev
```

The dashboard runs in Vite, and the local bridge listens on `http://localhost:3031`.

## Notes on storage and backups

- Dashboard config is stored in browser `localStorage`.
- Backups include `appVersion`, `schemaVersion`, and export time.
- Restore logic accepts the current envelope format and older raw config payloads, then migrates them into the latest schema.

## Twitch auth

- Anonymous mode works for listen-only chat connections.
- You can also provide a Twitch `clientId` and `accessToken` locally in the dashboard.
- Tokens are not uploaded anywhere; they stay in local browser storage and are only sent to the local bridge.
