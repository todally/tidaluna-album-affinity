/**
 * Album Affinity v0.2 local snapshots. No credentials, network or browser APIs.
 * A completed snapshot and an in-progress checkpoint have separate keys, so
 * a canceled/failed refresh never destroys the last successful result.
 */
export const SCAN_SCHEMA = 2;
const PREFIX = "album-affinity-v2:";
const MAX_ALBUMS = 15000;
const MAX_LOVED = 75000;
const MAX_CHARS = 500;

export function scanStorageKey(accountId, kind) {
  if (!/^\d+$/.test(String(accountId)) || !["completed", "checkpoint"].includes(kind)) {
    throw new Error("Invalid scan storage key");
  }
  return `${PREFIX}${accountId}:${kind}`;
}

const shortText = (v, max = MAX_CHARS) => typeof v === "string" ? v.slice(0, max) : "";

function cleanAlbum(album) {
  if (!album || typeof album !== "object" || !/^\d+$/.test(String(album.id))) return null;
  if (!Array.isArray(album.liked) || album.liked.length > MAX_LOVED) return null;
  const liked = [];
  const seen = new Set();
  for (const track of album.liked) {
    if (!track || !/^\d+$/.test(String(track.id))) return null;
    const id = String(track.id);
    if (seen.has(id)) continue;
    seen.add(id);
    liked.push({ id, title: shortText(track.title) });
  }
  const statuses = ["pending", "ok", "failed", "invalid"];
  const metadataStatus = statuses.includes(album.metadataStatus) ? album.metadataStatus : "pending";
  const totalTracks = Number.isSafeInteger(album.totalTracks) && album.totalTracks > 0 ? album.totalTracks : null;
  return {
    id: String(album.id), title: shortText(album.title), artist: shortText(album.artist),
    cover: shortText(album.cover), type: shortText(album.type), releaseDate: shortText(album.releaseDate),
    liked, totalTracks,
    metadataStatus: metadataStatus === "ok" && (!totalTracks || totalTracks < liked.length) ? "invalid" : metadataStatus,
  };
}

/** Return null for corrupt, incompatible or another-account snapshots. */
export function normalizeScan(value, accountId, expectedKind) {
  if (!value || typeof value !== "object" || value.schema !== SCAN_SCHEMA ||
      value.accountId !== String(accountId) || value.kind !== expectedKind ||
      !Number.isSafeInteger(value.savedAt) || value.savedAt < 0 ||
      value.savedAt > Date.now() + 86400000 ||
      !Number.isSafeInteger(value.favoriteCount) || value.favoriteCount < 0 ||
      !Number.isSafeInteger(value.ungrouped) || value.ungrouped < 0 ||
      !Array.isArray(value.albums) || value.albums.length > MAX_ALBUMS) return null;
  const albums = [];
  let totalLoved = 0;
  const uniqueIds = new Set();
  for (const input of value.albums) {
    const album = cleanAlbum(input);
    if (!album || uniqueIds.has(album.id)) return null;
    uniqueIds.add(album.id);
    totalLoved += album.liked.length;
    if (totalLoved > MAX_LOVED) return null;
    albums.push(album);
  }
  if (expectedKind === "completed" && albums.some(a => a.metadataStatus === "pending")) return null;
  return {
    schema: SCAN_SCHEMA, kind: expectedKind, accountId: String(accountId),
    savedAt: value.savedAt, favoriteCount: value.favoriteCount,
    ungrouped: value.ungrouped, albums,
  };
}

export function newScan(accountId, kind, albums, favoriteCount, ungrouped, savedAt = Date.now()) {
  return normalizeScan({ schema: SCAN_SCHEMA, accountId: String(accountId), kind, savedAt, albums,
    favoriteCount, ungrouped }, accountId, kind);
}

export function checkedAlbumCount(albums) {
  return albums.filter(a => a.metadataStatus !== "pending").length;
}

/** Storage is injected for tests; browser instance passes localStorage. */
export class ScanStore {
  constructor(accountId, storage) {
    this.accountId = String(accountId);
    this.storage = storage;
  }
  read(kind) {
    try {
      const raw = this.storage.getItem(scanStorageKey(this.accountId, kind));
      return raw ? normalizeScan(JSON.parse(raw), this.accountId, kind) : null;
    } catch { return null; }
  }
  write(kind, albums, favoriteCount, ungrouped) {
    try {
      const scan = newScan(this.accountId, kind, albums, favoriteCount, ungrouped);
      if (!scan) return false;
      this.storage.setItem(scanStorageKey(this.accountId, kind), JSON.stringify(scan));
      return true;
    } catch { return false; }
  }
  clearCheckpoint() {
    try { this.storage.removeItem(scanStorageKey(this.accountId, "checkpoint")); } catch { /* optional */ }
  }
}
