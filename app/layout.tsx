import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import DataStatusBar from "@/components/DataStatusBar";
import FilterBar from "@/components/FilterBar";
import { getDataStatus, getBySite, getByContractor, type DataStatus } from "@/lib/data";

// sorted on the server and passed as props → same order in SSR and the browser
const byThai = new Intl.Collator("th").compare;

export const metadata: Metadata = {
  title: "SiteTalent — Dashboard สรุปทักษะผู้รับเหมา",
  description: "Phase 1 read-only reporting dashboard from the master assessment workbook",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // status bar + filter options are best-effort: never let them take the whole site down
  const [status, scopeOptions] = await Promise.all([
    getDataStatus().catch((): DataStatus | null => null),
    // unscoped summary docs (cached) → the global filter's option lists
    Promise.all([getBySite(), getByContractor()])
      .then(([sites, contractors]) => ({
        sites: sites.map((g) => g.name).sort(byThai),
        contractors: contractors.map((g) => g.name).sort(byThai),
      }))
      .catch(() => null),
  ]);
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-thai antialiased">
        <Nav />
        {status && <DataStatusBar status={status} />}
        {scopeOptions && <FilterBar {...scopeOptions} />}
        {children}
      </body>
    </html>
  );
}
