import { getCriticality } from "@/lib/data";
import CriticalityTable from "@/components/CriticalityTable";

export const dynamic = "force-dynamic";

export default async function CriticalityPage() {
  const report = await getCriticality();
  const flaggedCount = report.skills.filter((s) => s.flagged).length;

  return (
    <main className="w-full space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">จุดเสี่ยงทักษะ</h1>
        <p className="mt-1 text-sm text-slate-500">
          {report.round.label} · ชูธงเตือนเมื่อสัดส่วนคนทำได้ต่ำกว่าเกณฑ์ —
          ทำได้ (ร1+ร2) &lt; 70% · ระดับ1 &lt; 50% · ระดับ2 &lt; 20% ·{" "}
          <span className="font-medium text-red-600">
            {flaggedCount}/{report.skills.length} ทักษะติดธง
          </span>
        </p>
      </header>

      <CriticalityTable rows={report.skills} />
    </main>
  );
}
