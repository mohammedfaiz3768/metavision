"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Loader2, Monitor } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(true);

  // Responsive check for Desktop Only (1024px)
  useEffect(() => {
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Run initial check
    checkWidth();

    // Listen for resize
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading dashboard session...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Under 1024px, show Desktop Only screen
  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center select-none">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Monitor className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Desktop Only Environment
        </h1>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
          FF Intel is an esports tactical command center designed for precision analysis, whiteboard planning, and coaching workflows. Please connect via a desktop screen (min width: 1024px) to access your team dashboard and whiteboards.
        </p>
        <div className="px-4 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground font-semibold">
          Resolution must be 1024px or wider
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar - 52px width */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 pl-[52px] flex flex-col min-h-screen">
        {/* TopBar - 52px height */}
        <TopBar />

        {/* Content wrapper */}
        <main className="flex-1 mt-[52px] p-8 overflow-y-auto min-h-[calc(100vh-52px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
