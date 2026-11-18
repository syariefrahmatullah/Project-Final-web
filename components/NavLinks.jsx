"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ links }) {
  const path = usePathname();
  return (
    <nav className="space-y-1">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-accent text-slate-900" : "text-slate-200 hover:bg-white/10"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
