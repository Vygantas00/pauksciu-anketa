# Paukščių stebėjimo anketa – phone app

Offline web app (PWA). Teams open the link once with internet, tap **Install / Add to Home screen**, and from then on it works with no signal.

## Publish on GitHub Pages (free)

1. On github.com click **New repository**. Name it e.g. `pauksciu-anketa` (plain letters, numbers and dashes, no Lithuanian letters). Set it to **Public** (Pages on private repos needs a paid plan). Create it.
2. Click **uploading an existing file** and drag in **everything inside the `team_app` folder** (the files `index.html`, `app.js`, `styles.css`, `zip.js`, `sw.js`, `manifest.webmanifest` and the folders `data`, `fonts`, `icons`). Do not upload the folder itself, the files must be at the top level. Commit.
3. Repository **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch `main`, folder `/ (root)`, **Save**.
4. After about a minute the page shows the link: `https://<your-username>.github.io/<repository-name>/`.
5. Open it on a phone, wait a few seconds, then **⋮ → Install app / Add to Home screen**.

## Updating the app later

Replace the changed files in the repository (Add file → Upload files → overwrite). **Also change the version in `sw.js`** (`const CACHE = 'birds-v2'` → `'birds-v3'`), otherwise phones keep showing the old copy. Phones get the new version the second time they open the app with internet.

## Before the event – check on a real phone

1. Open the link, install the app.
2. Switch on airplane mode, open the app from the home screen: the list loads.
3. Tick a few birds, close the app completely, reopen: ticks are still there.
4. Tikrinti ir Siųsti → enter a team name → **Siųsti** opens the share menu with the ZIP; **Atsisiųsti** saves it to Downloads.

Tick data lives in the browser on that phone. Clearing browser/site data erases it, so ask teams not to do that and to use **Atsisiųsti** as a backup during the day.
