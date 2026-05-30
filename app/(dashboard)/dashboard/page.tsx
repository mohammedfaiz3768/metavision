"use client";

import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Map as MapIcon,
  Plus,
  Users,
  Upload,
  Swords,
  ChevronRight,
  Sparkles,
  Loader2,
  Pencil,
  Check,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { StrategyBoard } from "@/lib/types/app.types";
import { ReadOnlyBoard } from "@/components/analysis-board/ReadOnlyBoard";
import { ExternalLink } from "lucide-react";

const DAILY_QUOTES = [
  "When holding a compound, every window is a potential threat. Assign sectors of fire and communicate any enemy movement clearly.",
  "Zone timing is not about running fast, it is about knowing when to move before everyone else does.",
  "A team that studies together wins together. Ten minutes of board prep saves thirty seconds of confusion mid-fight.",
  "Your placement is decided in the first ninety seconds of the match. Your drop is your strategy.",
  "Aggression without information is just feeding. Know before you push.",
  "The best rotation is the one the enemy doesn't see coming. Think two zones ahead.",
];

export default function DashboardPage() {
  const { currentTeam, isLoading: teamLoading, refetch: refetchTeam } = useTeam();
  const { user } = useAuth();
  const [inviteToken, setInviteToken] = useState("");
  const [joining, setJoining] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // --- Sticky Thoughts & Goals logic ---
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goalsText, setGoalsText] = useState("");
  
  useEffect(() => {
    if (user?.id && typeof window !== "undefined") {
      const stored = localStorage.getItem(`sticky-goals-${user.id}`);
      setGoalsText(stored || "• Stay consistent, stay focused.\n• Every setback is a setup for a comeback.");
    }
  }, [user?.id]);

  const handleSaveGoals = () => {
    if (user?.id && typeof window !== "undefined") {
      localStorage.setItem(`sticky-goals-${user.id}`, goalsText);
    }
    setIsEditingGoals(false);
    toast.success("Tactical goals updated successfully!");
  };

  // --- Rotating Quotes Bar ---
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % DAILY_QUOTES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch strategy boards for current team
  const { data: boards, isLoading: boardsLoading } = useQuery<StrategyBoard[]>({
    queryKey: ["team-boards", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const { data, error } = await supabase
        .from("strategy_boards")
        .select("*")
        .eq("team_id", currentTeam.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data as StrategyBoard[];
    },
    enabled: !!currentTeam,
  });

  // Fetch the latest published strategic analysis match for rotations preview
  const { data: latestMatch } = useQuery<any>({
    queryKey: ["latest-published-analysis-match"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_matches")
        .select(`
          id,
          match_name,
          map,
          canvas_data,
          is_published,
          created_at
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;
    setJoining(true);

    try {
      // Validate invite token
      const { data: invite, error: inviteError } = await (supabase
        .from("team_invites")
        .select("*")
        .eq("token", inviteToken.trim())
        .single() as any);

      if (inviteError || !invite) {
        toast.error("Invalid or expired invite token");
        setJoining(false);
        return;
      }

      // Check expiry
      if (new Date(invite.expires_at) < new Date()) {
        toast.error("Invite token has expired");
        setJoining(false);
        return;
      }

      // Check max uses
      if (invite.uses >= invite.max_uses) {
        toast.error("Invite token has reached maximum usage limit");
        setJoining(false);
        return;
      }

      // Join the team!
      const { error: joinError } = await (supabase.from("team_members") as any).insert({
        team_id: invite.team_id,
        user_id: user!.id,
        role: "player", // join as player role
      });

      if (joinError) {
        if (joinError.code === "23505") {
          toast.error("You are already a member of this team");
        } else {
          toast.error(`Failed to join: ${joinError.message}`);
        }
        setJoining(false);
        return;
      }

      // Increment invite uses
      await (supabase
        .from("team_invites") as any)
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id);

      toast.success("Successfully joined the team!");
      await refetchTeam();
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setJoining(false);
    }
  };

  if (teamLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
        <p className="text-sm text-[#9CA3AF] animate-pulse font-mono">Loading tactical grid...</p>
      </div>
    );
  }

  // --- No Team Onboarding State ---
  if (!currentTeam) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 select-none text-white">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#7C3AED]/20 bg-[#7C3AED]/5 text-xs text-[#9D5FFF] font-semibold font-mono">
            <Sparkles className="h-3 w-3" />
            Tactical Analysis Suite V1.0
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Welcome to <span className="text-[#7C3AED]">FF Intel</span>
          </h1>
          <p className="text-[#9CA3AF] text-sm max-w-lg mx-auto leading-relaxed">
            Create or join a professional Free Fire esports organization workspace. Collaborate on rotation strategies, match summaries, and analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card A: Create Team */}
          <div className="relative overflow-hidden rounded-[12px] bg-[#13141A] border border-[#2A2B35] p-6 hover:border-[#7C3AED]/40 transition-all duration-300 flex flex-col justify-between h-64">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#9D5FFF] border border-[#7C3AED]/20 shrink-0">
                <Plus className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Create a New Team</h3>
              <p className="text-xs text-[#9CA3AF] leading-normal">
                Establish your esports brand, assign strategic roles, and start generating whiteboard tactical plans. Recommended for Coaches and Managers.
              </p>
            </div>
            <Link href="/team/create" className="mt-4">
              <Button className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold gap-1.5 h-9 rounded-lg">
                Establish Workspace
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Card B: Join Team */}
          <div className="relative overflow-hidden rounded-[12px] bg-[#13141A] border border-[#2A2B35] p-6 hover:border-[#7C3AED]/40 transition-all duration-300 flex flex-col justify-between h-64">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981] border border-[#10B981]/20 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Join via Invite Code</h3>
              <p className="text-xs text-[#9CA3AF] leading-normal">
                Enter the alphanumeric invite token generated by your head coach or team owner to instantly join their tactical roster.
              </p>
            </div>
            <form onSubmit={handleJoinTeam} className="space-y-3 mt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter token"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                  disabled={joining}
                  className="bg-[#1E1F28] border border-[#2A2B35] text-white text-[13px] h-9 focus:border-[#7C3AED]"
                />
                <Button
                  type="submit"
                  disabled={joining || !inviteToken.trim()}
                  className="bg-[#10B981] hover:bg-emerald-600 text-white font-semibold text-xs px-4 h-9"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const username = user?.email?.split("@")[0] || "User";

  return (
    <div className="space-y-6 select-none text-[#111827]">
      {/* SECTION 1: Hero Welcome area */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch select-none">
        {/* Left card: Workflow */}
        <div className="flex-grow lg:w-[55%] rounded-[12px] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex flex-col justify-center">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider font-mono">
            The Pro Player Daily Workflow
          </span>
          <h2 className="text-[20px] font-extrabold text-[#111827] mt-1.5 leading-snug">
            A structured routine to improve every single day
          </h2>
        </div>

        {/* Right card: Sticky Thoughts/Goals */}
        <div className="lg:w-[42%] rounded-[12px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex flex-col justify-between shrink-0 relative min-h-[135px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
            <span className="text-[13px] font-extrabold text-[#111827] flex items-center gap-1">
              📌 Sticky Thoughts & Goals
            </span>
            {isEditingGoals ? (
              <button
                onClick={handleSaveGoals}
                className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer"
              >
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditingGoals(true)}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex-1">
            {isEditingGoals ? (
              <textarea
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
                className="w-full h-[65px] text-xs text-[#374151] border border-slate-200 rounded p-1.5 focus:outline-none focus:border-primary resize-none bg-slate-50"
              />
            ) : (
              <div className="text-xs text-[#4B5563] whitespace-pre-wrap leading-relaxed max-h-[65px] overflow-y-auto">
                {goalsText}
              </div>
            )}
          </div>
          
          <div className="text-[10px] text-[#9CA3AF] italic mt-1 text-right select-none">
            Click the ✏️ icon to add your thoughts/goals!
          </div>
        </div>
      </div>

      {/* SECTION 2: Greeting */}
      <div className="pt-2">
        <p className="text-[15px] text-[#4B5563] font-mono leading-normal">
          Hey <span className="font-bold text-primary capitalize">{username}</span> 🔥, ready to dominate? Here is your daily roadmap.
        </p>
      </div>

      {/* SECTION 3: Section header */}
      <div>
        <h2 className="text-[22px] font-extrabold text-[#111827] tracking-tight">
          Daily Essentials Journey
        </h2>
      </div>

      {/* SECTION 4: Feature cards grid */}
      <div className="space-y-4">
        {/* Top row: 2 Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Study Pro Rotations */}
          <div 
            onClick={() => router.push("/top-teams-analysis")}
            className="relative overflow-hidden rounded-[12px] bg-slate-950 border border-slate-800 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_4px_25px_rgba(0,0,0,0.15)] flex flex-col justify-between group min-h-[320px] p-6 text-white"
          >
            {/* Entire Background Canvas */}
            <div className="absolute inset-0 select-none z-0 pointer-events-none opacity-45 group-hover:scale-[1.02] transition-transform duration-700">
              {latestMatch ? (
                <ReadOnlyBoard
                  mapId={latestMatch.map as any}
                  canvasData={latestMatch.canvas_data}
                  interactive={false}
                  fit="cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
                  <Trophy className="h-16 w-16 text-slate-800" />
                </div>
              )}
              {/* Premium overlay for typography contrast */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-slate-950/45" />
            </div>

            {/* Content (Sits above the background) */}
            <div className="z-10 flex flex-col justify-between h-full flex-1 gap-6">
              {/* Top Row: Chevron Tag */}
              <div>
                <span 
                  style={{ clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)' }}
                  className="inline-block bg-white text-slate-900 text-[10px] font-mono font-bold uppercase tracking-wider pl-3.5 pr-6 py-1.5 shadow-sm"
                >
                  Step 1: Learn
                </span>
              </div>

              {/* Bottom Details */}
              <div className="space-y-2 mt-auto">
                <h3 className="text-[28px] font-black tracking-tight text-white leading-tight font-sans drop-shadow-md">
                  Study Pro Rotations
                </h3>
                <p className="text-[13.5px] text-slate-200 max-w-md font-medium leading-relaxed drop-shadow-sm">
                  Observe pro teams' actions and learn.
                </p>
                
                <div className="pt-2">
                  <span 
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-white text-slate-900 border border-slate-200 text-[12px] font-bold px-5 py-2.5 rounded-[8px] transition-all duration-200 shadow-sm font-sans"
                  >
                    Study Rotations &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Plan Your Strategy */}
          <div 
            onClick={() => router.push("/boards")}
            className="relative overflow-hidden rounded-[12px] bg-slate-950 border border-slate-800 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_4px_25px_rgba(0,0,0,0.15)] flex flex-col justify-between group min-h-[320px] p-6 text-white"
          >
            {/* Entire Background Image */}
            <div className="absolute inset-0 select-none z-0 pointer-events-none opacity-45 group-hover:scale-[1.02] transition-transform duration-700">
              <img
                src="/whiteboard_preview.png"
                alt="Whiteboard Workspace Preview"
                className="w-full h-full object-cover"
              />
              {/* Premium overlay for typography contrast */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-slate-950/45" />
            </div>

            {/* Content (Sits above the background) */}
            <div className="z-10 flex flex-col justify-between h-full flex-1 gap-6">
              {/* Top Row: Chevron Tag */}
              <div>
                <span 
                  style={{ clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)' }}
                  className="inline-block bg-white text-slate-900 text-[10px] font-mono font-bold uppercase tracking-wider pl-3.5 pr-6 py-1.5 shadow-sm"
                >
                  Step 2: Plan
                </span>
              </div>

              {/* Bottom Details */}
              <div className="space-y-2 mt-auto">
                <h3 className="text-[28px] font-black tracking-tight text-white leading-tight font-sans drop-shadow-md">
                  Plan Your Strategy
                </h3>
                <p className="text-[13.5px] text-slate-200 max-w-md font-medium leading-relaxed drop-shadow-sm">
                  Create custom team rotations, playzones and loot paths.
                </p>
                
                <div className="pt-2">
                  <span 
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-white text-slate-900 border border-slate-200 text-[12px] font-bold px-5 py-2.5 rounded-[8px] transition-all duration-200 shadow-sm font-sans"
                  >
                    Open Canvas &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom row: 3 Smaller Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 3: Master Your Communication */}
          <div 
            onClick={() => router.push("/team")}
            className="relative overflow-hidden rounded-[12px] bg-white border border-[#E5E7EB] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between group"
          >
            {/* Step Label */}
            <span className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wide text-[#4B5563] px-2.5 py-1 rounded-full border border-[#E5E7EB] shadow-sm">
              Step 3: Execute
            </span>
            
            {/* Visual preview */}
            <div className="h-[150px] w-full bg-[#F8F9FA] relative overflow-hidden border-b border-[#E5E7EB] flex items-center justify-center">
              <svg className="w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                <rect x="25" y="25" width="20" height="20" fill="none" stroke="#D1D5DB" strokeWidth="1" />
                <rect x="55" y="30" width="25" height="15" fill="none" stroke="#D1D5DB" strokeWidth="1" />
                <rect x="35" y="60" width="30" height="20" fill="none" stroke="#D1D5DB" strokeWidth="1" />
                <text x="35" y="37" fill="#6366F1" fontSize="5" fontWeight="bold">HOUSE A</text>
                <text x="60" y="39" fill="#10B981" fontSize="5" fontWeight="bold">TOWER</text>
              </svg>
            </div>
            
            {/* Card Content info */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[15px] font-extrabold text-[#111827] mb-1 group-hover:text-primary transition-colors">Master Your Communication</h3>
                <p className="text-[13px] text-[#4B5563] mb-3 leading-normal">
                  Use editable compound names for clear in-game calls.
                </p>
              </div>
              <Button variant="outline" className="border-[#E5E7EB] text-[#4B5563] text-[12px] font-medium px-3 py-1.5 h-8.5 rounded-[8px] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors w-fit pointer-events-none">
                Improve Calls →
              </Button>
            </div>
          </div>

          {/* Card 4: Visualize Your Stats */}
          <div 
            onClick={() => router.push("/analytics")}
            className="relative overflow-hidden rounded-[12px] bg-white border border-[#E5E7EB] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between group"
          >
            {/* Step Label */}
            <span className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wide text-[#4B5563] px-2.5 py-1 rounded-full border border-[#E5E7EB] shadow-sm">
              Step 4: Track
            </span>
            
            {/* Visual preview: SVG Mini Bar Chart */}
            <div className="h-[150px] w-full bg-[#F8F9FA] relative overflow-hidden border-b border-[#E5E7EB] flex items-center justify-center">
              <svg className="w-[75%] h-[60%] opacity-85" viewBox="0 0 100 50">
                <line x1="10" y1="45" x2="90" y2="45" stroke="#D1D5DB" strokeWidth="1" />
                <line x1="10" y1="5" x2="10" y2="45" stroke="#D1D5DB" strokeWidth="0.5" />
                {/* Glowing Indigo bars */}
                <rect x="20" y="25" width="8" height="20" fill="#6366F1" rx="2" className="animate-pulse" />
                <rect x="35" y="15" width="8" height="30" fill="#818CF8" rx="2" />
                <rect x="50" y="32" width="8" height="13" fill="#6366F1" rx="2" />
                <rect x="65" y="8" width="8" height="37" fill="#06B6D4" rx="2" />
                <rect x="80" y="20" width="8" height="25" fill="#6366F1" rx="2" />
              </svg>
            </div>
            
            {/* Card Content info */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[15px] font-extrabold text-[#111827] mb-1 group-hover:text-primary transition-colors">Visualize Your Stats</h3>
                <p className="text-[13px] text-[#4B5563] mb-3 leading-normal">
                  See kills, damage, and other key metrics map by map.
                </p>
              </div>
              <Button variant="outline" className="border-[#E5E7EB] text-[#4B5563] text-[12px] font-medium px-3 py-1.5 h-8.5 rounded-[8px] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors w-fit pointer-events-none">
                Check Stats →
              </Button>
            </div>
          </div>

          {/* Card 5: Rewatch & Mark */}
          <div 
            onClick={() => router.push("/matches")}
            className="relative overflow-hidden rounded-[12px] bg-white border border-[#E5E7EB] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between group"
          >
            {/* Step Label */}
            <span className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wide text-[#4B5563] px-2.5 py-1 rounded-full border border-[#E5E7EB] shadow-sm">
              Step 5: Review
            </span>
            
            {/* Visual preview */}
            <div className="h-[150px] w-full bg-[#F8F9FA] relative overflow-hidden border-b border-[#E5E7EB] flex items-center justify-center">
              <svg className="w-full h-full opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#9CA3AF" strokeWidth="0.5" />
                <path d="M 35,50 L 65,50 M 50,35 L 50,65" stroke="#EF4444" strokeWidth="0.8" />
                <text x="10" y="20" fill="#EF4444" fontSize="6" fontWeight="bold">REC</text>
                <circle cx="28" cy="18" r="2" fill="#EF4444" className="animate-ping" />
              </svg>
            </div>
            
            {/* Card Content info */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-[15px] font-extrabold text-[#111827] mb-1 group-hover:text-primary transition-colors">Rewatch & Mark</h3>
                <p className="text-[13px] text-[#4B5563] mb-3 leading-normal">
                  Rewatch fights and mark key moments on your POV.
                </p>
              </div>
              <Button variant="outline" className="border-[#E5E7EB] text-[#4B5563] text-[12px] font-medium px-3 py-1.5 h-8.5 rounded-[8px] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors w-fit pointer-events-none">
                Analyze POV →
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 5: Daily quote bar */}
      <div className="border-t border-[#E5E7EB] py-4 mt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-left">
        <p className="text-[13px] text-[#4B5563] italic font-medium transition-all duration-300">
          &ldquo;{DAILY_QUOTES[quoteIndex]}&rdquo;
        </p>
        <span className="text-[12px] font-bold text-primary shrink-0 font-mono tracking-wide uppercase">
          — Your daily dose of inspiration
        </span>
      </div>
    </div>
  );
}
