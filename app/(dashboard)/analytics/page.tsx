"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useTeam";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from "recharts";
import { Loader2, TrendingUp, BarChart3, Users, AlertTriangle, Swords, Trophy, DollarSign, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

interface AnalyticsResponse {
  matches: any[];
  players: any[];
}

export default function AnalyticsPage() {
  const { currentTeam, isLoading: teamLoading } = useTeam();
  const [activeTab, setActiveTab] = useState("telemetry");

  // 1. Performance Telemetry query
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["team-analytics-aggregates", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return { matches: [], players: [] };
      const response = await fetch(`/api/analytics?team_id=${currentTeam.id}`);
      if (!response.ok) throw new Error("Failed to load performance aggregates");
      return response.json();
    },
    enabled: !!currentTeam?.id && activeTab === "telemetry",
  });

  // 2. Scrims query for Scrim Financials
  const { data: scrims, isLoading: scrimsLoading } = useQuery<any[]>({
    queryKey: ["scrims-analytics", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const response = await fetch(`/api/scrims?team_id=${currentTeam.id}`);
      if (!response.ok) throw new Error("Failed to fetch scrims");
      return response.json();
    },
    enabled: !!currentTeam?.id && activeTab === "financials",
  });

  // 3. Tournaments query for Tournament Analysis
  const { data: tournaments, isLoading: tournamentsLoading } = useQuery<any[]>({
    queryKey: ["tournaments-analytics", currentTeam?.id],
    queryFn: async () => {
      if (!currentTeam) return [];
      const response = await fetch(`/api/tournaments?team_id=${currentTeam.id}`);
      if (!response.ok) throw new Error("Failed to fetch tournaments");
      return response.json();
    },
    enabled: !!currentTeam?.id && activeTab === "tournaments",
  });

  const loading = teamLoading || analyticsLoading || scrimsLoading || tournamentsLoading;

  // Process Scrim Financials metrics
  const scrimFinancialsStats = useMemo(() => {
    if (!scrims || scrims.length === 0) {
      return { total: 0, feesPaid: 0, prizePoolReceived: 0, netProfit: 0, chartData: [] };
    }

    let feesPaid = 0;
    let prizePoolReceived = 0;
    const chartData = [];

    // Sort by date ascending for chronologically correct chart flow
    const sortedScrims = [...scrims].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

    for (const s of sortedScrims) {
      const fee = Number(s.entry_fee) || 0;
      const prize = Number(s.prize_pool_received) || 0;
      feesPaid += fee;
      prizePoolReceived += prize;

      chartData.push({
        date: format(new Date(s.session_date), "MMM dd"),
        "Entry Fee": fee,
        "Prize Received": prize,
        Profit: prize - fee,
      });
    }

    return {
      total: scrims.length,
      feesPaid,
      prizePoolReceived,
      netProfit: prizePoolReceived - feesPaid,
      chartData,
    };
  }, [scrims]);

  // Process Tournament Analysis metrics
  const tournamentStats = useMemo(() => {
    if (!tournaments || tournaments.length === 0) {
      return { total: 0, official: 0, unofficial: 0, totalWinnings: 0, chartData: [] };
    }

    let official = 0;
    let unofficial = 0;
    let totalWinnings = 0;
    const chartData = [];

    const sortedTournaments = [...tournaments].sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    for (const t of sortedTournaments) {
      if (t.type === "official") official++;
      else unofficial++;

      const prize = Number(t.prize_received) || 0;
      totalWinnings += prize;

      chartData.push({
        name: t.name.substring(0, 10) + "...",
        Winnings: prize,
        Rank: t.final_position || "Active",
      });
    }

    return {
      total: tournaments.length,
      official,
      unofficial,
      totalWinnings,
      chartData,
    };
  }, [tournaments]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Compiling database telemetries...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-white">
        <div className="w-12 h-12 rounded-full bg-[#1E1F28] flex items-center justify-center mb-4 border border-[#2A2B35]">
          <AlertTriangle className="w-5 h-5 text-[#6B7280]" />
        </div>
        <p className="text-[15px] font-semibold text-white mb-1">No active roster</p>
        <p className="text-[13px] text-[#9CA3AF] mb-4">Please join or create a team to access performance graphs and telemetry math.</p>
        <Link href="/dashboard">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium px-4 py-2 rounded-[8px] transition-colors">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-[#111827]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4 select-none">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Tactical Analytics Center</h1>
          <p className="text-[13px] text-[#4B5563] mt-1">
            Monitor squad rank progression, K/D telemetry, scrim cash flows, and tournament winnings.
          </p>
        </div>
      </div>

      <Tabs defaultValue="telemetry" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-[#E5E7EB] p-1 mb-6 rounded-[8px] flex w-fit gap-1 select-none">
          <TabsTrigger value="telemetry" className="text-[11px] gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[#4B5563] data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-[#111827] rounded-[6px] transition-all duration-150 cursor-pointer">
            <Activity className="h-3.5 w-3.5" /> Telemetry Performance
          </TabsTrigger>
          <TabsTrigger value="financials" className="text-[11px] gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[#4B5563] data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-[#111827] rounded-[6px] transition-all duration-150 cursor-pointer">
            <Swords className="h-3.5 w-3.5" /> Scrim Financials
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="text-[11px] gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[#4B5563] data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:text-[#111827] rounded-[6px] transition-all duration-150 cursor-pointer">
            <Trophy className="h-3.5 w-3.5" /> Tournaments Analysis
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TELEMETRY PERFORMANCE */}
        <TabsContent value="telemetry" className="space-y-6">
          {(!analyticsData?.matches || analyticsData.matches.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#E5E7EB] rounded-[12px] bg-white shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-[#E5E7EB]">
                <BarChart3 className="w-5 h-5 text-[#4B5563]" />
              </div>
              <p className="text-[15px] font-semibold text-[#111827] mb-1">No telemetry compiled yet</p>
              <p className="text-[13px] text-[#4B5563] max-w-sm">Please log matches in scorecards to generate telemetry.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Existing charts layout from initial page */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* rank progression */}
                <div className="lg:col-span-8">
                  <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px] overflow-hidden">
                    <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5 font-mono">
                        <TrendingUp className="h-4.5 w-4.5 text-primary" />
                        Squad Rank Progression
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-72 w-full text-xs font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData.matches.map((m, idx) => ({ name: `M${idx + 1}`, placement: m.placement }))} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorPlacement" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#9CA3AF" />
                            <YAxis reversed domain={[1, 12]} tickCount={6} stroke="#9CA3AF" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#FFFFFF",
                                borderColor: "#E5E7EB",
                                borderRadius: "8px",
                                color: "#111827",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="placement"
                              name="Rank Finish"
                              stroke="#6366F1"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorPlacement)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* map placements */}
                <div className="lg:col-span-4">
                  <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between rounded-[12px] overflow-hidden">
                    <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5 font-mono">
                        <BarChart3 className="h-4.5 w-4.5 text-[#10B981]" />
                        Map Placements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1 flex flex-col justify-center">
                      <div className="h-60 w-full text-xs font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(analyticsData.matches.reduce((acc: any, curr: any) => {
                            acc[curr.map] = acc[curr.map] || { sum: 0, count: 0 };
                            acc[curr.map].sum += curr.placement;
                            acc[curr.map].count++;
                            return acc;
                          }, {})).map(([mapName, data]: any) => ({ mapName, avgPlacement: Number((data.sum / data.count).toFixed(1)) }))} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <XAxis dataKey="mapName" stroke="#9CA3AF" className="capitalize" />
                            <YAxis reversed domain={[1, 12]} stroke="#9CA3AF" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#FFFFFF",
                                borderColor: "#E5E7EB",
                                borderRadius: "8px",
                                color: "#111827",
                              }}
                            />
                            <Bar dataKey="avgPlacement" name="Avg Placement" fill="#10B981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Roster Averages Scorecard Table */}
              <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px] overflow-hidden">
                <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5 font-mono">
                    <Users className="h-4.5 w-4.5 text-primary" />
                    Roster Performance Averages
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E5E7EB] bg-slate-50/50 text-[10px] hover:bg-transparent">
                        <TableHead className="px-6 py-3 font-extrabold text-[#4B5563] uppercase tracking-wider">Player Name</TableHead>
                        <TableHead className="px-4 py-3 text-center font-extrabold text-[#4B5563] uppercase tracking-wider">Total Kills</TableHead>
                        <TableHead className="px-6 py-3 text-right font-extrabold text-[#4B5563] uppercase tracking-wider">Teammate Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-[#E5E7EB]">
                      {analyticsData.players.map((p, idx) => (
                        <TableRow key={idx} className="border-[#E5E7EB] hover:bg-slate-50/30 transition-colors">
                          <TableCell className="px-6 py-4 font-semibold text-xs text-[#111827]">{p.player_name || "Unknown Teammate"}</TableCell>
                          <TableCell className="px-4 py-4 text-center text-xs font-mono font-bold text-amber-600">{p.kills}</TableCell>
                          <TableCell className="px-6 py-4 text-right text-xs text-[#4B5563] font-mono">{p.survived ? "SUPPORT" : "IGL"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SCRIM FINANCIALS */}
        <TabsContent value="financials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Total Scrim Sessions
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-[#111827]">{scrimFinancialsStats.total}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Recorded campaigns</p>
              </CardContent>
            </Card>

            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-rose-600" /> Total Entry Fees Paid
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-rose-605">
                  ${scrimFinancialsStats.feesPaid.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Investment capital</p>
              </CardContent>
            </Card>

            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Cumulative Prizes
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
                  ${scrimFinancialsStats.prizePoolReceived.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Gross cash returns</p>
              </CardContent>
            </Card>

            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Net Scrim Winnings
                </span>
              </CardHeader>
              <CardContent>
                <p className={scrimFinancialsStats.netProfit >= 0 ? "text-2xl font-bold font-mono tracking-tight text-emerald-600" : "text-2xl font-bold font-mono tracking-tight text-rose-600"}>
                  {scrimFinancialsStats.netProfit >= 0 ? "+" : ""}${scrimFinancialsStats.netProfit.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Profit/Loss ledger balance</p>
              </CardContent>
            </Card>
          </div>

          {/* Scrim Winnings chart */}
          <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px] overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5 font-mono">
                <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
                Scrim Cash Flows Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!scrims || scrims.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#4B5563] font-mono border border-dashed border-[#E5E7EB] rounded-[8px] bg-slate-50/20">
                  No scrim parameters found. Create a scrim session to plot cash flows.
                </div>
              ) : (
                <div className="h-72 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scrimFinancialsStats.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E5E7EB",
                          borderRadius: "8px",
                          color: "#111827",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Entry Fee" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Prize Received" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TOURNAMENTS ANALYSIS */}
        <TabsContent value="tournaments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-primary" /> Campaigns Registered
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-[#111827]">{tournamentStats.total}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Registered tournaments</p>
              </CardContent>
            </Card>

            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" /> Official Championships
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-amber-550">{tournamentStats.official}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Championship campaigns</p>
              </CardContent>
            </Card>

            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-sky-600" /> Unofficial Cups
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-sky-600">{tournamentStats.unofficial}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Tactical cup lobbies</p>
              </CardContent>
            </Card>

            <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px]">
              <CardHeader className="pb-1.5">
                <span className="text-[10px] font-mono font-semibold text-[#4B5563] uppercase flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Tournament Earnings
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
                  ${tournamentStats.totalWinnings.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Total prize pools won</p>
              </CardContent>
            </Card>
          </div>

          {/* Tournament winnings chart */}
          <Card className="border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.03)] rounded-[12px] overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5 font-mono">
                <Trophy className="h-4.5 w-4.5 text-amber-500" />
                Tournament Prize Winnings Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!tournaments || tournaments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#4B5563] font-mono border border-dashed border-[#E5E7EB] rounded-[8px] bg-slate-50/20">
                  No tournaments found. Create a tournament to begin tracking.
                </div>
              ) : (
                <div className="h-72 w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tournamentStats.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E5E7EB",
                          borderRadius: "8px",
                          color: "#111827",
                        }}
                      />
                      <Bar dataKey="Winnings" fill="#EAB308" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
