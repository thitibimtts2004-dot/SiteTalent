/**
 * Read-through cache for Firestore reads (server-only).
 *
 * Why: the free Spark plan allows 50k document reads/day, and one uncached
 * dashboard render reads every worker doc (~1.5k). This cache makes a repeat
 * render cost 0 reads.
 *
 * - Memory layer lives on globalThis, so it survives dev Fast Refresh.
 * - Disk layer (.next/cache/sitetalent-data/, git-ignored) survives a server
 *   restart. Only used for the LIVE admin db, never for injected test fakes.
 * - In-flight dedupe: concurrent renders share one Firestore call.
 * - Stale-on-error: if Firestore fails (e.g. RESOURCE_EXHAUSTED) and any copy
 *   exists, serve it (whatever its age) instead of crashing the page.
 *
 * Entries are scoped per Firestore instance (WeakMap), so each fake db in the
 * unit tests gets its own isolated cache.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Entry {
  value: unknown;
  at: number; // epoch ms when loaded
}

interface Store {
  mem: WeakMap<object, Map<string, Entry>>;
  inflight: WeakMap<object, Map<string, Promise<unknown>>>;
}

const g = globalThis as { __siteTalentDataCache?: Store };
const store: Store = (g.__siteTalentDataCache ??= {
  mem: new WeakMap(),
  inflight: new WeakMap(),
});

const DISK_DIR = path.join(process.cwd(), ".next", "cache", "sitetalent-data");

function mapFor<V>(wm: WeakMap<object, Map<string, V>>, owner: object): Map<string, V> {
  let m = wm.get(owner);
  if (!m) {
    m = new Map();
    wm.set(owner, m);
  }
  return m;
}

function diskFile(key: string): string {
  return path.join(DISK_DIR, createHash("sha1").update(key).digest("hex") + ".json");
}

function readDisk(key: string): Entry | undefined {
  try {
    const e = JSON.parse(readFileSync(diskFile(key), "utf-8")) as Entry & { key: string };
    return e.key === key ? { value: e.value, at: e.at } : undefined;
  } catch {
    return undefined; // missing or corrupt → treat as a miss
  }
}

function writeDisk(key: string, e: Entry): void {
  try {
    mkdirSync(DISK_DIR, { recursive: true });
    writeFileSync(diskFile(key), JSON.stringify({ key, ...e }));
  } catch {
    // disk is an optimisation only (e.g. read-only FS) — memory still works
  }
}

export interface CacheOptions {
  ttlMs: number; // Infinity = never expires (content is immutable for this key)
  persist: boolean; // also keep a copy on disk
}

/**
 * Return the cached value for `key`, loading it with `loader` on a miss or
 * after `ttlMs`. `owner` is the Firestore instance the value came from.
 */
export async function cached<T>(
  owner: object,
  key: string,
  opts: CacheOptions,
  loader: () => Promise<T>,
): Promise<T> {
  const mem = mapFor(store.mem, owner);
  let hit = mem.get(key);
  if (!hit && opts.persist) {
    hit = readDisk(key);
    if (hit) mem.set(key, hit);
  }
  if (hit && Date.now() - hit.at < opts.ttlMs) return hit.value as T;

  const inflight = mapFor(store.inflight, owner);
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const stale = hit;
  const p = (async () => {
    try {
      const value = await loader();
      const e = { value, at: Date.now() };
      mem.set(key, e);
      if (opts.persist) writeDisk(key, e);
      return value;
    } catch (err) {
      if (stale) {
        console.warn(
          `[dataCache] Firestore read failed for "${key}" — serving cached copy from ` +
            `${new Date(stale.at).toISOString()}:`,
          (err as Error).message,
        );
        return stale.value as T;
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
