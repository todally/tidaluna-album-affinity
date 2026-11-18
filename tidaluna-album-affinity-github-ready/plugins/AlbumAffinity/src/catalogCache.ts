/** Stores catalog facts only. Never stores favorite track lists or credentials. */
import type { JsonObject } from "./api";
const STORAGE_PREFIX = "album-affinity-catalog-v1:";
const MAX_ENTRIES = 6000;
const TTL_MS = 1000 * 60 * 60 * 24 * 7;
type Row = { checked: number; metadata: JsonObject };
export class CatalogCache {
  private records = new Map<string, Row>();
  private key: string;

  constructor(accountId: string) {
    this.key = `${STORAGE_PREFIX}${accountId}`;
    try {
      const value: unknown = JSON.parse(localStorage.getItem(this.key) ?? "null");
      if (Array.isArray(value)) {
        for (const item of value) {
          if (!Array.isArray(item) || item.length !== 2) continue;
          const [id, row] = item;
          if (typeof id !== "string" || !/^\d+$/.test(id)) continue;
          if (!row || typeof row !== "object" || typeof row.checked !== "number" || typeof row.metadata !== "object") continue;
          if (Date.now() - row.checked > TTL_MS || row.checked > Date.now()) continue;
          this.records.set(id, row);
        }
      }
    } catch { /* local storage is optional */ }
  }

  get(albumId: string): JsonObject | undefined { return this.records.get(albumId)?.metadata; }

  set(albumId: string, metadata: JsonObject): void {
    const total = Number(metadata.numberOfTracks);
    if (!Number.isSafeInteger(total) || total <= 0) return;
    this.records.set(albumId, {
      checked: Date.now(),
      metadata: {
        numberOfTracks: total,
        title: typeof metadata.title === "string" ? metadata.title : "",
        cover: typeof metadata.cover === "string" ? metadata.cover : "",
        type: typeof metadata.type === "string" ? metadata.type : "",
        releaseDate: typeof metadata.releaseDate === "string" ? metadata.releaseDate : "",
        artist: metadata.artist && typeof metadata.artist === "object" ?
          { name: typeof (metadata.artist as JsonObject).name === "string" ? (metadata.artist as JsonObject).name : "" } : undefined,
      },
    });
  }

  save(): void {
    try {
      const recent = [...this.records].sort((a,b) => b[1].checked - a[1].checked).slice(0,MAX_ENTRIES);
      localStorage.setItem(this.key, JSON.stringify(recent));
    } catch { /* quota exceeded or storage blocked: scanning still works */ }
  }
}
