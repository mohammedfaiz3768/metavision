import type { MapConfig, MapId } from "@/lib/types/app.types";

export const MAPS: Record<MapId, MapConfig> = {
  bermuda: {
    id: "bermuda",
    displayName: "Bermuda",
    publicPath: "/maps/bermuda.jpg",
    canonicalSize: { width: 1024, height: 1024 },
  },
  purgatory: {
    id: "purgatory",
    displayName: "Purgatory",
    publicPath: "/maps/purgatory.jpg",
    canonicalSize: { width: 1024, height: 1024 },
  },
  kalahari: {
    id: "kalahari",
    displayName: "Kalahari",
    publicPath: "/maps/kalahari.jpg",
    canonicalSize: { width: 1024, height: 1024 },
  },
  nexterra: {
    id: "nexterra",
    displayName: "Nexterra",
    publicPath: "/maps/nexterra.jpg",
    canonicalSize: { width: 1024, height: 1024 },
  },
  solara: {
    id: "solara",
    displayName: "Solara",
    publicPath: "/maps/solara.jpg",
    canonicalSize: { width: 1024, height: 1024 },
  },
};

export const MAP_LIST: MapConfig[] = Object.values(MAPS);

export function getMapConfig(mapId: MapId): MapConfig {
  return MAPS[mapId];
}
