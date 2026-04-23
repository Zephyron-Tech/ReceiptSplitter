import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Receipt Splitter",
  description: "Rozdělení útraty z účtenky",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
