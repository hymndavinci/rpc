# Roxy RPC Dashboard

A Discord Rich Presence (RPC) selfbot with a web-based management dashboard.

## Overview

This project allows users to customize their Discord presence (activities like "Playing", "Streaming", etc.) via a web UI. It includes an AFK auto-responder and dynamic activity rotation.

## Tech Stack

- **Runtime:** Node.js 20
- **Backend:** Express.js
- **Discord Library:** discord.js-selfbot-v13
- **Frontend:** Plain HTML/CSS (served statically via Express)
- **Auth:** Custom username/password with cookie-parser sessions
- **Config:** dotenv for environment variables

## Project Structure

```
.
├── index.js              # Main entry point (Express server + Discord client)
├── package.json          # Dependencies
├── rpc-config.json       # Persisted RPC configuration
├── afk-logs.json         # Persisted AFK mention logs
├── .env                  # Environment variables template
└── public/               # Static frontend files
    ├── index.html        # Main dashboard
    ├── login.html        # Login page
    ├── afk.html          # AFK management page
    └── dynamic.html      # Dynamic RPC rotation config
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DISCORD_TOKEN` | Discord user token for selfbot | No (app runs without it) |
| `PORT` | Server port (set to 5000) | Yes |
| `AUTH_USERNAME` | Dashboard login username | No (defaults to `manish`) |
| `AUTH_PASSWORD` | Dashboard login password | No (defaults to `kawai`) |
| `TWITCH_URL` | Twitch URL for streaming activity | No |

## Running the App

```bash
node index.js
```

The web dashboard runs on port 5000. If no `DISCORD_TOKEN` is set, the dashboard still loads but Discord features are disabled.

## Key Features

- **RPC Management:** Set activity type, name, state, details, images, buttons, status
- **AFK Responder:** Auto-reply to mentions when enabled; logs are stored in `afk-logs.json`
- **Dynamic Rotation:** Cycles through a list of activities at configurable intervals
- **Device Spoofing:** Appear as Desktop or Mobile Discord client
- **Security:** IP-based rate limiting for login attempts

## Deployment

Configured as a VM deployment (always running) since it maintains Discord websocket connections.
