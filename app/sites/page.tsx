import { getBySite, getByContractor } from "@/lib/data";
import { scopeFrom, isScoped } from "@/lib/scope";
import RollupTable from "@/components/RollupTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SitesPage({ searchParams }: { searchParams: SearchParams }) {
  // T-008: a scope recomputes both tables from the scoped workers
  const scope = scopeFrom(await searchParams);
  const [sites, contractors] = await Promise.all([
    getBySite(scope),
    getByContractor(scope),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          รายไซต์ & ผู้รับเหมา
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          จำนวนคนและทักษะระดับ 2 รวมของแต่ละกลุ่ม
          {isScoped(scope) && " · คำนวณเฉพาะคนในขอบเขตที่เลือก"}
        </p>
      </header>

      <RollupTable title="ตามไซต์งาน" rows={sites} unit="ไซต์" />
      <RollupTable title="ตามบริษัทผู้รับเหมา" rows={contractors} unit="บริษัท" />
    </main>
  );
}
