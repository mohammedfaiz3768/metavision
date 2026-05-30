"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Landmark, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrimFinancialCardProps {
  entryFee: number;
  prizePoolReceived: number | null;
}

export function ScrimFinancialCard({ entryFee, prizePoolReceived }: ScrimFinancialCardProps) {
  const prize = prizePoolReceived || 0;
  const net = prize - entryFee;
  const isLoss = net < 0;

  return (
    <Card className="border border-[#E5E7EB] bg-white rounded-[12px] overflow-hidden shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center border",
            isLoss ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
          )}>
            <Landmark className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Financial Summary
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Entry: <span className="font-mono font-bold text-[#111827]">${entryFee}</span> | Prize: <span className="font-mono font-bold text-[#111827]">${prize}</span>
            </span>
          </div>
        </div>

        {/* Profit/loss Badge */}
        <div className={cn(
          "px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 border",
          isLoss
            ? "bg-rose-50 border-rose-100 text-rose-700"
            : "bg-emerald-50 border-emerald-100 text-emerald-700"
        )}>
          {isLoss ? (
            <>
              <TrendingDown className="h-4 w-4" />
              Loss -${Math.abs(net)}
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              Profit +${net}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
