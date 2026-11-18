/** Pure Album Affinity data processing. No credentials, DOM, or network calls. */

const obj = (value) => value && typeof value === "object" ? value : {};
const text = (value) => typeof value === "string" ? value.trim() : "";
const id = (value) => value === null || value === undefined ? "" : String(value).trim();

export function unwrapFavoriteTrack(entry) {
  const value = obj(entry);
  const track = obj(value.item?.item ?? value.item ?? value.track ?? value);
  const album = obj(track.album);
  if (!id(track.id) || !id(album.id)) return null;
  return {
    id: id(track.id),
    title: text(track.title) || "Untitled track",
    albumId: id(album.id),
    albumTitle: text(album.title) || "Untitled album",
    artist: text(album.artist?.name) || text(track.artist?.name) ||
      text(album.artists?.[0]?.name) || text(track.artists?.[0]?.name) || "Unknown artist",
    cover: text(album.cover),
    albumType: text(album.type).toUpperCase(),
    releaseDate: text(album.releaseDate),
    duration: typeof track.duration === "number" ? track.duration : undefined,
  };
}

/** Group each unique favorite track by the exact album edition ID. */
export function groupFavorites(rawItems) {
  const groups = new Map();
  const seen = new Set();
  let ungrouped = 0;
  for (const item of rawItems) {
    const track = unwrapFavoriteTrack(item);
    if (!track) { ungrouped++; continue; }
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    let group = groups.get(track.albumId);
    if (!group) {
      group = {
        id: track.albumId,
        title: track.albumTitle,
        artist: track.artist,
        cover: track.cover,
        type: track.albumType,
        releaseDate: track.releaseDate,
        liked: [],
        totalTracks: null,
        metadataStatus: "pending",
      };
      groups.set(track.albumId, group);
    }
    group.liked.push({ id: track.id, title: track.title });
  }
  return { groups: [...groups.values()], favoriteCount: seen.size, ungrouped };
}

export function applyAlbumMetadata(group, data) {
  const album = obj(data);
  const total = Number(album.numberOfTracks);
  if (!Number.isSafeInteger(total) || total <= 0 || total < group.liked.length) {
    return { ...group, totalTracks: null, metadataStatus: "invalid" };
  }
  return {
    ...group,
    title: text(album.title) || group.title,
    artist: text(album.artist?.name) || text(album.artists?.[0]?.name) || group.artist,
    cover: text(album.cover) || group.cover,
    type: text(album.type).toUpperCase() || group.type,
    releaseDate: text(album.releaseDate) || group.releaseDate,
    totalTracks: total,
    metadataStatus: "ok",
  };
}

export function affinityPercent(album) {
  if (album.metadataStatus !== "ok" || !album.totalTracks) return null;
  return Math.round((album.liked.length / album.totalTracks) * 100);
}

export function category(album, strongMin = 5) {
  const p = affinityPercent(album);
  if (p === null) return "unavailable";
  if (p >= 80 && album.liked.length >= strongMin) return "strong";
  if (p >= 60) return "likely";
  if (p >= 40) return "explore";
  return "few";
}

export function isNearlyComplete(album) {
  const p = affinityPercent(album);
  return p !== null && p >= 70 && p < 100 && album.liked.length >= 3;
}

/** All sorting/filtering is local; it does not alter TIDAL's collection. */
export function rankAlbums(groups, opts = {}) {
  const { minLoved = 1, minTracks = 5, minPercent = 0,
    includeSingles = false, only = "all", sort = "percent", search = "", strongMin = 5 } = opts;
  const query = String(search).toLocaleLowerCase().trim();
  const filtered = groups.filter((album) => {
    const percentage = affinityPercent(album);
    if (album.liked.length < minLoved || percentage === null || percentage < minPercent) return false;
    if (album.totalTracks < minTracks) return false;
    if (!includeSingles && (album.type === "SINGLE" || album.type === "EP")) return false;
    if (query && !`${album.title} ${album.artist}`.toLocaleLowerCase().includes(query)) return false;
    if (only === "strong" && category(album, strongMin) !== "strong") return false;
    if (only === "nearly" && !isNearlyComplete(album)) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    const pctDelta = affinityPercent(b) - affinityPercent(a);
    const lovedDelta = b.liked.length - a.liked.length;
    const remainingDelta = (a.totalTracks - a.liked.length) - (b.totalTracks - b.liked.length);
    let primary = 0;
    switch (sort) {
      case "loved": primary = lovedDelta; break;
      case "missing": primary = remainingDelta; break;
      case "artist": primary = a.artist.localeCompare(b.artist); break;
      case "album": primary = a.title.localeCompare(b.title); break;
      case "year": primary = (b.releaseDate || "").localeCompare(a.releaseDate || ""); break;
      default: primary = pctDelta;
    }
    return primary || pctDelta || lovedDelta || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

/** Normalize the legacy /v1/albums/{id}/tracks response. */
export function extractAlbumTracks(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((entry) => {
    const track = obj(entry.item ?? entry);
    return { id: id(track.id), title: text(track.title) || "Untitled track", number: track.trackNumber };
  }).filter((t) => t.id);
}

export function compareTrackList(album, albumTracks) {
  const favorites = new Set(album.liked.map((track) => track.id));
  return albumTracks.map((track) => ({ ...track, loved: favorites.has(track.id) }));
}
