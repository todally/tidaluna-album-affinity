/**
 * Album Affinity — TIDALuna renderer plugin.
 * Standalone, read-only overlay: never moves or modifies TIDAL's React nodes.
 * No external backend, logins, tokens in localStorage, or write requests.
 */
import type { LunaUnload } from "@luna/core";
import { activeUserId, getFavoriteTracks, getAlbumMetadata, getAlbumTrackList, mapConcurrent } from "./api";
import { CatalogCache } from "./catalogCache";
import { applyAlbumMetadata, category, compareTrackList, groupFavorites, rankAlbums, affinityPercent } from "./analysis.mjs";
import { css } from "./styles";

export const unloads = new Set<LunaUnload>();

type LovedTrack = { id: string; title: string };
type AlbumRow = {
  id: string; title: string; artist: string; cover: string; type: string; releaseDate: string;
  liked: LovedTrack[]; totalTracks: number | null;
  metadataStatus: "pending" | "ok" | "failed" | "invalid";
};
type Options = {
  sort: "percent" | "loved" | "missing" | "artist" | "album" | "year";
  only: "all" | "strong" | "nearly";
  minLoved: number;
  minTracks: number;
  minPercent: number;
  includeSingles: boolean;
  search: string;
};
const STORAGE = "album-affinity-preferences-v1";
const DEFAULTS: Options = { sort: "percent", only: "all", minLoved: 1, minTracks: 5, minPercent: 0, includeSingles: false, search: "" };
const STRONG_MIN = 5;
const LOG_PREFIX = "[Album Affinity]";

function getPreferences(): Options {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
    const choices: Options = { ...DEFAULTS };
    if (["percent", "loved", "missing", "artist", "album", "year"].includes(saved.sort)) choices.sort = saved.sort;
    if (["all", "strong", "nearly"].includes(saved.only)) choices.only = saved.only;
    for (const key of ["minLoved", "minTracks", "minPercent"] as const) {
      const n = Number(saved[key]);
      if (Number.isSafeInteger(n) && n >= 0 && n <= 100) choices[key] = n;
    }
    choices.includeSingles = saved.includeSingles === true;
    return choices;
  } catch { return { ...DEFAULTS }; }
}
function savePreferences(opts: Options): void {
  try { localStorage.setItem(STORAGE, JSON.stringify({ ...opts, search: "" })); } catch { /* optional */ }
}
function make<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", label?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (label !== undefined) el.textContent = label;
  return el;
}
function byId<T extends HTMLElement>(root: ParentNode, id: string): T {
  const element = root.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Album Affinity UI missing ${id}`);
  return element;
}
function coverUrl(cover: string): string | null {
  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(cover)) {
    return `https://resources.tidal.com/images/${cover.replaceAll("-", "/")}/160x160.jpg`;
  }
  // Only TIDAL's content host is permitted, not arbitrary cover URLs.
  if (/^https:\/\/resources\.tidal\.com\//.test(cover)) return cover;
  return null;
}

class AlbumAffinityUI {
  private launch: HTMLButtonElement;
  private shade: HTMLDivElement | null = null;
  private dialog: HTMLDivElement | null = null;
  private stylesheet: HTMLStyleElement;
  private beforeOpenFocus: HTMLElement | null = null;
  private currentScan: AbortController | null = null;
  private detailController: AbortController | null = null;
  private generation = 0;
  private busy = false;
  private scanCompleted = false;
  private albums: AlbumRow[] = [];
  private favoritesLoaded = 0;
  private unmatched = 0;
  private processed = 0;
  private failures = 0;
  private status = "Open Album Affinity and select Refresh to scan your liked tracks.";
  private error = "";
  private options: Options = getPreferences();
  private shown = 80;
  private detailCache = new Map<string, { id: string; title: string; number?: number }[]>();

  constructor() {
    this.stylesheet = make("style");
    this.stylesheet.id = "aa-style";
    this.stylesheet.textContent = css;
    document.head.appendChild(this.stylesheet);
    this.launch = make("button", "", "♥ Album Affinity");
    this.launch.id = "aa-launch";
    this.launch.type = "button";
    this.launch.title = "Analyze your liked tracks by album";
    this.launch.setAttribute("aria-haspopup", "dialog");
    this.launch.addEventListener("click", () => this.open());
    document.body.appendChild(this.launch);
  }

