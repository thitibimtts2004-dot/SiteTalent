import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import DataStatusBar from "@/components/DataStatusBar";
import { getDataStatus, type DataStatus } from "@/lib/data";

export const metadata: Metadata = {
  title: "SiteTalent — Dashboard สรุปทักษะผู้รับเหมา",
  description: "Phase 1 read-only reporting dashboard from the master assessment workbook",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // status bar is best-effort: never let it take the whole site down
  const status: DataStatus | null = await getDataStatus().catch(() => null);
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
        {children}
      </body>
    </html>
  );
}
