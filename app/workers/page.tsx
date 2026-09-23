import { listWorkers, getBySite, getByContractor } from "@/lib/data";
import WorkerTable from "@/components/WorkerTable";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const [workers, sites, contractors] = await Promise.all([
    listWorkers(),
    getBySite(),
    getByContractor(),
  ]);

  return (
    <main className="w-full p-6 md:p-8">
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