  private keydown = (event: KeyboardEvent): void => {
    if (this.dialog && event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  };

  private open(): void {
    if (this.shade) return;
    this.beforeOpenFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.shade = make("div");
    this.shade.id = "aa-backdrop";
    this.shade.addEventListener("click", (e) => { if (e.target === this.shade) this.close(); });
    this.dialog = make("div");
    this.dialog.id = "aa-dialog";
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-modal", "true");
    this.dialog.setAttribute("aria-labelledby", "aa-title");
    // All markup here is fixed, static UI. TIDAL titles/artist metadata use textContent below.
    this.dialog.innerHTML = `
      <header id="aa-head">
        <div><h2 id="aa-title">♥ Album Affinity</h2><p>Find your favorite albums from the tracks you've loved in TIDAL</p></div>
        <div id="aa-head-actions"><button id="aa-refresh" type="button" class="aa-primary">↻ Refresh</button>
        <button id="aa-close" type="button" class="aa-icon" title="Close" aria-label="Close Album Affinity">×</button></div>
      </header>
      <div class="aa-stats" aria-live="polite">
        <div class="aa-stat"><b id="aa-favorite-count">—</b><span>Liked tracks scanned</span></div>
        <div class="aa-stat"><b id="aa-album-count">—</b><span>Distinct albums found</span></div>
        <div class="aa-stat"><b id="aa-strong-count">—</b><span>Strong favorites (80%+, 5+ likes)</span></div>
        <div class="aa-stat"><b id="aa-nearly-count">—</b><span>Nearly complete (70–99%)</span></div>
      </div>
      <div id="aa-status" class="aa-status" role="status" aria-live="polite"></div>
      <div id="aa-warning" class="aa-warning" role="alert" hidden></div>
      <div class="aa-filters">
        <div class="aa-filter aa-search"><label for="aa-search">Find artist or album</label><input id="aa-search" type="search" placeholder="Search albums…"></div>
        <div class="aa-filter"><label for="aa-sort">Sort albums</label>
          <select id="aa-sort"><option value="percent">Highest % loved</option><option value="loved">Most liked tracks</option>
            <option value="missing">Fewest remaining</option><option value="artist">Artist A–Z</option>
            <option value="album">Album A–Z</option><option value="year">Newest release</option></select></div>
        <div class="aa-filter"><label for="aa-min-loved">Min. liked songs</label><input id="aa-min-loved" type="number" min="1" max="100" step="1"></div>
        <div class="aa-filter"><label for="aa-min-tracks">Min. album tracks</label><input id="aa-min-tracks" type="number" min="1" max="100" step="1"></div>
        <div class="aa-filter"><label for="aa-min-percent">Min. percent</label>
          <select id="aa-min-percent"><option value="0">0%</option><option value="25">25%</option><option value="40">40%</option>
            <option value="60">60%</option><option value="70">70%</option><option value="80">80%</option><option value="90">90%</option></select></div>
        <label class="aa-checkbox"><input id="aa-singles" type="checkbox"> Include singles / EPs</label>
      </div>
      <div class="aa-tabs" role="tablist" aria-label="Album views">
        <button class="aa-tab" role="tab" data-aa-tab="all">All matching albums</button>
        <button class="aa-tab" role="tab" data-aa-tab="strong">♥ Strong favorites</button>
        <button class="aa-tab" role="tab" data-aa-tab="nearly">◌ Nearly complete</button>
      </div>
      <main class="aa-results" id="aa-results"><div class="aa-empty">Select Refresh to scan your liked tracks.</div></main>
      <footer class="aa-footer"><span>Read-only · Same TIDAL login · Exact album editions</span><span>Not liked ≠ disliked</span></footer>`;
    this.shade.appendChild(this.dialog);
    document.body.appendChild(this.shade);
    document.addEventListener("keydown", this.keydown, true);
    byId<HTMLButtonElement>(this.dialog, "aa-close").addEventListener("click", () => this.close());
    byId<HTMLButtonElement>(this.dialog, "aa-refresh").addEventListener("click", () => void this.scan());
    const controls: { id: string; key: keyof Options; event: "input" | "change"; read: (el: HTMLInputElement | HTMLSelectElement) => unknown }[] = [
      {id:"aa-sort",key:"sort",event:"change",read:el=>el.value},
      {id:"aa-search",key:"search",event:"input",read:el=>el.value},
      {id:"aa-min-loved",key:"minLoved",event:"change",read:el=>Math.max(1,Math.min(100,Number(el.value)||1))},
      {id:"aa-min-tracks",key:"minTracks",event:"change",read:el=>Math.max(1,Math.min(100,Number(el.value)||1))},
      {id:"aa-min-percent",key:"minPercent",event:"change",read:el=>Number(el.value)},
      {id:"aa-singles",key:"includeSingles",event:"change",read:el=>(el as HTMLInputElement).checked},
    ];
    for (const { id, key, event, read } of controls) {
      const el = byId<HTMLInputElement | HTMLSelectElement>(this.dialog, id);
      if (key === "includeSingles") (el as HTMLInputElement).checked = this.options.includeSingles;
      else el.value = String(this.options[key]);
      el.addEventListener(event, () => {
        // All values come from our own explicitly constrained form controls.
        (this.options as unknown as Record<string, unknown>)[key] = read(el);
        this.shown = 80;
        savePreferences(this.options);
        this.renderResults();
      });
    }
    for (const tab of this.dialog.querySelectorAll<HTMLButtonElement>("[data-aa-tab]")) {
      tab.addEventListener("click", () => {
        const value = tab.dataset.aaTab;
        if (value === "all" || value === "strong" || value === "nearly") {
          this.options.only = value;
          this.shown = 80;
          savePreferences(this.options);
          this.renderResults();
        }
      });
    }
    this.paintStats();
    this.renderResults();
    byId<HTMLButtonElement>(this.dialog, "aa-close").focus();
    if (!this.scanCompleted && !this.busy) void this.scan();
  }

  private close(): void {
    if (!this.shade) return;
    this.currentScan?.abort();
    this.detailController?.abort();
    this.detailController = null;
    if (this.busy) this.scanCompleted = false;
    this.generation++;
    this.busy = false;
    this.shade.remove();
    this.shade = this.dialog = null;
    document.removeEventListener("keydown", this.keydown, true);
    this.beforeOpenFocus?.focus();
    this.beforeOpenFocus = null;
  }

  private paintStats(): void {
    if (!this.dialog) return;
    const successful = this.albums.filter(a => a.metadataStatus === "ok");
    byId(this.dialog, "aa-favorite-count").textContent = this.favoritesLoaded ? this.favoritesLoaded.toLocaleString() : "—";
    byId(this.dialog, "aa-album-count").textContent = this.albums.length ? this.albums.length.toLocaleString() : "—";
    byId(this.dialog, "aa-strong-count").textContent = String(successful.filter(a => category(a,STRONG_MIN)==="strong").length);
    byId(this.dialog, "aa-nearly-count").textContent = String(successful.filter(a => {
      const p = affinityPercent(a);
      return p !== null && p >= 70 && p < 100 && a.liked.length >= 3;
    }).length);
    byId(this.dialog, "aa-status").textContent = this.status;
    byId<HTMLButtonElement>(this.dialog, "aa-refresh").disabled = this.busy;
    byId<HTMLButtonElement>(this.dialog, "aa-refresh").textContent = this.busy ? "Scanning…" : "↻ Refresh";
    const warning = byId(this.dialog, "aa-warning");
    const notices: string[] = [];
    if (this.error) notices.push(this.error);
    if (this.failures) notices.push(`${this.failures} album(s) could not be scored. Percentages for those albums are excluded, not guessed.`);
    if (this.unmatched) notices.push(`${this.unmatched} favorites lacked usable album/track IDs and were not included.`);
    warning.textContent = notices.join(" ");
    warning.hidden = !notices.length;
  }

  private async scan(): Promise<void> {
    if (!this.dialog || this.busy) return;
    this.currentScan?.abort();
    this.detailController?.abort();
    this.detailController = null;
    this.scanCompleted = false;
    this.currentScan = new AbortController();
    const signal = this.currentScan.signal;
    const generation = ++this.generation;
    this.busy = true;
    this.error = "";
    this.failures = 0;
    this.processed = 0;
    this.favoritesLoaded = 0;
    this.unmatched = 0;
    this.albums = [];
    this.detailCache.clear();
    this.shown = 80;
    this.status = "Reading all pages of your liked tracks…";
    this.paintStats();
    this.renderResults();
    try {
      const items = await getFavoriteTracks(signal, (loaded, total) => {
        if (signal.aborted || generation !== this.generation) return;
        this.status = `Reading liked tracks: ${loaded.toLocaleString()}${total !== null ? ` / ${total.toLocaleString()}` : ""} loaded…`;
        this.paintStats();
      });
      if (signal.aborted || generation !== this.generation) return;
      const grouped = groupFavorites(items);
      this.albums = grouped.groups as AlbumRow[];
      this.favoritesLoaded = grouped.favoriteCount;
      this.unmatched = grouped.ungrouped;
      this.status = `Checking total track counts for ${this.albums.length.toLocaleString()} albums…`;
      this.paintStats();
      const cache = new CatalogCache(activeUserId());
      const scored = await mapConcurrent(this.albums, 3, async (album, i) => {
        try {
          let metadata = cache.get(album.id);
          if (!metadata) {
            metadata = await getAlbumMetadata(album.id, signal);
            cache.set(album.id, metadata);
          }
          const updated = applyAlbumMetadata(album, metadata) as AlbumRow;
          if (!signal.aborted && generation === this.generation) this.albums[i] = updated;
          return updated;
        } catch (error) {
          if (signal.aborted) throw error;
          const failed = { ...album, metadataStatus: "failed" as const };
          if (!signal.aborted && generation === this.generation) this.albums[i] = failed;
          return failed;
        }
      }, (completed) => {
        if (signal.aborted || generation !== this.generation) return;
        this.processed = completed;
        this.status = `Scoring albums: ${completed.toLocaleString()} / ${this.albums.length.toLocaleString()} checked…`;
        this.paintStats();
        if (completed % 12 === 0) this.renderResults();
      }, signal);
      if (signal.aborted || generation !== this.generation) return;
      this.albums = scored;
      cache.save();
      this.failures = scored.filter(a => a.metadataStatus !== "ok").length;
      this.scanCompleted = true;
      this.status = `Scan finished: ${this.favoritesLoaded.toLocaleString()} liked tracks across ${this.albums.length.toLocaleString()} album editions.`;
    } catch (error) {
      if (signal.aborted || generation !== this.generation) return;
      this.scanCompleted = false;
      this.error = error instanceof Error ? error.message : "Unable to read your TIDAL collection.";
      this.status = "The scan could not be completed. Select Refresh to retry.";
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        this.paintStats();
        this.renderResults();
      }
    }
  }

