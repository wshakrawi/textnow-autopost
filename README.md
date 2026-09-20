# TEXTME AutoPost v1.0 — Workable Local-First MVP

A browser-based Facebook Group posting assistant. The dashboard runs as a static site (ideal for Vercel) and the Chrome extension keeps a local copy of the posting queue.

## What works

- Create a post with listing name, caption, optional image URLs and multiple Facebook Group targets.
- Choose **Ready now** or a real **date + time** schedule.
- Edit / reschedule / delete queue items.
- 7-day schedule view.
- Queue filters: Scheduled, Ready, Posted, Needs Action.
- Add, edit and delete Facebook Groups with real URLs.
- Queue persists in browser `localStorage` after refresh.
- Dashboard syncs queue to the Chrome extension through a local browser bridge.
- Extension keeps its own `chrome.storage.local` queue copy.
- Chrome alarms mark a scheduled post **Ready** when its time arrives while Chrome is running.
- Extension opens the next saved Facebook Group URL.
- Extension attempts to prepare the caption and image URLs inside the Facebook composer.
- User manually reviews and publishes on Facebook.
- `Mark Current Group Posted` advances progress to the next group.
- Extension changes are synced back to the dashboard when the dashboard tab is open.

## Important limitation

This is **assisted posting**, not an official Facebook Groups API integration. Facebook can change its DOM/UI, require group questions, approval, login verification, CAPTCHA or block synthetic file attachment. Final publish is intentionally manual.

Image auto-attachment also depends on the image host allowing browser fetch/CORS. If an image cannot be fetched, the extension still prepares the caption and tells the user to attach images manually.

## Deploy dashboard to Vercel

Upload these root files to the Vercel project:

- `index.html`
- `styles.css`
- `app.js`

The `extension/` folder may stay in the same GitHub repository, but Chrome does not install it from Vercel.

## Install / update Chrome extension

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. If an older version is already loaded, click the extension's **Reload** button after replacing the folder files.
5. Pin **TEXTME Posting Assistant** to the Chrome toolbar.

The bridge is currently allowed on:

- `https://*.vercel.app/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

If you later move the dashboard to a custom domain (for example `textme.my`), add that domain to the `bridge.js` content-script `matches` list inside `manifest.json`, then reload the extension.

## First real test

1. In **FB Groups**, edit a demo group and replace its URL with a real Facebook Group URL.
2. Click **Create Post**.
3. Enter the listing and caption.
4. Choose **Ready now** for immediate testing, or choose **Schedule** and set a future date/time.
5. Select one Facebook Group for the first test.
6. Save to Queue.
7. Click **Sync Queue to Extension** on the dashboard.
8. Open the Chrome extension.
9. Click **Open Next Group**.
10. In Facebook, open the post composer if Facebook does not open it automatically.
11. Click **Prepare Post** in the extension.
12. Review the caption/images and manually click Facebook's **Post** button.
13. Open the extension and click **Mark Current Group Posted**.

## Production upgrade path

The current version stores data only on the user's browser. For multi-user/team use, the next step is to replace local storage with Supabase tables for users, listings, groups, posts, schedules and posting logs. The UI and extension queue model can be retained.
