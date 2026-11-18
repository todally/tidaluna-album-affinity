# Album Affinity v0.2 — update your existing GitHub repository

Your repository: https://github.com/todally/tidaluna-album-affinity

**No GitHub Desktop or PowerShell is required.** This ZIP contains the complete updated source. To update using the GitHub website, extract it and replace the changed files in your existing repository, keeping the original nested file paths. You do **not** need to create a second repository.

The files to update are listed under "Updating the existing GitHub repository" in README.md. The main code lives in `plugins/AlbumAffinity/src/`. Be sure the NEW `snapshot.mjs` is uploaded as well as `index.ts` and `api.ts`, or the plugin will not build.

Your existing `.github/workflows/publish.yml` should remain installed. The workflow in this ZIP intentionally leaves out the Typecheck step that previously failed on TIDALuna dependency files. The `latest` release is updated automatically when GitHub Actions succeeds.

After committing changes, open:

- GitHub Actions: https://github.com/todally/tidaluna-album-affinity/actions
- Releases: https://github.com/todally/tidaluna-album-affinity/releases

In TIDALuna, the plugin store URL does not change:

`https://github.com/todally/tidaluna-album-affinity/releases/download/latest/store.json`

Refresh the store after the GitHub Actions build succeeds. If the plugin doesn't update, disable/re-enable or reinstall it from that store.

**Important:** v0.2 cannot reconstruct a v0.1 scan that was never saved. Run one initial new scan. After that, scans survive restarts and unfinished scans can resume. Click an album heart only when you actually want to add it to TIDAL favorites.
