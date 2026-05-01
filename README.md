# OneSignal Personalization Builder

An interactive reference tool for building [Liquid](https://documentation.onesignal.com/docs/en/using-liquid-syntax) personalization snippets across OneSignal channels and data sources. Pick a channel, pick a data source, configure your sections – and get the Liquid syntax, sample data setup, a live rendered preview, and the API request needed to send, or create as a template!

## Features

- **5 channels** — Email, Push, SMS, In-App, Live Activities
- **5 data sources** — Properties/Tags, API `custom_data`, Dynamic Content (CSV), Data Feeds, Custom Events
- **Live preview** — renders your Liquid against sample data in the browser using [LiquidJS](https://liquidjs.com/)
- **Sample data setup** — generates the REST API call or SDK snippet needed to set the data
- **API request builder** — builds the correct `curl` command and lets you send directly from the page (requires App ID + REST API Key in Settings)
- **CSV download** — for Dynamic Content sources, exports a ready-to-upload CSV
- **Common scenarios** — one-click presets for the most frequent personalization patterns
- **Settings** — App ID, REST API Key, test recipient, and Template ID stored in `localStorage` only; never sent anywhere except OneSignal's own API

## Usage

Open `index.html` directly in any modern browser — no build step, no dependencies to install.

```
open index.html
```

Or serve it locally:

```bash
npx serve .
# or
python3 -m http.server
```

A live version is deployed at: `https://<your-github-username>.github.io/<repo-name>/`

## Project structure

```
├── index.html          # Markup
├── css/
│   └── styles.css      # All styles
└── js/
    ├── data.js         # Channel/source definitions, fallbacks, scenarios
    ├── state.js        # Mutable app state + localStorage settings
    ├── liquid.js       # Liquid snippet generation, CSV helpers, setup generator
    ├── preview.js      # Preview scope builder + LiquidJS rendering
    ├── ui.js           # DOM helpers, banners, code block widget
    ├── api.js          # API request building, curl generation, send + download
    ├── render.js       # All render* functions, section management
    └── app.js          # Settings UI, tab wiring, boot sequence
```

## Deploying

Push to the `main` branch — GitHub Actions will automatically deploy to GitHub Pages via the included workflow (`.github/workflows/deploy.yml`).

To enable Pages for the first time:

1. Go to **Settings → Pages** in your GitHub repo
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the workflow will handle the rest

## Notes

- The REST API Key and App ID are stored in `localStorage` only and are never logged or sent anywhere except OneSignal's API when you click **Send**.
- Browser CORS will block some direct API calls (e.g. sending a notification). If a request fails with a CORS error, copy the `curl` command and run it from a terminal.
- Always verify generated snippets against the latest [OneSignal personalization docs](https://documentation.onesignal.com/docs/en/message-personalization).
