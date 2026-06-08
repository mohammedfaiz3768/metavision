"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Crosshair,
  LayoutDashboard,
  Map,
  Upload,
  BarChart2,
  Swords,
  Trophy,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/top-teams-analysis", label: "Top Teams", icon: TrendingUp },
  { href: "/boards", label: "Boards", icon: Map },
  { href: "/matches", label: "Matches", icon: Upload },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/scrims", label: "Scrims", icon: Swords },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/team", label: "Team", icon: Users },
  { href: "/communication", label: "Callouts", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch owner verification check status
  const { data: ownerCheck } = useQuery({
    queryKey: ["owner-check-sidebar"],
    queryFn: async () => {
      const res = await fetch("/api/owner/check");
      if (!res.ok) return { isOwner: false };
      return res.json();
    },
    retry: false,
  });

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col justify-between select-none transition-all duration-300 ease-in-out shadow-sm",
        isExpanded ? "w-[220px] shadow-2xl" : "w-[52px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Top: Logo */}
      <div className="flex flex-col items-center w-full">
        <div className="h-[52px] flex items-center justify-center w-full relative">
          <div className={cn("flex items-center transition-all duration-300 w-full", isExpanded ? "px-4 justify-start gap-2.5" : "justify-center")}>
            <Crosshair className="h-5 w-5 text-primary shrink-0" />
            <span className={cn(
              "font-bold text-sm tracking-wide text-foreground transition-all duration-300 overflow-hidden whitespace-nowrap",
              isExpanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0"
            )}>
              FF INTEL
            </span>
          </div>
        </div>
 
        {/* Navigation items */}
        <nav className="w-full flex flex-col items-center gap-1 py-2 px-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div key={item.href} className="relative w-full flex justify-center">
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
                )}
                <Link
                  href={item.href}
                  title={isExpanded ? undefined : item.label}
                  className={cn(
                    "h-10 rounded-[10px] flex items-center transition-all duration-150",
                    isExpanded ? "w-full px-3 justify-start gap-3" : "h-10 w-10 justify-center",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn(
                    "text-xs font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
                    isExpanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>
 
      {/* Bottom: Settings, Owner Portal, Logout */}
      <div className="flex flex-col items-center gap-1 py-3 w-full border-t border-sidebar-border px-1.5">
        {/* Secure Owner Portal Link */}
        {ownerCheck?.isOwner && (
          <div className="relative w-full flex justify-center">
            {pathname.startsWith("/owner") && (
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
            )}
            <Link
              href="/owner/dashboard"
              title={isExpanded ? undefined : "Owner Portal"}
              className={cn(
                "h-10 rounded-[10px] flex items-center transition-all duration-150",
                isExpanded ? "w-full px-3 justify-start gap-3" : "h-10 w-10 justify-center",
                pathname.startsWith("/owner")
                  ? "bg-primary/10 text-amber-650"
                  : "text-amber-600 hover:text-amber-500 hover:bg-sidebar-accent"
              )}
            >
              <ShieldAlert className="h-[18px] w-[18px] shrink-0" />
              <span className={cn(
                "text-xs font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
                isExpanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0"
              )}>
                Owner Portal
              </span>
            </Link>
          </div>
        )}
 
        {/* Settings button */}
        <div className="relative w-full flex justify-center">
          <Link
            href="/team"
            title={isExpanded ? undefined : "Team Settings"}
            className={cn(
              "h-10 rounded-[10px] flex items-center transition-all duration-150",
              isExpanded ? "w-full px-3 justify-start gap-3" : "h-10 w-10 justify-center",
              "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
            )}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span className={cn(
              "text-xs font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
              isExpanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0"
            )}>
              Settings
            </span>
          </Link>
        </div>
 
        {/* Logout button */}
        <div className="relative w-full flex justify-center">
          <button
            onClick={handleSignOut}
            title={isExpanded ? undefined : "Log Out"}
            className={cn(
              "h-10 rounded-[10px] flex items-center transition-all duration-150 cursor-pointer",
              isExpanded ? "w-full px-3 justify-start gap-3" : "h-10 w-10 justify-center",
              "text-sidebar-foreground hover:text-red-500 hover:bg-rose-500/10"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn(
              "text-xs font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
              isExpanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0"
            )}>
              Log Out
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
