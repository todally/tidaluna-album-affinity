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


This is an independent community plugin, not affiliated with TIDAL or TIDALuna.
