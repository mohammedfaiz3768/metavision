"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Map, MessageSquare } from "lucide-react";
import { COMMUNICATION_MAPS } from "@/lib/communication/building-data";

export function MapSelector() {
  return (
    <div className="space-y-8 select-none">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-indigo-500" />
          Map Callouts & Communication
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Define team-specific tactical callouts for map compounds and tactical locations. Roles with editing permissions (Coach, Analyst, IGL) can label buildings and areas. Other team members can view the synced callouts.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <Map className="h-5 w-5 text-indigo-400" />
          Select Interactive Map
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMMUNICATION_MAPS.map((map) => (
            <Link key={map.id} href={`/communication/${map.id}`}>
              <Card className="bg-[#13151D]/90 border border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 group overflow-hidden cursor-pointer rounded-2xl relative shadow-xl hover:shadow-indigo-500/5">
                <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13151D] via-transparent to-transparent z-10" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={map.imagePath}
                    alt={map.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-indigo-600/90 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full z-20 border border-indigo-400/20 shadow">
                    Active
                  </div>
                </div>
                <CardContent className="p-5 relative z-20">
                  <h3 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors">
                    {map.displayName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {map.buildings.length} interactive callout slots available
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