  private renderResults(): void {
    if (!this.dialog) return;
    this.paintStats();
    this.dialog.querySelectorAll<HTMLButtonElement>("[data-aa-tab]").forEach(tab => {
      tab.setAttribute("aria-selected", String(tab.dataset.aaTab === this.options.only));
    });
    const root = byId(this.dialog, "aa-results");
    root.replaceChildren();
    const matching = rankAlbums(this.albums, { ...this.options, strongMin: STRONG_MIN }) as AlbumRow[];
    const count = make("p", "aa-count", `${matching.length.toLocaleString()} matching albums${this.busy ? " (scanning…)" : ""}`);
    root.append(count);
    if (!matching.length) {
      const message = this.busy ? "Reading your collection…" : this.albums.length
        ? "No albums match these filters. Try reducing the minimum track count or including singles / EPs."
        : this.error || "No results yet. Select Refresh to analyze your liked tracks.";
      root.append(make("div", "aa-empty", message));
      return;
    }
    for (const album of matching.slice(0,this.shown)) root.append(this.createCard(album));
    if (matching.length > this.shown) {
      const more = make("button", "aa-load", `Show more albums (${matching.length - this.shown} remaining)`);
      more.type = "button";
      more.addEventListener("click", () => { this.shown += 80; this.renderResults(); });
      root.append(more);
    }
  }

