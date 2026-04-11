<div align="center">

# 🎮 Roxy RPC Dashboard

**A self-hosted Discord Rich Presence selfbot with a sleek web-based management dashboard.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Discord](https://img.shields.io/badge/Discord-Selfbot-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

- 🎨 **Rich Presence Control** — Set custom name, state, details, buttons, and images for your Discord status
- 🖼️ **External Image & GIF Support** — Use any image URL or animated GIF as your RPC artwork
- 🔄 **Dynamic RPC** — Automatically rotate through multiple RPC presets on a set interval
- 💤 **AFK System** — Auto-reply to mentions and DMs when you're away
- 📱 **Device Spoofing** — Appear as Desktop, Mobile, or Web
- 🌐 **Web Dashboard** — Full browser-based UI to manage everything without touching config files
- 🔐 **Password Protected** — Login-gated dashboard with brute-force protection

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A Discord account token (**use at your own risk**)
- A [Discord Application](https://discord.com/developers/applications) (for custom App ID & artwork)

### Installation

```bash
# Clone the repository
git clone https://github.com/hymndavinci/rpc.git
cd rpc

# Install dependencies
npm install
```

### Configuration

Copy `.env` and fill in your values:

```env
DISCORD_TOKEN=your_discord_token_here
PORT=3000
AUTH_USERNAME=admin
AUTH_PASSWORD=yourpassword
TWITCH_URL=https://www.twitch.tv/your_name
```

### Running

```bash
npm start
```

Then open your browser and go to `http://localhost:3000`.

---

## 📋 Dashboard Pages

| Page | Description |
|------|-------------|
| `/` | Main RPC settings — status, images, buttons |
| `/afk` | AFK system — toggle, message, DM reply |
| `/dynamic` | Dynamic RPC — manage rotating presets |

---

## 🖼️ Image Configuration

Images can be set using:

- **Asset key** — Upload assets to your Discord Application and use the key name
- **External URL** — Any direct image URL (`.png`, `.jpg`, `.gif`, etc.)

> For GIF support, a valid **Discord Application ID** is required. Create one at [discord.com/developers/applications](https://discord.com/developers/applications).

**Recommended GIF specs:**
- Dimensions: 128×128 px or 160×160 px
- File size: under 500 KB
- Use [ezgif.com/optimize](https://ezgif.com/optimize) to compress if needed

---

## ⚙️ RPC Configuration

All settings are saved in `rpc-config.json`. The main fields:

| Field | Description |
|-------|-------------|
| `enabled` | Toggle RPC on/off |
| `type` | Activity type: `PLAYING`, `STREAMING`, `LISTENING`, `WATCHING` |
| `name` | Activity name |
| `details` | Top line of RPC |
| `state` | Bottom line of RPC |
| `largeImage` | Large image key or URL |
| `smallImage` | Small image key or URL |
| `button1Label` / `button1URL` | First button |
| `button2Label` / `button2URL` | Second button |
| `status` | User status: `online`, `idle`, `dnd`, `invisible` |
| `appId` | Discord Application ID for external images |
| `deviceType` | `desktop`, `mobile`, or `web` |

---

## 💤 AFK System

- Automatically replies to server **mentions** and/or **DMs**
- Custom reply message
- Toggle DM replies independently from mention replies
- Disable by unchecking AFK in the dashboard

---

## 🔄 Dynamic RPC

Automatically cycles through a list of RPC presets at a configurable interval (in seconds). Manage presets directly from the `/dynamic` dashboard page.

---

## 🔐 Security Notes

> ⚠️ **Warning:** This project uses a Discord **selfbot**, which violates [Discord's Terms of Service](https://discord.com/terms). Use at your own risk. The author is not responsible for any account termination.

- Never share your `DISCORD_TOKEN` publicly
- Change default `AUTH_USERNAME` and `AUTH_PASSWORD` before deploying
- The dashboard includes rate limiting — 3 failed login attempts results in a 15-minute lockout

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Discord:** [discord.js-selfbot-v13](https://github.com/aiko-chan-ai/discord.js-selfbot-v13)
- **Server:** Express.js
- **Frontend:** Vanilla HTML/CSS/JS

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
Made with ♥ — for personal use only
</div>
