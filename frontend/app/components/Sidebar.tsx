"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Nová účtenka" },
  { href: "/history", label: "Historie" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 shadow-sm flex flex-col p-4 md:p-6">
      <div className="mb-4 md:mb-10">
        <Link href="/" className="text-xl font-black text-indigo-600 tracking-tight hover:opacity-80 transition-opacity">
          Receipt Splitter
        </Link>
      </div>
      <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 border-2 ${
                isActive
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 translate-y-[-1px]"
                  : "bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
