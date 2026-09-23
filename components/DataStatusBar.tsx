import type { DataStatus } from "@/lib/data";

// Server component: dates are formatted on the server only, so no hydration mismatch.
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function DataStatusBar({ status }: { status: DataStatus }) {
  if (status.staleSince) {
    return (
      <div className="border-b border-amber-300 bg-amber-50">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-xs text-amber-800 md:px-8">
          ⚠ เชื่อมต่อฐานข้อมูลไม่ได้ชั่วคราว — กำลังแสดงข้อมูลที่บันทึกไว้เมื่อ {fmt(status.staleSince)}
        </p>
      </div>
    );
  }
  return (
    <div className="border-b border-slate-100 bg-slate-50">
      <p className="mx-auto max-w-7xl px-4 py-1.5 text-xs text-slate-500 md:px-8">
        {status.source === "fixture"
          ? "ข้อมูลตัวอย่าง (ไฟล์ในเครื่อง) — ยังไม่ได้เชื่อมต่อฐานข้อมูล"
          : `ข้อมูล: ${status.roundLabel ?? "-"}` +
            (status.importedAt ? ` · อัปเดตล่าสุด ${fmt(status.importedAt)}` : "")}
      </p>
    </div>
  );
}
