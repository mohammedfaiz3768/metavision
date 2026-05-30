"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserStatsChart } from "@/components/owner/UserStatsChart";
import { RegionBreakdownChart } from "@/components/owner/RegionBreakdownChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Users, TrendingUp, Landmark, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface StaffMember {
  id: string;
  role: "owner" | "co_owner" | "analyst" | "coach";
  added_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    role: string;
  };
}

interface StatsResponse {
  totalRegistrations: number;
  totalTeams: number;
  registrationTrend: Array<{ month: string; registrations: number }>;
  regionBreakdown: Array<{ region: string; users: number }>;
  staffList: StaffMember[];
}

export default function OwnerDashboardPage() {
  const { data: stats, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ["owner-stats"],
    queryFn: async () => {
      const res = await fetch("/api/owner/stats");
      if (!res.ok) throw new Error("Failed to fetch owner statistics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-550 animate-pulse font-mono font-semibold">Consolidating executive platform metrics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none text-slate-800">
        <ShieldAlert className="h-10 w-10 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Failed to load portal stats</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Please verify your connection and permissions database configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-slate-800">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4 select-none">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Owner Executive Panel</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Monitor system registrations, competitive region counts, active rosters, and manage platform staff.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Users */}
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[#6366F1]" /> Platform Registrations
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono tracking-tight text-slate-900">{stats.totalRegistrations}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total coach, player, and analyst profiles</p>
          </CardContent>
        </Card>

        {/* Total Teams */}
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5 text-cyan-600" /> Organizations Created
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono tracking-tight text-slate-900">{stats.totalTeams}</p>
            <p className="text-[10px] text-slate-400 mt-1">Total registered competitive rosters</p>
          </CardContent>
        </Card>

        {/* Staff Members Count */}
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-600" /> Active Executive Staff
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono tracking-tight text-slate-900">{stats.staffList.length}</p>
            <p className="text-[10px] text-slate-400 mt-1">Administrators with portal capabilities</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Stats Chart */}
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
              <TrendingUp className="h-4.5 w-4.5 text-[#6366F1]" />
              User Registration Trend
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400 font-mono">Monthly cumulative growth growth curves</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <UserStatsChart data={stats.registrationTrend} />
          </CardContent>
        </Card>

        {/* Region Breakdown Chart */}
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
              <MapPin className="h-4.5 w-4.5 text-cyan-600" />
              Competitive Region Allocation
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400 font-mono">Roster registration volume segments by region</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RegionBreakdownChart data={stats.regionBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Staff List Table */}
      <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
        <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
            <ShieldAlert className="h-4.5 w-4.5 text-emerald-600" />
            Executive Staff Registry
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-400 font-mono">Registered accounts with active administrative authorization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] uppercase font-mono">
              <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                <TableHead className="px-6 py-3 font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Administrator</TableHead>
                <TableHead className="px-4 py-3 font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Username</TableHead>
                <TableHead className="px-4 py-3 font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Executive Role</TableHead>
                <TableHead className="px-6 py-3 text-right font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Clearance Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E5E7EB]">
              {stats.staffList.map((staff) => (
                <TableRow key={staff.id} className="border-[#E5E7EB] hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 border border-slate-200">
                        {staff.profiles.avatar_url ? (
                          <AvatarImage src={staff.profiles.avatar_url} />
                        ) : null}
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-bold uppercase">
                          {staff.profiles.username.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-xs text-slate-900">{staff.profiles.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-xs font-mono text-slate-555 text-slate-500">{staff.profiles.username}</TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge
                      className={
                        ["owner", "co_owner"].includes(staff.role)
                          ? "bg-amber-50 text-amber-600 border border-amber-200/60 text-[10px] font-mono tracking-wider font-extrabold uppercase rounded-[4px] px-2 py-0.5 hover:bg-amber-50"
                          : "bg-indigo-50 text-indigo-600 border border-indigo-200/60 text-[10px] font-mono tracking-wider font-semibold uppercase rounded-[4px] px-2 py-0.5 hover:bg-indigo-50"
                      }
                    >
                      {staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-xs font-mono text-slate-500">
                    {format(new Date(staff.added_at), "MMM dd, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
