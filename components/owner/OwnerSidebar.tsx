"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Search,
  Map,
  ArrowLeft,
  Settings,
} from "lucide-react";

const ownerNavItems = [
  { href: "/owner/dashboard", label: "Executive Panel", icon: LayoutDashboard },
  { href: "/owner/team", label: "Roster Management", icon: Users },
  { href: "/owner/users", label: "Platform Users", icon: Search },
  { href: "/owner/analysis-boards", label: "Strategy Boards", icon: Map },
];

export function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-white flex flex-col select-none">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border shrink-0 bg-white">
        <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse" />
        <span className="text-lg font-bold tracking-tight text-[#111827]">Owner Portal</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {ownerNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-amber-500/10 text-amber-600 font-bold"
                  : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Return Button */}
      <div className="p-3 border-t border-border shrink-0">
        <Link href="/dashboard">
          <span className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] cursor-pointer border border-[#E5E7EB] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Coach Dashboard
          </span>
        </Link>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border text-[10px] text-[#9CA3AF] font-mono">
        EXEC SECURE ZONE
      </div>
    </aside>
  );
}
