# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals and households managing their own shopping lists, including while shopping in a store.

## Product Purpose

Gather helps people prepare and use shopping lists quickly, privately, and offline. Success means users can organize what they need and check items off during a shop without depending on an account or a network connection after the app is installed.

## Positioning

Gather is a lightweight shopping checklist that keeps list data in the current browser profile and works offline after installation. It currently has no account, backend, or cross-device sync. Privacy is a durable priority; whether sync is ever added is undecided.

## Operating Context

People create and switch between lists, add items, and mark items as purchased while shopping. The app runs in a web browser and can be installed as a web app. The first visit needs a network connection to download the app shell and translations; after installation, the app shell and both supported language files are available offline.

## Capabilities and Constraints

- Create, rename, switch, and delete shopping lists; add, edit, check off, and remove items.
- Sort checklist items by completion and name, and find similar items across saved lists while entering an item.
- Save list data and language preference in browser localStorage. Data is not sent to a server.
- Support English and Brazilian Portuguese, choosing an initial language from browser preferences and allowing an in-app change.
- Validate saved data on startup and preserve malformed data until the user chooses to reset it. If browser storage is unavailable or full, the app remains usable for the session and warns that changes may not persist.
- Browser storage is tied to the current origin and device. Clearing site data or using a private session may remove lists. There is no backup, export/import, account, or sync today.
- Future sync is undecided; any future product work must continue to treat privacy as important.
- The app is a frontend-only static web app built with SolidJS and TypeScript, styled with Tailwind CSS, and served from static hosting. An HTTPS origin (or localhost) is required for installation and offline service-worker support.

## Brand Commitments

The product is named Gather. The current app and site metadata use this name.

## Evidence on Hand

- Working product implementation and copy: `src/` and `public/locales/`.
- Product and deployment behavior documented in `README.md`.
- No testimonials, customer claims, benchmarks, or external proof assets are established; do not invent them.

## Product Principles

- Make the shopping checklist quick to use in the moment.
- Keep personal list data private and on the user's device by default.
- Keep core list use available without a network after installation.
- Make language and storage limitations clear to users.
