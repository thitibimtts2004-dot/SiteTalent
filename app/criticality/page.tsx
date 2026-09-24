import { getCriticality } from "@/lib/data";
import { scopeFrom } from "@/lib/scope";
import CriticalityTable from "@/components/CriticalityTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CriticalityPage({ searchParams }: { searchParams: SearchParams }) {
  // T-008: flags are scored against the scope's own headcount
  const scope = scopeFrom(await searchParams);
  const report = await getCriticality(undefined, scope);
  const flaggedCount = report.skills.filter((s) => s.flagged).length;
  const scopeText = [scope.site, scope.contractor].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          จุดเสี่ยงทักษะ
          {scopeText && (
            <span className="ml-2 text-base font-normal text-purple-700">— {scopeText}</span>
          )}
        </h1>
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
