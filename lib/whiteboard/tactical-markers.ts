import type { TacticalMarkerDef } from "@/lib/types/app.types";

export const TACTICAL_MARKERS: TacticalMarkerDef[] = [
  { id: "enemy", label: "Enemy Spotted", icon: "🔴" },
  { id: "loot", label: "Loot Area", icon: "📦" },
  { id: "danger", label: "Danger Zone", icon: "⚠️" },
  { id: "utility", label: "Utility Spot", icon: "💣" },
  { id: "vehicle", label: "Vehicle", icon: "🚗" },
  { id: "sniper", label: "Sniper Angle", icon: "🎯" },
  { id: "rush", label: "Rush Route", icon: "⚡" },
  { id: "fallback", label: "Fallback Route", icon: "↩️" },
  { id: "rotate", label: "Rotation Point", icon: "🔄" },
  { id: "camp", label: "Camp Spot", icon: "🏕️" },
  { id: "zone", label: "Safe Zone", icon: "🟢" },
  { id: "drop", label: "Drop Location", icon: "📍" },
];

export function getMarker(id: string): TacticalMarkerDef | undefined {
  return TACTICAL_MARKERS.find((m) => m.id === id);
}
