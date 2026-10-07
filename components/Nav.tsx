"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { scopeFrom, scopeQuery } from "@/lib/scope";

/** Grid icon (dashboard). Inline SVG: no icon dependency, inherits currentColor. */
function IconGrid({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// Overview-only: the other pages were retired from the menu (redirected in next.config.ts)
const LINKS = [{ href: "/", label: "ภาพรวม", icon: IconGrid }];

/**
 * Side navigation (lg+): a sticky full-height rail with brand, links and a footer
 * slot (the data-status line, rendered on the server and passed in). Below lg it
 * collapses to a compact top bar so phones keep the full width for charts.
 */
export default function Nav({ footer }: { footer?: React.ReactNode }) {
  // useSearchParams needs a Suspense boundary; the fallback is the same nav without scope
  return (
    <Suspense fallback={<NavBar query="" footer={footer} />}>
      <ScopedNav footer={footer} />
    </Suspense>
  );
}

/** Links carry the current ?site=&contractor= so the scope survives page switches (T-008). */
function ScopedNav({ footer }: { footer?: React.ReactNode }) {
  const params = useSearchParams();
  return <NavBar query={scopeQuery(scopeFrom(params))} footer={footer} />;
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C3BE0] to-[#E8722C] text-sm font-bold text-white shadow-sm">
        ST
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-slate-900">SiteTalent</div>
        <div className="text-[11px] text-slate-500">ทักษะผู้รับเหมา</div>
      </div>
    </div>
  );
}

function NavBar({ query, footer }: { query: string; footer?: React.ReactNode }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-4 px-4 py-3 lg:block lg:px-5 lg:py-6">
        <Brand />
        <div className="hidden px-1 pb-2 pt-8 text-[11px] font-medium uppercase tracking-wider text-slate-400 lg:block">
          เมนู
        </div>
        <nav className="ml-auto flex gap-1 lg:ml-0 lg:flex-col">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={`${l.href}${query}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-purple-50 text-[#6C3BE0] ring-1 ring-inset ring-purple-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {footer && (
        <div className="hidden border-t border-slate-100 px-5 py-4 text-xs leading-relaxed text-slate-500 lg:mt-auto lg:block">
          {footer}
        </div>
      )}
    </aside>
  );
}
