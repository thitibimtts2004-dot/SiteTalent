import { listWorkers } from "@/lib/data";
import { slimWorker } from "@/lib/dashboard";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Read the full worker list server-side, then slim to the browser-safe shape.
  // For this INTERNAL tool the drill-down table needs worker code+name (Option B,
  // user-approved); the per-skill map + assessor/date stay on the server.
  const workers = (await listWorkers()).map(slimWorker);

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">ภาพรวมทักษะผู้รับเหมา</h1>
        <p className="mt-1 text-sm text-slate-500">
          สัดส่วนทักษะ (%skilled = ทำได้ ÷ ทั้งหมด) แยกตามไซต์และผู้รับเหมา · กรองตามตำแหน่ง
          และค้นหารายบุคคลได้
        </p>
      </header>

      <Dashboard workers={workers} />
    </main>
  );
}
