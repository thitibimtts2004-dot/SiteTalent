/**
 * Global scope filter (T-008): the site + contractor a user picked once, carried
 * in the URL as ?site=&contractor= so every view re-scopes and a reload or a
 * shared link keeps it. Client-safe (no node / firebase imports).
 */
export interface Scope {
  site?: string;
  contractor?: string;
}

type Params =
  | Record<string, string | string[] | undefined>
  | { get(key: string): string | null };

/** First value wins; blank → undefined. */
function pick(sp: Params, key: string): string | undefined {
  const raw =
    typeof sp.get === "function"
      ? (sp as { get(key: string): string | null }).get(key)
      : (sp as Record<string, string | string[] | undefined>)[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && v.trim() ? v : undefined;
}

/** Read the scope from Next searchParams (server) or URLSearchParams (client). */
export function scopeFrom(sp: Params | undefined): Scope {
  if (!sp) return {};
  const scope: Scope = {};
  const site = pick(sp, "site");
  const contractor = pick(sp, "contractor");
  if (site) scope.site = site;
  if (contractor) scope.contractor = contractor;
  return scope;
}

export const isScoped = (s: Scope) => Boolean(s.site || s.contractor);

/** "" when unscoped, else "?site=..&contractor=.." (for carrying scope on links). */
export function scopeQuery(s: Scope): string {
  const q = new URLSearchParams();
  if (s.site) q.set("site", s.site);
  if (s.contractor) q.set("contractor", s.contractor);
  const str = q.toString();
  return str ? `?${str}` : "";
}
