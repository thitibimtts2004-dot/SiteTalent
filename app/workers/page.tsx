import { listWorkers, getBySite, getByContractor } from "@/lib/data";
import { scopeFrom } from "@/lib/scope";
import WorkerTable from "@/components/WorkerTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WorkersPage({ searchParams }: { searchParams: SearchParams }) {
  // T-008: only the scoped workers reach the table; its own site/contractor
  // dropdowns list just what is left inside the scope
  const scope = scopeFrom(await searchParams);
  const [workers, sites, contractors] = await Promise.all([
    listWorkers(scope),
    getBySite(scope),
    getByContractor(scope),
  ]);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">รายบุคคล</h1>
        <p className="mt-1 text-sm text-slate-500">
          ค้นหาและกรองผู้รับเหมารายคน พร้อมระดับทักษะทั้ง 17 ด้าน
        </p>
      </header>

      <WorkerTable
        workers={workers}
        sites={sites.map((s) => s.name)}
        contractors={contractors.map((c) => c.name)}
      />
    </main>
  );
}