  private createCard(album: AlbumRow): HTMLElement {
    const card = make("article", "aa-card");
    const artwork = make("img", "aa-art") as HTMLImageElement;
    artwork.alt = "";
    artwork.loading = "lazy";
    const url = coverUrl(album.cover);
    if (url) artwork.src = url;
    artwork.onerror = () => artwork.removeAttribute("src");
    card.append(artwork);
    const description = make("div");
    const title = make("div", "aa-name");
    const link = make("a", "", album.title) as HTMLAnchorElement;
    link.href = `/album/${encodeURIComponent(album.id)}`;
    link.title = "Open album in TIDAL";
    title.append(link);
    if (category(album,STRONG_MIN) === "strong") title.append(make("span", "aa-tag", "♥ Strong favorite"));
    description.append(title, make("div","aa-artist",`${album.artist}${album.releaseDate ? ` · ${album.releaseDate.slice(0,4)}` : ""}`));
    const pct = affinityPercent(album) ?? 0;
    const meter = make("div","aa-meter");
    const fill = make("span");
    fill.style.width = `${pct}%`;
    meter.append(fill);
    description.append(meter);
    description.append(make("div", "aa-sub", `${album.liked.length} loved · ${album.totalTracks! - album.liked.length} not favorited · ${album.totalTracks} total tracks`));
    const details = make("button", "aa-details-toggle", "Show liked / unliked tracks");
    details.type = "button";
    details.setAttribute("aria-expanded", "false");
    details.addEventListener("click", () => void this.toggleBreakdown(album, card, details));
    description.append(details);
    card.append(description);
    const stat = make("div", "aa-score", `${pct}%`);
    stat.append(make("small", "", `${album.liked.length} / ${album.totalTracks}`));
    card.append(stat);
    return card;
  }

