"use client";

import { useEffect, useState } from "react";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Loader2, Monitor, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isDesktop, setIsDesktop] = useState(true);
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Responsive check for Desktop Only (1024px)
  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Check owner membership
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    const checkOwnerStatus = async () => {
      try {
        const res = await fetch("/api/owner/check");
        if (!res.ok) {
          setIsOwner(false);
        } else {
          const data = await res.json();
          setIsOwner(data.isOwner);
        }
      } catch (err) {
        console.error("Owner layout check error:", err);
        setIsOwner(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    checkOwnerStatus();
  }, [user, authLoading, router]);

  const loading = authLoading || isCheckingOwner;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <p className="text-sm text-slate-600 animate-pulse font-semibold">
          Authorizing executive credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If not owner, show Access Denied screen
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-6 text-center select-none text-slate-900">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
          <ShieldAlert className="h-8 w-8 text-rose-655 text-rose-550 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Access Denied
        </h1>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
          You do not possess the required executive analyst credentials to access the owner portal administration. Coaches and players are redirected to their standard rosters.
        </p>
        <Link href="/dashboard">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold px-4 h-9 rounded-lg transition-colors">
            Return to Coach Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Under 1024px, show Desktop Only screen
  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-6 text-center select-none text-slate-900">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
          <Monitor className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Desktop Only Environment
        </h1>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
          The owner executive portal is designed for desktop analysis and staff management metrics. Please connect via a desktop screen (min width: 1024px).
        </p>
        <div className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-650 font-semibold font-mono">
          Resolution must be 1024px or wider
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar - 240px width */}
      <OwnerSidebar />

      {/* Main Content Area */}
      <div className="flex-1 pl-[240px] flex flex-col min-h-screen">
        {/* TopBar - 52px height */}
        <TopBar />

        {/* Content wrapper */}
        <main className="flex-1 mt-[52px] p-8 overflow-y-auto min-h-[calc(100vh-52px)] bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
