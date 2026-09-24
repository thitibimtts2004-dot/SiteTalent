"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { scopeFrom, scopeQuery } from "@/lib/scope";

const LINKS = [
  { href: "/", label: "ภาพรวม" },
  { href: "/sites", label: "ไซต์ & ผู้รับเหมา" },
  { href: "/trends", label: "แนวโน้ม" },
  { href: "/criticality", label: "จุดเสี่ยง" },
  { href: "/workers", label: "รายบุคคล" },
];

export default function Nav() {
  // useSearchParams needs a Suspense boundary; the fallback is the same nav without scope
  return (
    <Suspense fallback={<NavBar query="" />}>
      <ScopedNav />
    </Suspense>
  );
}

/** Links carry the current ?site=&contractor= so the scope survives page switches (T-008). */
function ScopedNav() {
  const params = useSearchParams();
  return <NavBar query={scopeQuery(scopeFrom(params))} />;
}

function NavBar({ query }: { query: string }) {
  const path = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 md:px-8">
        <span className="mr-4 py-3 font-semibold text-blue-600">SiteTalent</span>
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={`${l.href}${query}`}
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
