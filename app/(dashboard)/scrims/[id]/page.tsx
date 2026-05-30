"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useTeam";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, AlertTriangle, Trash2, Calendar, Target, Swords, Landmark, TrendingUp, Sparkles, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { RoundEntryForm } from "@/components/scrims/RoundEntryForm";
import { RoundCard } from "@/components/scrims/RoundCard";
import { OverallStandingsForm } from "@/components/scrims/OverallStandingsForm";
import { PrizePoolForm } from "@/components/scrims/PrizePoolForm";
import { ScrimFinancialCard } from "@/components/scrims/ScrimFinancialCard";

interface ScrimSession {
  id: string;
  team_id: string;
  session_date: string;
  time_slot: string;
  total_rounds: number;
  entry_fee: number;
  prize_pool_received: number | null;
  overall_standing: number | null;
  above_team_points: number | null;
  below_team_points: number | null;
  first_place_points: number | null;
  total_scrim_points: number;
  scrim_rounds?: any[];
}

export default function ScrimDetailPage() {
  const { currentTeam } = useTeam();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const queryClient = useQueryClient();
  const [showOverallForm, setShowOverallForm] = useState(false);
  const [showPrizeForm, setShowPrizeForm] = useState(false);

  // Fetch scrim details
  const { data: session, isLoading, error, refetch } = useQuery<ScrimSession>({
    queryKey: ["scrim-detail", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/scrims/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch scrim session");
      return res.json();
    },
    enabled: !!sessionId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/scrims/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete scrim session");
    },
    onSuccess: () => {
      toast.success("Scrim session deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["team-scrims"] });
      router.push("/scrims");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-500 animate-pulse font-medium">Loading scrim details...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-[#111827] bg-[#F8F9FA]">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
          <AlertTriangle className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-[15px] font-semibold text-[#111827] mb-1">Session Not Found</p>
        <p className="text-[13px] text-slate-500 mb-4">This scrim session may have been deleted or does not exist.</p>
        <Link href="/scrims">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors shadow-sm cursor-pointer">
            Back to Scrims
          </Button>
        </Link>
      </div>
    );
  }

  const rounds = session.scrim_rounds || [];
  
  // Sort rounds chronologically by round_number
  rounds.sort((a, b) => a.round_number - b.round_number);

  const totalWins = rounds.filter((r) => r.placement === 1).length;
  const totalTop3 = rounds.filter((r) => r.placement <= 3).length;

  const dateStr = new Date(session.session_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Time slot display formatting
  const formattedTimeSlot = (() => {
    switch (session.time_slot.toLowerCase()) {
      case "12pm": return "12:00 PM";
      case "3pm": return "03:00 PM";
      case "6pm": return "06:00 PM";
      case "9pm": return "09:00 PM";
      case "12am": return "12:00 AM (Midnight)";
      default: return session.time_slot.toUpperCase();
    }
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none text-[#374151]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link href="/scrims">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#E5E7EB] bg-white hover:bg-slate-50 hover:text-[#111827] rounded-[8px] transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-[22px] font-bold text-[#111827] tracking-tight flex items-center gap-2">
              <Clock className="h-5.5 w-5.5 text-[#6366F1]" />
              Scrim Dashboard — {formattedTimeSlot}
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">{dateStr}</p>
          </div>
        </div>

        <Button
          onClick={() => {
            if (confirm("Are you sure you want to delete this scrim session?")) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="bg-transparent border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold px-4 py-2 rounded-[8px] transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Delete Session
        </Button>
      </div>

      {/* Session Overview Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <div className="text-xl font-extrabold font-mono text-emerald-600">{totalWins}</div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold font-mono tracking-wider">Booyah Wins</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-[#6366F1]" />
            <div className="text-xl font-extrabold font-mono text-[#6366F1]">{totalTop3}</div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold font-mono tracking-wider">Top 3 Finishes</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardContent className="p-4 text-center">
            <Sparkles className="h-5 w-5 mx-auto mb-2 text-amber-500" />
            <div className="text-xl font-extrabold font-mono text-amber-600">{session.total_scrim_points}</div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold font-mono tracking-wider">Total Points</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-2 text-slate-400" />
            <div className="text-xl font-extrabold font-mono text-[#111827]">{rounds.length} / {session.total_rounds}</div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold font-mono tracking-wider">Matches Logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Ledger Card */}
      <ScrimFinancialCard entryFee={session.entry_fee} prizePoolReceived={session.prize_pool_received} />

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Recorded Rounds & Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono select-none">Recorded Matches</h2>

          {rounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}

          {/* Inline entry form for remaining rounds */}
          {rounds.length < session.total_rounds && (
            <RoundEntryForm
              sessionId={session.id}
              totalRounds={session.total_rounds}
              existingRounds={rounds}
              onRoundAdded={() => refetch()}
            />
          )}
        </div>

        {/* Right Side: Standings & Comparisons (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono select-none">Lobby Standing Analytics</h2>

          {/* Lobby Standing Ratio Card */}
          {session.overall_standing ? (
            <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                  <Target className="h-4.5 w-4.5 text-[#6366F1]" />
                  Standing Ratios
                </CardTitle>
                <span className="text-xs font-mono font-extrabold text-[#6366F1]">
                  {session.overall_standing}
                  {session.overall_standing === 1 ? "st" : session.overall_standing === 2 ? "nd" : session.overall_standing === 3 ? "rd" : "th"} Place
                </span>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableBody className="divide-y divide-[#E5E7EB]">
                    <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                      <TableCell className="text-xs font-semibold py-3 pl-0 text-slate-700">Your Total Points</TableCell>
                      <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#6366F1]">{session.total_scrim_points} pts</TableCell>
                    </TableRow>

                    {session.overall_standing === 1 ? (
                      <>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-slate-500 py-3 pl-0">2nd Place Points</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#111827]">{session.below_team_points ?? "—"} pts</TableCell>
                        </TableRow>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-slate-500 py-3 pl-0">3rd Place Points</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#111827]">{session.first_place_points ?? "—"} pts</TableCell>
                        </TableRow>
                      </>
                    ) : session.overall_standing === 2 ? (
                      <>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-emerald-600 py-3 pl-0">1st Place Points</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-emerald-650">{session.above_team_points ?? "—"} pts</TableCell>
                        </TableRow>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-slate-500 py-3 pl-0">3rd Place Points</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#111827]">{session.below_team_points ?? "—"} pts</TableCell>
                        </TableRow>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-slate-500 py-3 pl-0">4th Place Points</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#111827]">{session.first_place_points ?? "—"} pts</TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-emerald-600 py-3 pl-0">1st Place Points</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-emerald-650">{session.first_place_points ?? "—"} pts</TableCell>
                        </TableRow>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-[#6366F1] py-3 pl-0">Above Team Points ({session.overall_standing - 1}th)</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#6366F1]">{session.above_team_points ?? "—"} pts</TableCell>
                        </TableRow>
                        <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                          <TableCell className="text-xs font-semibold text-slate-500 py-3 pl-0">Below Team Points ({session.overall_standing + 1}th)</TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#111827]">{session.below_team_points ?? "—"} pts</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>

                <Button
                  onClick={() => setShowOverallForm(true)}
                  variant="outline"
                  className="w-full text-xs font-bold uppercase tracking-wider py-2 mt-4 font-mono bg-slate-50 hover:bg-[#6366F1] hover:text-white border border-[#E5E7EB] text-[#374151] rounded-[8px] transition-colors cursor-pointer"
                >
                  Edit Standings points
                </Button>
              </CardContent>
            </Card>
          ) : (
            <OverallStandingsForm
              sessionId={session.id}
              onSaveComplete={() => refetch()}
            />
          )}

          {/* Inline Edit Form for Standings */}
          {showOverallForm && (
            <div className="border border-[#E5E7EB] rounded-[12px] p-4 bg-white shadow-sm space-y-4">
              <OverallStandingsForm
                sessionId={session.id}
                onSaveComplete={() => {
                  refetch();
                  setShowOverallForm(false);
                }}
                initialStanding={session.overall_standing}
                initialAbove={session.above_team_points}
                initialBelow={session.below_team_points}
                initialFirst={session.first_place_points}
              />
              <Button
                variant="ghost"
                onClick={() => setShowOverallForm(false)}
                className="w-full text-xs uppercase font-mono text-slate-500 hover:text-[#111827] hover:bg-slate-100 rounded-[8px] transition-colors cursor-pointer border border-[#E5E7EB]"
              >
                Close Editor
              </Button>
            </div>
          )}

          {/* Prize pool logs editing */}
          {session.prize_pool_received !== null ? (
            <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                  <Landmark className="h-4.5 w-4.5 text-[#6366F1]" />
                  Financial Records
                </CardTitle>
                <span className="text-xs font-mono font-extrabold text-emerald-600">
                  Top 3 Finisher
                </span>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableBody className="divide-y divide-[#E5E7EB]">
                    <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                      <TableCell className="text-xs font-semibold py-3 pl-0 text-slate-700">Entry Fee Paid</TableCell>
                      <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-[#111827]">${session.entry_fee}</TableCell>
                    </TableRow>
                    <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                      <TableCell className="text-xs font-semibold py-3 pl-0 text-slate-700">Prize Pool Earned</TableCell>
                      <TableCell className="text-xs font-bold font-mono text-right py-3 pr-0 text-emerald-600">${session.prize_pool_received}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Button
                  onClick={() => setShowPrizeForm(true)}
                  variant="outline"
                  className="w-full text-xs font-bold uppercase tracking-wider py-2 mt-4 font-mono bg-slate-50 hover:bg-[#6366F1] hover:text-white border border-[#E5E7EB] text-[#374151] rounded-[8px] transition-colors cursor-pointer"
                >
                  Edit Prize Pool Amount
                </Button>
              </CardContent>
            </Card>
          ) : (
            <PrizePoolForm
              sessionId={session.id}
              entryFee={session.entry_fee}
              onSaveComplete={() => refetch()}
            />
          )}

          {/* Inline Edit Form for Prize */}
          {showPrizeForm && (
            <div className="border border-[#E5E7EB] rounded-[12px] p-4 bg-white shadow-sm space-y-4">
              <PrizePoolForm
                sessionId={session.id}
                entryFee={session.entry_fee}
                onSaveComplete={() => {
                  refetch();
                  setShowPrizeForm(false);
                }}
                initialPrize={session.prize_pool_received}
              />
              <Button
                variant="ghost"
                onClick={() => setShowPrizeForm(false)}
                className="w-full text-xs uppercase font-mono text-slate-500 hover:text-[#111827] hover:bg-slate-100 rounded-[8px] transition-colors cursor-pointer border border-[#E5E7EB]"
              >
                Close Editor
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
