export interface Building {
  id: string;
  type: string;
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
}

export interface MapData {
  id: string;
  displayName: string;
  imagePath: string;
  aspectRatio: number; // width / height
  buildings: Building[];
}

export const COMMUNICATION_MAPS: MapData[] = [
  {
    id: "bermuda",
    displayName: "Bermuda",
    imagePath: "/maps/bermuda.jpg",
    aspectRatio: 1.0,
    buildings: [
      { id: "b1", type: "POI", x: 15, y: 28 }, // Observatory area
      { id: "b2", type: "POI", x: 35, y: 45 }, // Clock Tower area
      { id: "b3", type: "POI", x: 50, y: 40 }, // Bimasakti Strip area
      { id: "b4", type: "POI", x: 52, y: 52 }, // Peak area
      { id: "b5", type: "POI", x: 42, y: 68 }, // Pochinok area
      { id: "b6", type: "POI", x: 58, y: 18 }, // Shipyard area
      { id: "b7", type: "POI", x: 75, y: 35 }, // Mill area
      { id: "b8", type: "POI", x: 82, y: 80 }, // Sentosa area
      { id: "b9", type: "POI", x: 20, y: 68 }, // Hangar area
      { id: "b10", type: "POI", x: 62, y: 75 }, // Kota Tua area
    ],
  },
  {
    id: "purgatory",
    displayName: "Purgatory",
    imagePath: "/maps/purgatory.jpg",
    aspectRatio: 1.0,
    buildings: [
      { id: "p1", type: "POI", x: 50, y: 22 }, // Moathouse area
      { id: "p2", type: "POI", x: 32, y: 28 }, // Crossroads area
      { id: "p3", type: "POI", x: 72, y: 24 }, // Ski Lodge area
      { id: "p4", type: "POI", x: 22, y: 48 }, // Quarry area
      { id: "p5", type: "POI", x: 48, y: 52 }, // Central area
      { id: "p6", type: "POI", x: 52, y: 65 }, // Brasilia area
      { id: "p7", type: "POI", x: 18, y: 80 }, // Mt. Villa area
      { id: "p8", type: "POI", x: 75, y: 68 }, // Golf Course area
      { id: "p9", type: "POI", x: 80, y: 48 }, // Lumber Mill area
      { id: "p10", type: "POI", x: 38, y: 42 }, // Campsite area
    ],
  },
  {
    id: "kalahari",
    displayName: "Kalahari",
    imagePath: "/maps/kalahari.jpg",
    aspectRatio: 1.0,
    buildings: [
      { id: "k1", type: "POI", x: 50, y: 48 }, // Refinery area
      { id: "k2", type: "POI", x: 42, y: 32 }, // Command Post area
      { id: "k3", type: "POI", x: 18, y: 25 }, // Santa Catarina area
      { id: "k4", type: "POI", x: 72, y: 28 }, // Mammoth area
      { id: "k5", type: "POI", x: 65, y: 58 }, // Bayfront area
      { id: "k6", type: "POI", x: 30, y: 72 }, // Stone Ridge area
      { id: "k7", type: "POI", x: 55, y: 75 }, // The Sub area
      { id: "k8", type: "POI", x: 82, y: 68 }, // Confinement area
      { id: "k9", type: "POI", x: 25, y: 42 }, // Council Hall area
      { id: "k10", type: "POI", x: 78, y: 85 }, // Old Hampton area
    ],
  },
  {
    id: "nexterra",
    displayName: "Nexterra",
    imagePath: "/maps/nexterra.jpg",
    aspectRatio: 1.0,
    buildings: [
      { id: "n1", type: "POI", x: 50, y: 25 }, // Intellect Center area
      { id: "n2", type: "POI", x: 22, y: 38 }, // Museum area
      { id: "n3", type: "POI", x: 35, y: 55 }, // Grav Labs area
      { id: "n4", type: "POI", x: 72, y: 45 }, // Deca Square area
      { id: "n5", type: "POI", x: 60, y: 68 }, // Plazas area
      { id: "n6", type: "POI", x: 78, y: 65 }, // Farmtopia area
      { id: "n7", type: "POI", x: 48, y: 78 }, // Zipway area
      { id: "n8", type: "POI", x: 22, y: 72 }, // Mud Site area
      { id: "n9", type: "POI", x: 30, y: 22 }, // Mortar Ruins area
      { id: "n10", type: "POI", x: 75, y: 25 }, // Twin Bridge area
    ],
  },
  {
    id: "solara",
    displayName: "Solara",
    imagePath: "/maps/solara.jpg",
    aspectRatio: 1.0,
    buildings: [
      { id: "s1", type: "POI", x: 18, y: 22 },
      { id: "s2", type: "POI", x: 35, y: 30 },
      { id: "s3", type: "POI", x: 50, y: 25 },
      { id: "s4", type: "POI", x: 65, y: 32 },
      { id: "s5", type: "POI", x: 80, y: 22 },
      { id: "s6", type: "POI", x: 22, y: 68 },
      { id: "s7", type: "POI", x: 38, y: 55 },
      { id: "s8", type: "POI", x: 52, y: 75 },
      { id: "s9", type: "POI", x: 70, y: 62 },
      { id: "s10", type: "POI", x: 82, y: 68 },
    ],
  },
];
