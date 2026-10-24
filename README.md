# Gather — SolidJS shopping lists

Gather is a frontend-only shopping checklist built with SolidJS, TypeScript, and Tailwind CSS. It has no account, backend, database, or sync. Lists are stored in the current browser profile with localStorage.

## Local development

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```sh
npm install
npm run dev
```

Run `npm run build` to type-check and create the static site in `dist/`, then `npm run preview` to preview that build. The app starts with an empty workspace; create a list to begin.

## Languages and startup

The UI supports English and Brazilian Portuguese. On first use, Gather selects a language from the browser preference (`pt` uses `pt-BR`; other preferences use English). The in-app language control saves the selection on the device. All interface copy lives in `public/locales/en.json` and `public/locales/pt-BR.json`; formatting uses the browser's native `Intl` APIs.

Startup loads and validates the selected translation JSON before mounting the UI and sets the document's `lang` attribute first. If the file cannot be loaded, a retry state is shown. There is no external font or translation service request.

## Install and offline use

The production build includes a web app manifest and a service worker. Serve the app over HTTPS (localhost is also supported) to enable installation and offline use. The first visit needs a network connection to download the app and language files. After service worker installation, the app shell and both translation files are available offline. List data stays in localStorage and is never sent to a server.

## GitHub Pages deployment

The `main` branch deploys automatically to GitHub Pages after each push. The workflow builds the app and publishes `dist/`; it can also be started manually from the Actions tab. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The Vite base path is `/marketlist/` to match this repository's project site URL.

## Other static hosting

The app can also be hosted on a static server or object storage/CDN. For a different host, set `base` in `vite.config.ts` to the URL path where the app will live before building (use `/` for a domain root). A Lambda is not needed to deliver the app. Deploy the contents of `dist/` at that path and configure the host to:

- Serve `/` and unknown navigation paths with `index.html` (SPA fallback).
- Return JavaScript, JSON, SVG, and webmanifest assets with their correct content types.
- Give hashed files under `/assets/` long-lived immutable caching. Serve `index.html`, `sw.js`, and locale JSON with revalidation so deployments can update promptly.
- Serve over HTTPS. Add security headers appropriate to the host; if using Content Security Policy, account for Vite's generated assets and inline progress width style before enforcing it.

The service worker uses a versioned cache for app shell and locale files and replaces old Gather caches on activation. It does not touch saved list data during updates.

## Data and privacy

Data is stored as version 1 JSON under `gather-shopping-v1`; language preference uses `gather-language-v1`. Saved data is validated at startup. The exact, untouched example data from the earlier demo release is migrated to an empty workspace; edited or custom lists are kept. If other list data is malformed, Gather leaves it untouched until the user chooses to reset it. If storage is blocked or full, the app remains usable for the session and warns that changes may not persist.

Browser storage is tied to this origin and device. Clearing site data or using a private session may remove lists. There is no server backup, export/import, account, or cross-device sync.

## Existing libraries

- SolidJS and TypeScript power the interface.
- Tailwind CSS provides styling.
- Lucide Solid supplies icons.
- Fuse.js provides fuzzy matching across the user's lists.
