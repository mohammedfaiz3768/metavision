"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrizePoolFormProps {
  sessionId: string;
  entryFee: number;
  onSaveComplete: () => void;
  initialPrize?: number | null;
}

export function PrizePoolForm({
  sessionId,
  entryFee,
  onSaveComplete,
  initialPrize = null,
}: PrizePoolFormProps) {
  const [finishedTop3, setFinishedTop3] = useState<boolean>(initialPrize !== null && initialPrize > 0);
  const [prizeAmount, setPrizeAmount] = useState<string>(initialPrize !== null ? String(initialPrize) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      prize_pool_received: finishedTop3 ? (parseFloat(prizeAmount) || 0) : null,
    };

    try {
      const response = await fetch(`/api/scrims/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save financial details");
      }

      toast.success("Prize pool and cash flows recorded!");
      onSaveComplete();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live profit/loss preview
  const parsedPrize = finishedTop3 ? (parseFloat(prizeAmount) || 0) : 0;
  const netProfit = parsedPrize - entryFee;
  const isLoss = netProfit < 0;

  return (
    <Card className="border-[#E5E7EB] bg-white rounded-[12px] shadow-sm">
      <CardHeader className="pb-3 border-b border-[#E5E7EB] bg-slate-50/50">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
          <Landmark className="h-4.5 w-4.5 text-[#6366F1]" />
          Prize & Cash Flow Ledger
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top 3 Toggle */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block">
              Did your team finish in the top 3?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFinishedTop3(true)}
                className={cn(
                  "py-2 px-3 rounded-md text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                  finishedTop3
                    ? "bg-[#6366F1]/10 border-[#6366F1] text-[#6366F1]"
                    : "bg-white border-[#D1D5DB] text-slate-500 hover:text-[#111827]"
                )}
              >
                Yes, Top 3 Finish
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinishedTop3(false);
                  setPrizeAmount("");
                }}
                className={cn(
                  "py-2 px-3 rounded-md text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                  !finishedTop3
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-white border-[#D1D5DB] text-slate-500 hover:text-[#111827]"
                )}
              >
                No Top 3 Finish
              </button>
            </div>
          </div>

          {/* Prize Amount Input */}
          {finishedTop3 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block">
                Prize Pool Amount Received
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={prizeAmount}
                  onChange={(e) => setPrizeAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full bg-white border border-[#D1D5DB] rounded-md pl-8 pr-3 py-2 text-xs font-medium font-mono text-[#111827] focus:ring-1 focus:ring-[#6366F1] focus:outline-none"
                />
                <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          )}

          {/* Live Financial Profit/Loss Review */}
          <div className="bg-slate-50 border border-[#E5E7EB] rounded-lg p-3 space-y-2 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Cash Flow Projection</span>
            <div className="flex items-center justify-center gap-6">
              <div>
                <span className="text-[9px] text-slate-500 block">Entry Fee</span>
                <span className="text-xs font-mono font-bold text-[#111827]">-${entryFee}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Prize Received</span>
                <span className="text-xs font-mono font-bold text-[#111827]">+${parsedPrize}</span>
              </div>
              <div className="border-l border-[#E5E7EB] pl-6">
                <span className="text-[9px] text-slate-500 block">Net Yield</span>
                <span className={cn(
                  "text-sm font-mono font-extrabold",
                  isLoss ? "text-rose-700" : "text-emerald-700"
                )}>
                  {isLoss ? "" : "+"}${netProfit}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-xs font-bold uppercase tracking-wider py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-[8px]"
          >
            {isSubmitting ? "Saving Ledger..." : "Save Financial Ledger"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
