/**
 * TIDAL's existing desktop-session authentication is provided by TIDALuna.
 * Reads use GET; a click on the Love button authorizes a single album-favorite POST.
 * Tokens are never persisted, displayed, exported, or sent to other hosts.
 */
import { TidalApi, redux } from "@luna/lib";
import { extractAlbumTracks } from "./analysis.mjs";

export type JsonObject = Record<string, unknown>;
export type TrackEntry = Record<string, unknown>;
const BASE = "https://desktop.tidal.com/v1";
const PAGE_SIZE = 100;
const MAX_PAGES = 1000;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function activeUserId(): string {
  const state = record(redux.store.getState());
  const session = record(state.session);
  const user = record(state.user);
  const meta = record(user.meta);
  const nestedUser = record(session.user);
  const candidates = [session.userId, session.userID, nestedUser.id, user.userId, user.id, meta.userId, meta.id];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate > 0) return String(candidate);
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) return candidate;
  }
  throw new Error("Your TIDAL account ID was not found in the desktop session. Sign in to TIDAL and reopen Album Affinity.");
}

const delay = (ms: number, signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (signal.aborted) { reject(new DOMException("Canceled", "AbortError")); return; }
  const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, ms);
  const cancel = () => { clearTimeout(timer); reject(new DOMException("Canceled", "AbortError")); };
  signal.addEventListener("abort", cancel, { once: true });
});

export async function getJson(path: string, signal: AbortSignal): Promise<JsonObject> {
  if (!path.startsWith("/")) throw new Error("Invalid API path");
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}${TidalApi.queryArgs()}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Metadata requests stay read-only and on the known TIDAL host.
    const res = await fetch(url, {
      method: "GET",
      headers: await TidalApi.getAuthHeaders(),
      signal,
      cache: "no-store",
    });
    if (res.ok) {
      const json: unknown = await res.json();
      return record(json);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`TIDAL refused access (${res.status}). Check that you are signed in to your TIDAL account.`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      const seconds = Number(res.headers.get("Retry-After"));
      const retryMs = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 6000) : 750 * (attempt + 1);
      await delay(retryMs, signal);
      continue;
    }
    throw new Error(`TIDAL request failed (${res.status}) for ${path.split("?")[0]}.`);
  }
  throw new Error("TIDAL did not respond after retries.");
}

/** Complete paginated list, not just the first 20/100 favorites. */
export async function getFavoriteTracks(signal: AbortSignal, progress: (loaded: number, total: number | null) => void): Promise<TrackEntry[]> {
  const userId = activeUserId();
  const items: TrackEntry[] = [];
  let total: number | null = null;
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await getJson(`/users/${userId}/favorites/tracks?limit=${PAGE_SIZE}&offset=${offset}&order=DATE&orderDirection=DESC`, signal);
    if (!Array.isArray(response.items)) throw new Error("Unexpected favorite-tracks response from TIDAL; the plugin cannot safely analyze it.");
    const batch = response.items.filter((x): x is TrackEntry => x !== null && typeof x === "object");
    const reportedTotal = response.totalNumberOfItems == null ? NaN : Number(response.totalNumberOfItems);
    if (Number.isSafeInteger(reportedTotal) && reportedTotal >= 0) total = reportedTotal;
    if (batch.length === 0) {
      if (total !== null && offset < total) throw new Error(`TIDAL returned an empty favorites page at offset ${offset}; the scan was stopped rather than marked complete.`);
      return items;
    }
    items.push(...batch);
    offset += response.items.length;
    progress(items.length, total);
    if (total !== null && offset >= total) return items;
    // Even a short page can be non-final when TIDAL caps its response size.
    // If no total is supplied, request the next offset until it is empty.
  }
  throw new Error(`More than ${MAX_PAGES} pages of favorite entries were reported. Scan stopped to avoid showing an incomplete total.`);
}

export async function getAlbumMetadata(albumId: string, signal: AbortSignal): Promise<JsonObject> {
  if (!/^\d+$/.test(albumId)) throw new Error("Invalid album ID");
  return getJson(`/albums/${albumId}`, signal);
}

export async function getAlbumTrackList(albumId: string, signal: AbortSignal): Promise<{ id: string; title: string; number?: number }[]> {
  if (!/^\d+$/.test(albumId)) throw new Error("Invalid album ID");
  const tracks: { id: string; title: string; number?: number }[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await getJson(`/albums/${albumId}/tracks?limit=${PAGE_SIZE}&offset=${offset}`, signal);
    if (!Array.isArray(response.items)) throw new Error("Unexpected album-track response from TIDAL.");
    if (!response.items.length) {
      const total = response.totalNumberOfItems == null ? NaN : Number(response.totalNumberOfItems);
      if (Number.isSafeInteger(total) && offset < total) throw new Error("TIDAL returned an incomplete album track list.");
      return tracks;
    }
    tracks.push(...extractAlbumTracks(response));
    offset += response.items.length;
    const total = response.totalNumberOfItems == null ? NaN : Number(response.totalNumberOfItems);
    if (Number.isSafeInteger(total) && offset >= total) return tracks;
    // Without an explicit total, continue until the server returns an empty page.
  }
  throw new Error("The album track list was too long to load completely.");
}

/** A modest concurrency limit protects TIDAL's API from bursts. */
export async function mapConcurrent<T, R>(values: readonly T[], limit: number, work: (value: T, i: number) => Promise<R>,
  onProgress: (completed: number) => void, signal: AbortSignal): Promise<R[]> {
  const results: R[] = new Array(values.length);
  let cursor = 0, completed = 0;
  const worker = async () => {
    while (cursor < values.length) {
      if (signal.aborted) throw new DOMException("Canceled", "AbortError");
      const i = cursor++;
      results[i] = await work(values[i], i);
      completed++;
      onProgress(completed);
      // Gentle pacing; no artificial status about work that is still pending.
      if (cursor < values.length) await delay(140, signal);
    }
  };
  await Promise.all(Array.from({length: Math.min(limit, values.length)}, worker));
  return results;
}

/** Returns null if TIDAL refuses or changes the favorites-ID endpoint.
 *  Null means "unknown", never "nothing is liked". */
export async function getFavoriteAlbumIds(signal: AbortSignal): Promise<Set<string> | null> {
  try {
    const ids = await getJson(`/users/${activeUserId()}/favorites/ids`, signal);
    const albumIds = ids.ALBUM;
    if (!Array.isArray(albumIds)) return null;
    return new Set(albumIds.map(String).filter(id => /^\d+$/.test(id)));
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}

/** One intentional user-initiated TIDAL write: add *one* album to favorites.
 *  Never removes favorites; never retries POST automatically. */
export async function loveAlbum(albumId: string, signal: AbortSignal): Promise<void> {
  if (!/^\d+$/.test(albumId)) throw new Error("Invalid album ID");
  const path = `/users/${activeUserId()}/favorites/albums`;
  const url = `${BASE}${path}?${TidalApi.queryArgs()}`;
  const headers = new Headers(await TidalApi.getAuthHeaders());
  headers.set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
  const form = new URLSearchParams({ albumIds: albumId, onArtifactNotFound: "FAIL" });
  const response = await fetch(url, { method: "POST", headers, body: form, signal });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`TIDAL declined this favorites update (${response.status}). Your login may not allow album changes.`);
    }
    throw new Error(`TIDAL could not add the album (${response.status}). Open the album in TIDAL and try its heart button.`);
  }
}
