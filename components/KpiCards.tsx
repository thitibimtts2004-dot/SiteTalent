import type { Overview } from "@/lib/types";

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function KpiCards({ overview }: { overview: Overview }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card label="ผู้รับเหมา (คน)" value={overview.workers.toLocaleString()} />
      <Card label="ไซต์งาน" value={String(overview.sites)} />
      <Card label="บริษัทผู้รับเหมา" value={String(overview.contractors)} />
      <Card
        label="ทักษะระดับ 2 เฉลี่ย"
        value={`${overview.overallLvl2Pct}%`}
        sub="จากทุกคน × 17 ทักษะ"
      />
    </div>
  );
}
