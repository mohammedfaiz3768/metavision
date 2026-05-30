import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Crosshair, BarChart3, Users, Zap } from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">FF Intel</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Tactical analytics for Free Fire esports
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Your team&apos;s tactical{" "}
            <span className="text-primary">command center</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Shared strategy whiteboards, match analytics, and AI coaching — built
            exclusively for competitive Free Fire teams.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Start for free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8">
                Log in
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mt-20 w-full">
          <div className="p-6 rounded-lg border border-border bg-card space-y-3">
            <Crosshair className="h-8 w-8 text-primary" />
            <h3 className="font-semibold text-lg">Tactical whiteboard</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Draw strategies on real Free Fire maps with 12 tactical markers.
              Share live with your team.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card space-y-3">
            <BarChart3 className="h-8 w-8 text-[hsl(160_70%_45%)]" />
            <h3 className="font-semibold text-lg">Match analytics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload match screenshots, extract stats with OCR, and track
              performance trends over time.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card space-y-3">
            <Users className="h-8 w-8 text-[hsl(280_65%_55%)]" />
            <h3 className="font-semibold text-lg">Team workspace</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage your roster, assign roles, and collaborate on strategies in
              real time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
        FF Intel — Built for competitive Free Fire teams
      </footer>
    </div>
  );
}
