# Album Affinity for TIDALuna — v0.2.0 beta

Album Affinity analyzes the tracks you've loved in TIDAL and ranks their exact album editions by the percentage of songs you've favorited. This is a standalone [TIDALuna](https://github.com/Inrixia/TidaLuna) plugin based on the [official plugin template](https://github.com/Inrixia/luna-template).

## New in v0.2

- **Completed scan snapshots:** after a full scan, keep album rankings, liked-track matches and the scan date in the TIDAL desktop client's local storage, scoped to the current TIDAL user ID. The next time the plugin starts, it displays saved results immediately, without starting an automatic scan.
- **Resume incomplete scans:** checkpoint album-by-album progress every 20 lookups, on errors and when closing the window. Open the plugin and use **Resume scan** to finish a scan interrupted by a TIDAL restart. An interrupted refresh never overwrites the last completed snapshot.
- **Add an album to TIDAL favorites:** a **♡ Love album** button appears on each album result. Clicking it makes **one authenticated POST** to TIDAL for that album, then changes to **♥ In favorite albums** only when TIDAL reports success. It does **not** offer removal/unfavoriting. Album favorite status is checked on open when the TIDAL API permits it; if that status check fails, you can still try the heart button.
- **Manual new scan:** Refresh always rereads all loved tracks, which picks up changes made since a saved snapshot or a paused scan. Resuming uses the favorite-track snapshot from the time the paused scan began, not new favorites added later.
- **Improved publishing workflow:** GitHub Actions runs the logic tests and compiles with TIDALuna's plugin build script without the unrelated dependency-wide `tsc` step that previously failed on upstream files.

## Existing features

- Complete paginated liked-track scan and grouping by **exact TIDAL album ID** (standard/deluxe versions are separate).
- Affinity percentage and filters: strongest albums, nearly-complete albums, album/artist search, album size, minimum loved tracks and minimum percent.
- Sort by most-loved %, most loved tracks, least remaining, artist, title or newest release.
- Track-by-track liked / unliked breakdown and album links.
- A seven-day album **catalog metadata** cache, to reduce requests during a new or resumed scan.
- Errors and unscorable albums never silently receive guessed scores.

## Updating the existing GitHub repository using only the GitHub website

**Existing repository:** https://github.com/todally/tidaluna-album-affinity

1. Extract the v0.2 ZIP file. Open the extracted folder and note the folder paths below.
2. In your existing GitHub repository, update the following existing files to match the ZIP. On GitHub, open a file, click **Edit (pencil)**, replace its contents with the same file from the ZIP, then **Commit changes**. Alternatively, use **Add file → Upload files**, dragging the nested folders to preserve their paths (do not accidentally create an extra parent folder).
3. Add the one **new** source file `plugins/AlbumAffinity/src/snapshot.mjs` under that exact path, and the new test file `tests/snapshot.test.mjs`. You can create them with **Add file → Create new file**, entering each full path.
4. Update the existing `.github/workflows/publish.yml` if needed. This v0.2 workflow has **no separate Typecheck step**, based on the failure you previously encountered.
5. Go to **Actions** and confirm the latest release workflow succeeds; then refresh the plugin from its existing TIDALuna store.

Files changed or added in v0.2:

```
.github/workflows/publish.yml
package.json
plugins/AlbumAffinity/package.json
plugins/AlbumAffinity/src/api.ts
plugins/AlbumAffinity/src/index.ts
plugins/AlbumAffinity/src/styles.ts
plugins/AlbumAffinity/src/snapshot.mjs          (NEW)
tests/snapshot.test.mjs                          (NEW)
README.md
GITHUB-SETUP.md
```

**Store URL stays the same:**

```
https://github.com/todally/tidaluna-album-affinity/releases/download/latest/store.json
```

The GitHub `/tree/main` and repository landing page URLs are NOT plugin-store URLs. Your existing `latest` release tag will be updated by GitHub Actions.

## First use after upgrading

The v0.1 plugin did **not** persist its completed results, so v0.2 cannot recover a scan completed only in v0.1 memory. Perform **Start new scan** once after upgrading. When it finishes, subsequent TIDAL restarts load the saved rankings without repeating all album queries. If you close halfway through, use **Resume scan** to finish.

Use **Refresh** only when you want your loved tracks rechecked. **Resume scan** continues the album list from when that checkpoint was created, which may be older than your current favorites.

## Privacy and limits

- No API key, password or access token is included in the project or stored by the plugin. Requests use your existing TIDALuna desktop session and target `desktop.tidal.com`; cover artwork uses TIDAL's resources host.
- v0.2 **does** store album rankings, loved-track IDs/titles and associated album information locally on the computer, under account-specific localStorage keys. This is personal music-library data, but **is not uploaded to GitHub or any external plugin service**. The favorites are shared only with TIDAL through its own API. Clearing the desktop browser's site data or using a different TIDAL installation/device clears the cached scan.
- Browser storage can be limited (e.g. full quota, disabled storage). The plugin displays an error if snapshots cannot be saved. The calculations still work in memory.
- Saving an album to favorites is an explicit **write**. It changes your real TIDAL collection, not just a local ranking. No bulk adding, unfavoriting, or automatic favorite changes are performed.
- The legacy TIDAL favorites endpoint may fail (401/403) on some sessions or future TIDAL versions. The button reports a failure and does not falsely claim success; you can open the album in TIDAL and favorite it there.
- One TIDAL album ID is one edition. Different editions do not get automatically merged. "Not favorited" does not mean "disliked."
- Album catalogs, APIs and TIDALuna internals can change. **The new write path and the full plugin have not been verified inside your installed TIDAL desktop client.** Test by clicking the heart on an album you know you have not favorited and checking TIDAL → Collection → Albums.

## Developer checks

```
pnpm install
pnpm run test
pnpm run build
pnpm run watch
```

`pnpm run test` executes the pure JavaScript logic tests, including local snapshot validation. `pnpm run build` uses the official TIDALuna plugin build script. A standalone TypeScript source validation was also performed with local interface stubs; this is not a substitute for the GitHub CI build or live client testing.

This is an independent community plugin, not affiliated with TIDAL or TIDALuna.
