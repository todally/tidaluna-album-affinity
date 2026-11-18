# Album Affinity for TIDALuna

Discover albums you might love by comparing the tracks in **TIDAL → Tracks** (your liked/favorite songs) with each album's total track count.

> **Status: v0.1 beta.** The ranking logic and TypeScript have been checked locally. Real TIDALuna client installation, the live account API, and GitHub CI release have **not** been verified here. Use it as a testable, GitHub-ready source repository, not a guaranteed production plugin.

## Features

- **Full favorites pagination**: uses TIDALuna's authenticated desktop session to read each page of your favorited tracks, rather than only the first page.
- **Album match percentage**: `liked tracks from the exact album edition ÷ album's reported track count × 100`. A 9/10 album ranks above a 2/10 album.
- **Albums ranked by** percentage liked, number liked, fewest not favorited, artist, album title, or release year.
- **Views:** All matching albums, Strong favorites (at least 80% and 5 liked tracks), Nearly complete (70–99%, at least 3 liked tracks).
- **Filters:** artist/album search, minimum liked tracks, minimum total tracks, minimum percent loved, include singles / EPs.
- **Drill-down:** expand each album to see which tracks you have and haven't liked, using album track IDs.
- **Open album** from each result in the TIDAL desktop client.
- **Refresh** favorites on demand. The catalog-only cache lasts up to seven days and is account-scoped.
- **Read only:** does not alter favorites, playlists, albums, or playback.

## How it appears

When enabled, a **♥ Album Affinity** button appears above the TIDAL player, at the lower right of the desktop app. Click it to open the results dashboard. The first time you open it, a scan starts automatically. After you add or remove favorites, click **↻ Refresh** to analyze your updated collection.

The results include album cover art, artist, loved-track count, track-count denominator, a percentage bar, an album link, and an expandable liked / unliked track list. **Not favorited does not mean disliked.**

## Installing from GitHub (after successful build)

The repository is intended to be named `tidaluna-album-affinity` under `todally`. Create a **new GitHub repository** for this plugin; it is separate from `tidaluna-playlist-duration-sort`.

1. Extract the provided ZIP. Upload **the contents** of the folder, preserving hidden files and subdirectories like `.github/workflows/publish.yml` and `plugins/AlbumAffinity/src/`.
2. Easiest method: open the extracted folder in GitHub Desktop, create a repository, commit and publish.
3. On GitHub, go to **Settings → Actions → General → Workflow permissions** and allow **Read and write permissions** (the YAML itself also requests `contents: write`).
4. Open **Actions**, confirm **Build and publish Album Affinity** succeeds (green check).
5. Open **Releases**; the `latest` release should contain `store.json` and the compiled plugin.
6. In **TIDAL → Luna Settings → Plugin Store → Install from URL**, enter:

```
https://github.com/todally/tidaluna-album-affinity/releases/download/latest/store.json
```

**Do not enter the GitHub `/tree/main` page**: it is not a plugin store. The release URL above only works *after* the first GitHub Action has succeeded. If you choose a different GitHub username or repository name, update both the URL and the `repository` field in the root `package.json`.

## Test locally (Windows PowerShell)

Requires [TIDALuna](https://github.com/Inrixia/TidaLuna), Node.js, and pnpm. If you already installed Node and pnpm for Playlist Duration Sort, use them again.

```powershell
cd "C:\path\to\tidaluna-album-affinity"
pnpm.cmd install
pnpm.cmd run test
pnpm.cmd run build
pnpm.cmd run watch
```

Then install the DEV store `http://localhost:3000/store.json` in Luna Settings → Plugin Store. Do **not** run the old playlist-duration-sort dev server on port 3000 simultaneously; stop it first, or change one project’s port.

If pnpm says `ERR_PNPM_IGNORED_BUILDS` for esbuild, run `pnpm.cmd approve-builds` and approve **esbuild**, then retry `pnpm.cmd install` and `pnpm.cmd run build`. The workspace file already explicitly allows esbuild for pnpm versions that support `allowBuilds`.

## Accuracy, behavior and limitations

- Exact album edition: favoriting a track on the **deluxe** album does not automatically give credit to the **standard** album or other remasters. The same title may appear under several album IDs; this is intentional to avoid false 100% scores.
- Unknown or inconsistent album track counts show **no percentage** and are excluded from rankings; the dashboard shows a warning. It never guesses a denominator.
- The album count comes from TIDAL's `numberOfTracks` metadata. On a rare album where that differs from its available track listing, the drill-down notes the discrepancy.
- Full favorite-track scanning and album metadata fetches can require many API requests. Three album lookups run concurrently with pacing and retries for rate limits; persistent catalog caching reduces repeat work.
- If pagination fails, results are **not** falsely marked as a complete scan. There is a retryable error message.
- Because TIDALuna and the TIDAL desktop client are in beta, their internal APIs and page layout can change. This version uses the publicly inspectable TIDALuna `TidalApi.getAuthHeaders()` and `TidalApi.queryArgs()` helpers to make authenticated GET calls; compatibility may require updates.
- This version does **not** infer whether you've listened to unfavorited songs, nor does it infer album affection from play counts.

## Privacy

No credentials are embedded in this repository. Authenticated requests go only to `https://desktop.tidal.com/v1` using the existing TIDALuna session. TIDAL cover images are loaded from `resources.tidal.com`. Your liked-track list and calculated results stay in running memory and are cleared by client reload; they are **not exported or transmitted to any third-party server**. `localStorage` saves non-sensitive filter preferences and, for speed, an account-scoped cache of **album catalog metadata** (title, artist, cover ID, track count, type, release date), but never liked-track IDs or authentication tokens.

## Diagnostics

| Symptom | Check |
|---|---|
| Action fails on GitHub | Open the failed Actions run and copy the error. Confirm `.github/workflows/publish.yml` was uploaded and Actions have write permissions. |
| No plugin in store | Confirm the `latest` release has `store.json` and that your custom store URL uses `releases/download/latest/store.json`. |
| No Album Affinity button | Ensure plugin is enabled in Luna Settings, reload TIDAL, and look for errors in the DevTools console. |
| Scan says account ID not found | Sign in again; the TIDAL session structure may have changed. |
| Scan says 401/403 | TIDAL session/authentication may have expired, or that endpoint may have changed. |
| Album looks duplicated | Different editions share a title but have distinct album IDs; this is intentional. |
| Wrong denominator | Compare TIDAL album metadata against track listing; provide a sanitized screenshot or console error for investigation. |

## Development

```shell
pnpm install
pnpm run check
pnpm run build
pnpm run watch
```

The plugin entrypoint is `plugins/AlbumAffinity/src/index.ts`. Pure analysis functions and tests are in `analysis.mjs` and `tests/analysis.test.mjs`. Source is editable TypeScript/JavaScript and the GitHub workflow builds and publishes `dist/*` to a stable `latest` release.

Based on the [official Luna template](https://github.com/Inrixia/luna-template) and [TIDALuna library APIs](https://github.com/Inrixia/TidaLuna). This independent project is not affiliated with TIDAL.
