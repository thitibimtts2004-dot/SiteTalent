"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "ภาพรวม" },
  { href: "/sites", label: "ไซต์ & ผู้รับเหมา" },
  { href: "/trends", label: "แนวโน้ม" },
  { href: "/criticality", label: "จุดเสี่ยง" },
  { href: "/workers", label: "รายบุคคล" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="flex w-full items-center gap-1 px-4 md:px-8">
        <span className="mr-4 py-3 font-semibold text-blue-600">SiteTalent</span>
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`border-b-2 px-3 py-3 text-sm transition ${
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
