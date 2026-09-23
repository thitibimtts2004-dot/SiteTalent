import { getBySite, getByContractor } from "@/lib/data";
import RollupTable from "@/components/RollupTable";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const [sites, contractors] = await Promise.all([
    getBySite(),
    getByContractor(),
  ]);

  return (
    <main className="w-full space-y-8 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          รายไซต์ & ผู้รับเหมา
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          จำนวนคนและทักษะระดับ 2 รวมของแต่ละกลุ่ม
        </p>
      </header>

      <RollupTable title="ตามไซต์งาน" rows={sites} unit="ไซต์" />
      <RollupTable title="ตามบริษัทผู้รับเหมา" rows={contractors} unit="บริษัท" />
    </main>
  );
}
