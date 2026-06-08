# 🛡️ AI Blocker

Browser extension that blocks AI content across the web — like ad blockers block ads.

## What it does

AI Blocker takes a two-pronged approach to removing AI content from your browsing:

1. **Network-level blocking** — Blocks requests to known AI endpoints (chat APIs, AI analytics, generation services) using declarativeNetRequest
2. **DOM-level hiding** — CSS selector rules hide AI widgets, chatbots, summary panels, and overlays

## Block Categories

| Category | What's blocked |
|---|---|
| 🤖 Chat Widgets | ChatGPT embeds, Intercom AI, Drift AI, Crisp AI |
| 🔍 Search AI | Google SGE/AI Overviews, Bing Copilot, DDG AI |
| ✍️ Content AI | Grammarly, Notion AI, WordPress AI, Jasper |
| 📱 Social AI | Twitter/X Grok, Meta AI, LinkedIn AI |
| 📊 AI Tracking | AI analytics endpoints, personalization scripts |
| 🔔 AI Overlays | "Try AI" popups, AI onboarding modals |

## Install

### Chrome (Manifest V3)
1. Download the latest release or build from source
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → select the `dist` folder

### Firefox
1. Download the latest release or build from source
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on" → select any file in the `dist` folder

## Build from source

```bash
# Install dependencies
npm install

# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Development mode (Chrome)
npm run dev

# Development mode (Firefox)
npm run dev:firefox
```

## Filter Lists

Community-curated filter lists live in `filter-lists/`:

- `chat-widgets.txt` — AI chat widget domains
- `search-ai.txt` — AI search feature domains
- `content-ai.txt` — AI writing tool domains
- `social-ai.txt` — Social media AI domains
- `tracking.txt` — AI tracking/analytics domains
- `overlays.txt` — AI overlay/popup domains
- `cosmetic-rules.txt` — CSS selector rules for element hiding

### Contributing filter lists

Submit new rules via pull request! Follow the existing format:
```
! Category comment
||domain.com/path^
example.com##.ai-selector
```

## Tech Stack

- **TypeScript** — Type-safe extension code
- **WXT** — Cross-browser WebExtension build tool
- **Vue 3** — Popup & Options UI
- **Declarative Net Request** — Chrome MV3 network blocking
- **Content Scripts** — Cosmetic element hiding

## Architecture

```
├── entrypoints/
│   ├── background.ts    → Service worker (DNR rule management, storage, messaging)
│   ├── content.ts       → Content script (cosmetic hiding, MutationObserver)
│   ├── popup/           → Extension popup UI (Vue)
│   └── options/         → Settings page (Vue)
├── rules/               → DeclarativeNetRequest JSON rulesets
├── filter-lists/        → Human-readable filter lists (uBlock-style format)
└── public/icon/         → Extension icons
```

## License

MIT