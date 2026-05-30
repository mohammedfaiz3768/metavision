"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Trophy, Landmark } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewTournamentPage() {
  const { currentTeam, isLoading: teamLoading } = useTeam();
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<"official" | "unofficial">("official");
  const [prizePoolType, setPrizePoolType] = useState<"top3" | "top5" | "top12">("top3");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;

    if (!name.trim()) {
      toast.error("Please enter a valid tournament name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: currentTeam.id,
          name,
          type,
          prize_pool_type: prizePoolType,
          start_date: startDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register tournament");
      }

      toast.success("Tournament registered successfully!");
      // Take them to the details page
      router.push(`/tournaments/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (teamLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="h-8 w-8 text-[#7C3AED] animate-spin" />
        <span className="text-sm text-[#9CA3AF] animate-pulse">Checking team profile...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none">
        <div className="h-12 w-12 rounded-full bg-[#1E1F28] border border-[#2A2B35] flex items-center justify-center mb-4">
          <Trophy className="h-6 w-6 text-[#9CA3AF]" />
        </div>
        <h2 className="text-xl font-bold text-white">No Active Team</h2>
        <p className="text-sm text-[#9CA3AF] mt-1 max-w-sm">
          Please join or create a team to register tournaments.
        </p>
        <Link href="/dashboard" className="mt-4">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 text-[#F1F1F3] select-none">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2A2B35]/40 pb-4">
        <Link href="/tournaments">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#2A2B35] bg-[#13141A] hover:bg-[#1E1F28] hover:text-white rounded-[8px] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-[22px] font-bold text-white tracking-tight">Register Tournament</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Set up the tournament parameters before logging matches.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-[#2A2B35] bg-[#13141A]/60 backdrop-blur-sm rounded-[12px] overflow-hidden">
          <CardHeader className="pb-4 border-b border-[#2A2B35]/40 bg-[#09090C]/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5 font-mono">
              <Landmark className="h-4.5 w-4.5 text-[#7C3AED]" />
              Tournament Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Tournament Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#9CA3AF]">Tournament Name</Label>
              <Input
                type="text"
                placeholder="e.g. Free Fire World Series 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type Select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Tournament Type</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as any)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 rounded-[8px] focus:ring-[#7C3AED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3]">
                    <SelectItem value="official" className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer">Official Championship</SelectItem>
                    <SelectItem value="unofficial" className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer">Unofficial Scrimmage/Cup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#9CA3AF]">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="bg-[#1E1F28] border-[#2A2B35] text-white text-xs h-9 rounded-[8px] focus-visible:ring-[#7C3AED]"
                />
              </div>
            </div>

            {/* Prize Pool Split (top3, top5, top12) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#9CA3AF]">Prize Pool Payout Rules</Label>
              <Select
                value={prizePoolType}
                onValueChange={(val) => setPrizePoolType(val as any)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3] text-xs h-9 rounded-[8px] focus:ring-[#7C3AED]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F28] border-[#2A2B35] text-[#F1F1F3]">
                  <SelectItem value="top3" className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer">Top 3 Placements Ledger (Financial Rewards)</SelectItem>
                  <SelectItem value="top5" className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer">Top 5 Placements Ledger (Financial Rewards)</SelectItem>
                  <SelectItem value="top12" className="text-xs hover:bg-[#7C3AED]/20 focus:bg-[#7C3AED]/20 cursor-pointer">Top 12 Placements Ledger (Financial Rewards)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[#9CA3AF] mt-1 leading-relaxed">
                Determines the standings ledger range that qualifies for financial payout logging.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-[#2A2B35]/40 pt-4 px-6 pb-6 select-none bg-[#09090C]/10">
            <Link href="/tournaments">
              <Button type="button" variant="ghost" disabled={isSubmitting} className="text-[#9CA3AF] hover:text-white hover:bg-[#1E1F28] rounded-[8px] transition-colors">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Register Tournament
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

