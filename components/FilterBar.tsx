"use client";

import { Suspense, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { scopeFrom, isScoped, type Scope } from "@/lib/scope";

interface Props {
  sites: string[];
  contractors: string[];
}

/**
 * Global scope filter (T-008): pick a site / contractor once and every page
 * re-scopes. The choice lives in the URL (?site=&contractor=) so reload, the
 * nav links and shared links all keep it. Hidden on "/" — the home Dashboard
 * has its own richer bar that uses the same URL keys.
 */
export default function FilterBar(props: Props) {
  // useSearchParams needs a Suspense boundary for statically rendered routes
  return (
    <Suspense fallback={null}>
      <Bar {...props} />
    </Suspense>
  );
}

function Bar({ sites, contractors }: Props) {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (path === "/") return null;

  const scope = scopeFrom(params);
  const go = (next: Scope) => {
    const q = new URLSearchParams(params.toString()); // keep any other params
    for (const key of ["site", "contractor"] as const) {
      if (next[key]) q.set(key, next[key]);
      else q.delete(key);
    }
    const qs = q.toString();
    startTransition(() => router.replace(qs ? `${path}?${qs}` : path, { scroll: false }));
  };

  const selects = [
    { key: "site" as const, label: "ไซต์", all: "ทุกไซต์", options: sites },
    { key: "contractor" as const, label: "ผู้รับเหมา", all: "ทุกผู้รับเหมา", options: contractors },
  ];

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-2 md:px-8">
        <span className="text-xs font-medium text-slate-500">ขอบเขตข้อมูล</span>
        {selects.map((s) => (
          <select
            key={s.key}
            aria-label={s.label}
            value={scope[s.key] ?? ""}
            onChange={(e) => go({ ...scope, [s.key]: e.target.value || undefined })}
            className={`max-w-[16rem] rounded-lg border bg-white px-3 py-1.5 text-sm text-slate-800 ${
              scope[s.key] ? "border-purple-400" : "border-slate-300"
            }`}
          >
            <option value="">{s.all}</option>
            {/* keep a value from the URL visible even if it is not in the list */}
            {scope[s.key] && !s.options.includes(scope[s.key]!) && (
              <option value={scope[s.key]}>{scope[s.key]}</option>
            )}
            {s.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ))}
        {isScoped(scope) && (
          <div className="flex flex-wrap items-center gap-2">
            {selects
              .filter((s) => scope[s.key])
              .map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go({ ...scope, [s.key]: undefined })}
                  className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700 hover:bg-purple-100"
                  title="เอาตัวกรองนี้ออก"
                >
                  {s.label}: {scope[s.key]} ✕
                </button>
              ))}
            <button
              type="button"
              onClick={() => go({})}
              className="text-xs text-slate-500 underline hover:text-slate-800"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}
        {pending && <span className="text-xs text-slate-400">กำลังโหลด…</span>}
      </div>
    </div>
  );
}
