# TEXTME AutoPost MVP

A lightweight working prototype for a Facebook Group posting workflow.

## Included

- Responsive minimalist AutoPost dashboard
- Create Post modal with listing, caption, schedule, photos and target groups
- Facebook Group library with filters and reusable group sets
- Posting queue and simple schedule board
- Local demo state (no backend required)
- Chrome Extension starter (Manifest V3)
- Extension-assisted Facebook caption preparation
- Generic image attachment attempt when image URLs and a compatible file input are available
- No automatic final Publish click

## Run dashboard

Open `index.html` in a modern browser.

## Install Chrome extension locally

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension` folder
5. Open a Facebook Group and its post composer
6. Click the TEXTME extension and choose **Prepare Current Post**

## Important implementation note

Facebook's interface changes frequently. The included content script uses generic accessibility/contenteditable selectors and is an MVP helper, not a guarantee against future UI changes, checkpoints, group approvals or anti-automation controls. Keep final publishing user-confirmed.

## Next integration layer

Replace the local demo state with your API/Supabase tables:

- `facebook_groups`
- `group_sets`
- `post_drafts`
- `post_queue`
- `posting_logs`
- `tracking_events`

The extension should authenticate to TEXTME, fetch only the active user's queue, and report `prepared / posted / failed / action_required` states back to the API.
