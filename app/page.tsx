import { getOverview, getBySkill } from "@/lib/data";
import { SKILLS } from "@/lib/skills";
import KpiCards from "@/components/KpiCards";
import SkillBarChart from "@/components/SkillBarChart";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [overview, bySkill] = await Promise.all([getOverview(), getBySkill()]);
  const data = SKILLS.map((s) => ({
    label: s.label,
    lvl2: bySkill[s.id]?.lvl2 ?? 0,
  }));

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          ภาพรวมทักษะผู้รับเหมา
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          จำนวนคนที่ผ่าน &ldquo;ระดับ 2&rdquo; (ทำได้ผ่านมาตรฐาน) ในแต่ละทักษะ
        </p>
      </header>

      <KpiCards overview={overview} />

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          ระดับ 2 ต่อทักษะ (17 ทักษะ)
        </h2>
        <SkillBarChart data={data} />
      </section>
    </main>
  );
}
