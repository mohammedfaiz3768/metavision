"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Swords, AlertTriangle, Landmark } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const TIME_SLOTS = [
  { id: "12pm", label: "12:00 PM" },
  { id: "3pm", label: "03:00 PM" },
  { id: "6pm", label: "06:00 PM" },
  { id: "9pm", label: "09:00 PM" },
  { id: "12am", label: "12:00 AM (Midnight)" },
];

export default function NewScrimSessionPage() {
  const { currentTeam, isLoading: teamLoading } = useTeam();
  const router = useRouter();

  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState("12pm");
  const [roundsCount, setRoundsCount] = useState<number>(6);
  const [entryFee, setEntryFee] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;

    const parsedFee = parseFloat(entryFee);
    if (isNaN(parsedFee) || parsedFee < 0) {
      toast.error("Please enter a valid entry fee amount.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/scrims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: currentTeam.id,
          session_date: sessionDate,
          time_slot: timeSlot,
          total_rounds: roundsCount,
          entry_fee: parsedFee,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create scrim session");
      }

      toast.success("Scrim session created successfully!");
      router.push(`/scrims/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (teamLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-3 select-none bg-[#F8F9FA]">
        <Loader2 className="h-8 w-8 text-[#6366F1] animate-spin" />
        <span className="text-sm text-slate-500 animate-pulse font-medium">Checking team profile...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-4 select-none bg-[#F8F9FA]">
        <div className="h-12 w-12 rounded-full bg-slate-50 border border-[#E5E7EB] flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-[#111827]">No Active Team</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Please join or create a team to record scrim sessions.
        </p>
        <Link href="/team/create" className="mt-4">
          <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-sm cursor-pointer">
            Establish Team
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 text-[#374151] select-none">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
        <Link href="/scrims">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-[#E5E7EB] bg-white hover:bg-slate-50 hover:text-[#111827] rounded-[8px] transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="space-y-0.5">
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Create Scrim Session</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Step 1: Set up the scrim parameters before entering round results.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
          <CardHeader className="pb-4 border-b border-[#E5E7EB] bg-slate-50/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
              <Landmark className="h-4 w-4 text-[#6366F1]" />
              Lobby Setup & Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Session Date</Label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 rounded-[8px] focus-visible:ring-[#6366F1]"
                />
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Lobby Time Slot</Label>
                <Select value={timeSlot} onValueChange={(val) => setTimeSlot(val || "12pm")} disabled={isSubmitting}>
                  <SelectTrigger className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 rounded-[8px] focus:ring-[#6366F1] font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB] text-[#111827] font-mono text-xs">
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id} className="text-xs hover:bg-slate-50 focus:bg-slate-50 cursor-pointer">
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rounds count Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Total Rounds</Label>
                <Select
                  value={String(roundsCount)}
                  onValueChange={(val) => setRoundsCount(Number(val))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 rounded-[8px] focus:ring-[#6366F1] font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB] text-[#111827] text-xs font-mono">
                    <SelectItem value="3" className="text-xs hover:bg-slate-50 focus:bg-slate-50 cursor-pointer">3 Rounds</SelectItem>
                    <SelectItem value="6" className="text-xs hover:bg-slate-50 focus:bg-slate-50 cursor-pointer">6 Rounds (Default)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entry Fee (Required) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Entry Fee Amount</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 50.00"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-white border-[#D1D5DB] text-[#111827] text-xs h-9 font-mono rounded-[8px] focus-visible:ring-[#6366F1]"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-[#E5E7EB] pt-4 px-6 pb-6 select-none bg-slate-50/50">
            <Link href="/scrims">
              <Button type="button" variant="ghost" disabled={isSubmitting} className="text-[#4B5563] hover:text-[#111827] hover:bg-slate-100 rounded-[8px] transition-colors cursor-pointer border border-transparent">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !entryFee.trim()}
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold px-6 py-2 rounded-[8px] transition-all duration-150 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4 mr-2" />
                  Create Session
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

