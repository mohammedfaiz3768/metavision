"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: "player" | "coach" | "analyst" | "admin" | "owner" | "co_owner";
  created_at: string;
  team_members?: Array<{
    teams: {
      name: string;
      region: string;
    };
  }>;
}

export default function OwnerUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch users with search/filter queries
  const { data: users, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["owner-users", search, roleFilter],
    queryFn: async () => {
      const url = new URL("/api/owner/users", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (roleFilter && roleFilter !== "all") url.searchParams.set("role", roleFilter);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch platform users");
      return res.json();
    },
  });

  // Edit Role Mutation
  const editRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch("/api/owner/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile role");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-users"] });
      queryClient.invalidateQueries({ queryKey: ["owner-stats"] });
      toast.success("User role updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to edit user role");
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    editRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <div className="space-y-6 select-none text-slate-800">
      {/* Header */}
      <PageHeader
        title="Platform Users Center"
        description="Search, filter, promote, and moderate all user profiles registered inside the FF Intel ecosystem."
      />

      {/* Search / Filter Card */}
      <Card className="border border-[#E5E7EB] bg-white text-slate-800 rounded-[12px] overflow-hidden shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Search Input */}
            <div className="flex-1 space-y-2">
              <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-[#6366F1]" /> Search Accounts
              </Label>
              <Input
                placeholder="Search by username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1] placeholder-slate-400"
              />
            </div>

            {/* Role Filter */}
            <div className="w-full md:w-56 space-y-2">
              <Label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[#6366F1]" /> Filter by Role
              </Label>
              <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || "all")}>
                <SelectTrigger className="bg-white border-[#E5E7EB] text-slate-800 text-xs h-9 rounded-[8px] focus:ring-[#6366F1]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E5E7EB] text-slate-800 text-xs">
                  <SelectItem value="all" className="text-xs cursor-pointer">All Roles</SelectItem>
                  <SelectItem value="player" className="text-xs cursor-pointer">Players</SelectItem>
                  <SelectItem value="coach" className="text-xs cursor-pointer">Coaches</SelectItem>
                  <SelectItem value="analyst" className="text-xs cursor-pointer">Analysts</SelectItem>
                  <SelectItem value="admin" className="text-xs cursor-pointer">Administrators</SelectItem>
                  <SelectItem value="owner" className="text-xs cursor-pointer">Owners</SelectItem>
                  <SelectItem value="co_owner" className="text-xs cursor-pointer">Co-Owners</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List Table */}
      <Card className="border border-[#E5E7EB] bg-white text-slate-800 rounded-[12px] overflow-hidden shadow-sm">
        <CardHeader className="pb-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
            <UserCheck className="h-4.5 w-4.5 text-emerald-600" />
            Registered Profiles ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 text-[#6366F1] animate-spin" />
              <p className="text-xs text-slate-500 font-mono animate-pulse">Searching registry database...</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No matching platform users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[9px] uppercase font-mono text-slate-500">
                  <TableRow className="border-b border-[#E5E7EB] hover:bg-transparent">
                    <TableHead className="px-6 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Account</TableHead>
                    <TableHead className="px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Registered Team</TableHead>
                    <TableHead className="px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Registered Date</TableHead>
                    <TableHead className="px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Roster Role</TableHead>
                    <TableHead className="px-6 py-3 text-right font-extrabold text-slate-500 uppercase tracking-wider">Moderator Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5E7EB]">
                  {users.map((profile) => {
                    const teamName = profile.team_members?.[0]?.teams?.name || "No Active Team";
                    const regionName = profile.team_members?.[0]?.teams?.region || "";

                    return (
                      <TableRow key={profile.id} className="border-b border-[#E5E7EB] hover:bg-slate-50/50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200">
                              {profile.avatar_url ? (
                                <AvatarImage src={profile.avatar_url} />
                              ) : null}
                              <AvatarFallback className="bg-slate-100 text-slate-500 text-xs font-bold uppercase">
                                {profile.username.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-xs text-slate-900 block">{profile.username}</span>
                              <span className="text-[10px] text-slate-400 font-mono block select-all mt-0.5">{profile.id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-slate-900 block">{teamName}</span>
                            {regionName && (
                              <Badge variant="outline" className="text-[9px] uppercase font-mono border border-[#E5E7EB] bg-slate-50 text-slate-500 py-0.5 px-1.5 rounded-[4px] mt-1 inline-block">
                                {regionName}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-xs font-mono text-slate-500">
                          {format(new Date(profile.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge
                            className={
                              ["admin", "owner", "co_owner"].includes(profile.role)
                                ? "bg-amber-50 text-amber-600 border border-amber-200/60 text-[10px] font-mono tracking-wider font-extrabold uppercase rounded-[4px] px-2 py-0.5 hover:bg-amber-50"
                                : "bg-indigo-50 text-indigo-650 border border-indigo-200/60 text-[10px] font-mono tracking-wider font-semibold uppercase rounded-[4px] px-2 py-0.5 hover:bg-indigo-50"
                            }
                          >
                            {profile.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="inline-block w-40 text-left">
                            <Select
                                value={profile.role}
                                onValueChange={(val) => handleRoleChange(profile.id, val || "player")}
                                disabled={editRoleMutation.isPending}
                            >
                              <SelectTrigger className="bg-white border-[#E5E7EB] text-slate-800 text-[10px] font-semibold h-8 uppercase tracking-wider rounded-[8px] focus:ring-[#6366F1]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-[#E5E7EB] text-slate-800 text-xs">
                                <SelectItem value="player" className="text-xs uppercase cursor-pointer">Player</SelectItem>
                                <SelectItem value="coach" className="text-xs uppercase cursor-pointer">Coach</SelectItem>
                                <SelectItem value="analyst" className="text-xs uppercase cursor-pointer">Analyst</SelectItem>
                                <SelectItem value="admin" className="text-xs uppercase cursor-pointer">Admin</SelectItem>
                                <SelectItem value="owner" className="text-xs uppercase cursor-pointer">Owner</SelectItem>
                                <SelectItem value="co_owner" className="text-xs uppercase cursor-pointer">Co-Owner</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