  private async toggleBreakdown(album: AlbumRow, card: HTMLElement, button: HTMLButtonElement): Promise<void> {
    const existing = card.querySelector(".aa-breakdown");
    if (existing) {
      existing.remove();
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Show liked / unliked tracks";
      return;
    }
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Hide track breakdown";
    const content = make("div", "aa-breakdown", "Loading album tracklist…");
    card.append(content);
    try {
      if (!this.detailCache.has(album.id)) {
        this.detailController ??= new AbortController();
        const tracks = await getAlbumTrackList(album.id, this.detailController.signal);
        this.detailCache.set(album.id, tracks);
      }
      if (!content.isConnected) return;
      const list = compareTrackList(album, this.detailCache.get(album.id)!) as {id:string;title:string;loved:boolean;number?:number}[];
      content.replaceChildren();
      content.append(make("div", "aa-sub", "✓ = in your liked Tracks; — = not favorited (not necessarily disliked)."));
      for (const track of list) {
        const line = make("div", "aa-track");
        line.append(make("span", "", track.loved ? "♥" : "—"), document.createTextNode(track.title));
        content.append(line);
      }
      if (!list.length) content.append(make("div", "aa-sub", "TIDAL returned no tracks for this album."));
      if (list.length !== album.totalTracks) content.append(make("div", "aa-sub", "TIDAL's track listing differs from the album's reported total. The percentage uses the album metadata count."));
    } catch (error) {
      if (!content.isConnected) return;
      content.textContent = error instanceof Error ? `Tracklist unavailable: ${error.message}` : "Tracklist unavailable.";
    }
  }

  destroy(): void {
    this.close();
    this.currentScan?.abort();
    this.detailController?.abort();
    this.launch.remove();
    this.stylesheet.remove();
  }
}

let instance: AlbumAffinityUI | null = null;
function attach(): void {
  if (instance || !document.body) return;
  try { instance = new AlbumAffinityUI(); }
  catch (error) { console.warn(LOG_PREFIX, "Could not initialize interface", error instanceof Error ? error.message : "Unknown error"); }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attach, { once: true });
  unloads.add(() => document.removeEventListener("DOMContentLoaded", attach));
} else attach();
unloads.add(() => { instance?.destroy(); instance = null; });
