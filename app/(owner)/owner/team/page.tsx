"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Plus, Trash2, Shield, Users } from "lucide-react";
import { toast } from "sonner";
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
  staffList: StaffMember[];
}

export default function OwnerTeamPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"owner" | "co_owner" | "analyst" | "coach">("analyst");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff list (using owner/stats endpoint since it returns staffList)
  const { data: stats, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ["owner-stats"],
    queryFn: async () => {
      const res = await fetch("/api/owner/stats");
      if (!res.ok) throw new Error("Failed to fetch owner team members");
      return res.json();
    },
  });

  // Add Staff Mutation
  const addStaffMutation = useMutation({
    mutationFn: async (payload: { username: string; role: string }) => {
      const res = await fetch("/api/owner/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member to staff");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-stats"] });
      toast.success("Executive member added successfully!");
      setUsername("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add member");
    },
  });

  // Remove Staff Mutation
  const removeStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/owner/team?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove staff member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-stats"] });
      toast.success("Executive member removed");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not revoke executive clearance");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    addStaffMutation.mutate({ username, role });
  };

  const handleRemove = (id: string) => {
    if (window.confirm("Are you sure you want to revoke this user's executive credentials? They will immediately lose access to the Owner portal.")) {
      removeStaffMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-600 animate-pulse font-semibold">Loading staff lists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-4 select-none">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Roster & Staff Management</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Register and revoke high-clearance access roles for executive owners, co-owners, and analysts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add Staff Member Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleAddSubmit}>
            <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
              <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
                  <Shield className="h-4.5 w-4.5 text-[#6366F1]" />
                  Grant Clearance Credentials
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">Provide platform accounts with executive status</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">User Username</Label>
                  <Input
                    placeholder="e.g. shadow_analyst"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={addStaffMutation.isPending}
                    className="bg-white border-[#E5E7EB] text-slate-900 text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1] placeholder-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Finds an existing platform user profile matching this exact username.
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">Clearance Role</Label>
                  <Select
                    value={role}
                    onValueChange={(val) => setRole(val as any)}
                    disabled={addStaffMutation.isPending}
                  >
                    <SelectTrigger className="bg-white border-[#E5E7EB] text-slate-800 text-xs h-9 rounded-[8px] focus:ring-[#6366F1]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E7EB] text-slate-800">
                      <SelectItem value="owner" className="text-xs cursor-pointer">Owner</SelectItem>
                      <SelectItem value="co_owner" className="text-xs cursor-pointer">Co-Owner</SelectItem>
                      <SelectItem value="analyst" className="text-xs cursor-pointer">Executive Analyst</SelectItem>
                      <SelectItem value="coach" className="text-xs cursor-pointer">Executive Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-end border-t border-[#E5E7EB] pt-4 pb-4 bg-[#F9FAFB]/50">
                <Button
                  type="submit"
                  disabled={addStaffMutation.isPending || !username.trim()}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold uppercase tracking-wider text-xs px-5 h-9 rounded-[8px] transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {addStaffMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Authorizing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Grant Clearance
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

        {/* Right 2 columns: Staff List Table */}
        <div className="lg:col-span-2">
          <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
                <Users className="h-4.5 w-4.5 text-cyan-600" />
                Staff Directory ({stats?.staffList?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!stats?.staffList || stats.staffList.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 font-mono">
                  No staff members authorized yet.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] uppercase font-mono">
                    <TableRow className="border-[#E5E7EB] hover:bg-transparent">
                      <TableHead className="px-6 py-3 font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Administrator</TableHead>
                      <TableHead className="px-4 py-3 font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Clearance Role</TableHead>
                      <TableHead className="px-4 py-3 font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB]">Registered Date</TableHead>
                      <TableHead className="px-6 py-3 text-right font-extrabold text-slate-500 tracking-wider border-b border-[#E5E7EB] w-20"></TableHead>
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
                              <AvatarFallback className="bg-slate-100 text-slate-500 text-xs font-bold uppercase">
                                {staff.profiles.username.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-xs text-slate-900">{staff.profiles.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge
                            className={
                              ["owner", "co_owner"].includes(staff.role)
                                ? "bg-amber-50 text-amber-600 border border-amber-200/60 text-[10px] font-mono tracking-wider font-extrabold uppercase rounded-[4px] px-2 py-0.5 hover:bg-amber-50"
                                : "bg-indigo-50 text-indigo-650 border border-indigo-200/60 text-[10px] font-mono tracking-wider font-semibold uppercase rounded-[4px] px-2 py-0.5 hover:bg-indigo-50"
                            }
                          >
                            {staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-xs font-mono text-slate-500">
                          {format(new Date(staff.added_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            variant="destructive"
                            className="h-8 w-8 p-0 rounded-[6px] border border-rose-100 text-rose-600 hover:bg-rose-50/50 bg-white flex items-center justify-center cursor-pointer ml-auto shadow-sm transition-colors"
                            onClick={() => handleRemove(staff.id)}
                            disabled={removeStaffMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
