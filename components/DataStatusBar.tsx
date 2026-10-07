import type { DataStatus } from "@/lib/data";

// Server component: dates are formatted on the server only, so no hydration mismatch.
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });

/**
 * variant "bar"     — thin strip above the page (shown below lg, where there is no sidebar)
 * variant "sidebar" — plain text for the side-nav footer (lg+)
 * A stale-data warning always renders as the full-width amber strip: it must not hide.
 */
export default function DataStatusBar({
  status,
  variant = "bar",
}: {
  status: DataStatus;
  variant?: "bar" | "sidebar";
}) {
  if (status.staleSince) {
    if (variant === "sidebar") return null; // the amber strip already shows it
    return (
      <div className="border-b border-amber-300 bg-amber-50">
        <p className="px-4 py-1.5 text-xs text-amber-800 md:px-8">
          ⚠ เชื่อมต่อฐานข้อมูลไม่ได้ชั่วคราว — กำลังแสดงข้อมูลที่บันทึกไว้เมื่อ {fmt(status.staleSince)}
        </p>
      </div>
    );
  }
  if (variant === "sidebar") {
    if (status.source === "fixture") return <p>ข้อมูลตัวอย่าง (ไฟล์ในเครื่อง)</p>;
    return (
      <div className="space-y-0.5">
        <p className="font-medium text-slate-700">ข้อมูล {status.roundLabel ?? "-"}</p>
        {status.importedAt && <p>อัปเดตล่าสุด {fmt(status.importedAt)}</p>}
      </div>
    );
  }
  return (
    <div className="border-b border-slate-100 bg-slate-50 lg:hidden">
      <p className="px-4 py-1.5 text-xs text-slate-500 md:px-8">
        {status.source === "fixture"
          ? "ข้อมูลตัวอย่าง (ไฟล์ในเครื่อง) — ยังไม่ได้เชื่อมต่อฐานข้อมูล"
          : `ข้อมูล: ${status.roundLabel ?? "-"}` +
            (status.importedAt ? ` · อัปเดตล่าสุด ${fmt(status.importedAt)}` : "")}
      </p>
    </div>
  );
}
