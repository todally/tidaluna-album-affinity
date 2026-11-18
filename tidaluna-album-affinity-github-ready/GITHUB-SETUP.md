# Publish this plugin from your GitHub account

1. Extract `tidaluna-album-affinity-github-ready.zip` to a new folder.
2. Create a new GitHub repository named **tidaluna-album-affinity** (do not overwrite your existing playlist sorter).
3. Use GitHub Desktop to add the extracted folder, commit, and publish to your account (`todally`). GitHub Desktop is recommended because hidden `.github` files and nested `plugins/` folders must be preserved.
4. Go to **Settings → Actions → General → Workflow permissions → Read and write permissions**; save.
5. Go to **Actions**. If no workflow ran, open **Build and publish Album Affinity → Run workflow**.
6. Once the workflow has a green check and the GitHub **Releases** page shows the `latest` release, copy this store URL into **TIDAL → Luna Settings → Plugin Store → Install from URL**:

   `https://github.com/todally/tidaluna-album-affinity/releases/download/latest/store.json`

7. Install and enable **Album Affinity**, reload TIDAL, and click the **♥ Album Affinity** button near the lower right.

The repository page URL (`https://github.com/todally/tidaluna-album-affinity`) and `/tree/main` URL are **not** plugin-store URLs. The release URL will not exist until the build runs.

If a build fails, open the failed job and copy the first red error message. This project has not been exercised in a real TIDAL client; report any missing-account-ID, 401/403, or unexpected API response messages when testing.
