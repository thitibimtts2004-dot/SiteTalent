import { listWorkers } from "@/lib/data";
import { slimWorker, type DashboardFilters } from "@/lib/dashboard";
import { SKILL_IDS } from "@/lib/skills";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

/** ?site=&contractor=&skill=&position= → filters (first value wins; unknown skill ids dropped). */
function filtersFrom(q: Awaited<Search>): DashboardFilters {
  const one = (k: string) => {
    const v = q[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : undefined;
  };
  const skill = one("skill");
  return {
    site: one("site"),
    contractor: one("contractor"),
    position: one("position"),
    skill: skill && SKILL_IDS.includes(skill) ? skill : undefined,
  };
}

export default async function Home({ searchParams }: { searchParams: Search }) {
  const initialFilters = filtersFrom(await searchParams);
  // Read the full worker list server-side, then slim to the browser-safe shape.
  // For this INTERNAL tool the drill-down table needs worker code+name (Option B,
  // user-approved); per-skill levels travel as compact digits; assessor/date stay on the server.
  const workers = (await listWorkers()).map(slimWorker);

  return (
    <main className="w-full p-4 md:px-6 md:py-5">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">ภาพรวมทักษะผู้รับเหมา</h1>
        <p className="mt-1 text-sm text-slate-500">
          สัดส่วนทักษะ (%skilled = ทำได้ ÷ ทั้งหมด) แยกตามไซต์และผู้รับเหมา · กรองตามไซต์ ผู้รับเหมา
          ทักษะ และตำแหน่ง แล้วค้นหารายบุคคลได้
        </p>
      </header>

      <Dashboard workers={workers} initialFilters={initialFilters} />
    </main>
  );
}
