import { listWorkers } from "@/lib/data";
import { LEVEL_KEYS, slimWorker, type DashboardFilters } from "@/lib/dashboard";
import { SKILL_IDS } from "@/lib/skills";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

/** ?site=&contractor=&skill=&position=&level= → filters (first value wins; unknown skill ids dropped). */
function filtersFrom(q: Awaited<Search>): DashboardFilters {
  const one = (k: string) => {
    const v = q[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : undefined;
  };
  const skill = one("skill");
  const level = one("level");
  return {
    site: one("site"),
    contractor: one("contractor"),
    position: one("position"),
    skill: skill && SKILL_IDS.includes(skill) ? skill : undefined,
    level: level && (LEVEL_KEYS as readonly string[]).includes(level) ? level : undefined,
  };
}

export default async function Home({ searchParams }: { searchParams: Search }) {
  const initialFilters = filtersFrom(await searchParams);
  // Read the full worker list server-side, then slim to the browser-safe shape.
  // For this INTERNAL tool the drill-down table needs worker code+name (Option B,
  // user-approved); per-skill levels travel as compact digits; assessor/date stay on the server.
  const workers = (await listWorkers()).map(slimWorker);

  return (
    <main className="w-full p-6 md:p-8 2xl:px-10">
      {/* page header lives in Dashboard so the clear-filters button can sit beside it */}
      <Dashboard workers={workers} initialFilters={initialFilters} />
    </main>
  );
}
