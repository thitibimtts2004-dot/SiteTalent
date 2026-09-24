import { getRoundTrend } from "@/lib/data";
import { scopeFrom, isScoped } from "@/lib/scope";
import TrendTable from "@/components/TrendTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendsPage({ searchParams }: { searchParams: SearchParams }) {
  const scope = scopeFrom(await searchParams);
  const trend = await getRoundTrend();
  // T-008: trends only filter rows (site table by site, contractor table by
  // contractor) — round history is not recomputed per scope
  const bySite = scope.site ? trend.bySite.filter((r) => r.name === scope.site) : trend.bySite;
  const byContractor = scope.contractor
    ? trend.byContractor.filter((r) => r.name === scope.contractor)
    : trend.byContractor;

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">แนวโน้มระหว่างรอบ</h1>
        <p className="mt-1 text-sm text-slate-500">
          {trend.hasPrevious
            ? `เทียบ ${trend.previous?.label ?? "รอบก่อน"} → ${trend.current.label} · แต่ละช่องแสดงค่ารอบนี้ พร้อมการเปลี่ยนแปลง (▲ เพิ่ม · ▼ ลด)`
            : "เปรียบเทียบจำนวนคนและทักษะระดับ 1/2 ของแต่ละกลุ่มระหว่างรอบการประเมิน"}
        </p>
        {isScoped(scope) && (
          <p className="mt-1 text-xs text-purple-700">
            ตัวกรองหน้านี้กรองแถวเท่านั้น — ตัวเลขแต่ละแถวยังเป็นยอดรวมทั้งกลุ่ม
          </p>
        )}
      </header>

      {trend.hasPrevious ? (
        <>
          <TrendTable title="ตามไซต์งาน" rows={bySite} unit="ไซต์" />
          <TrendTable title="ตามบริษัทผู้รับเหมา" rows={byContractor} unit="บริษัท" />
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-slate-700">
            มีข้อมูลแค่รอบเดียว ยังเทียบแนวโน้มไม่ได้
          </p>
          <p className="mt-1 text-sm text-slate-500">
            เมื่อมีการนำเข้าข้อมูลรอบถัดไป ระบบจะเทียบการเปลี่ยนแปลงให้อัตโนมัติ
          </p>
        </div>
      )}
    </main>
  );
}
