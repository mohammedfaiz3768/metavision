"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, Upload, Plus, Trash2, Sparkles, Swords, 
  Flag, ShieldAlert, Target, HeartHandshake, Loader2, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

// Prepopulated SVGs representing eSports Logos (Circular)
const TEAM_LOGOS = [
  {
    id: "logo-dragons",
    name: "Dragons Gaming",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#1e1b4b" stroke="#ef4444" stroke-width="4"/>
      <path d="M50,15 C65,15 75,25 75,40 C75,55 50,85 50,85 C50,85 25,55 25,40 C25,25 35,15 50,15 Z" fill="#dc2626"/>
      <path d="M50,25 L58,40 L42,40 Z" fill="#fbbf24"/>
      <path d="M50,35 C42,45 58,45 50,60" stroke="#ffffff" stroke-width="3" fill="none"/>
      <circle cx="50" cy="50" r="3" fill="#ffffff"/>
    </svg>`
  },
  {
    id: "logo-phoenix",
    name: "Phoenix Esports",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#18181b" stroke="#f97316" stroke-width="4"/>
      <path d="M30,70 Q50,20 70,70 Q50,60 30,70" fill="#ea580c"/>
      <path d="M40,70 Q50,35 60,70 Q50,62 40,70" fill="#eab308"/>
      <path d="M48,50 L52,50 L50,42 Z" fill="#ffffff"/>
    </svg>`
  },
  {
    id: "logo-wolves",
    name: "Cyber Wolves",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#09090b" stroke="#06b6d4" stroke-width="4"/>
      <path d="M25,35 L40,40 L50,20 L60,40 L75,35 L65,65 L50,80 L35,65 Z" fill="#0891b2" opacity="0.6"/>
      <path d="M35,45 L45,48 L50,35 L55,48 L65,45 L58,62 L50,72 L42,62 Z" fill="#22d3ee"/>
      <polygon points="45,55 48,58 42,58" fill="#ffffff"/>
      <polygon points="55,55 52,58 58,58" fill="#ffffff"/>
    </svg>`
  },
  {
    id: "logo-sharks",
    name: "Sharks Esports",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#022c22" stroke="#0d9488" stroke-width="4"/>
      <path d="M30,50 C30,30 50,20 70,40 C55,40 50,30 45,50 C50,70 65,60 70,60 C50,80 30,70 30,50 Z" fill="#0f766e"/>
      <path d="M40,50 C40,40 50,35 60,45 C50,45 48,38 45,50 C48,62 55,55 60,55 C50,65 40,60 40,50 Z" fill="#2dd4bf"/>
    </svg>`
  },
  {
    id: "logo-titans",
    name: "Titans Alpha",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#1e1b4b" stroke="#8b5cf6" stroke-width="4"/>
      <path d="M25,25 L75,25 L70,65 L50,85 L30,65 Z" fill="#6d28d9"/>
      <path d="M35,32 L65,32 L61,60 L50,73 L39,60 Z" fill="#a78bfa"/>
      <polygon points="50,40 58,55 42,55" fill="#f59e0b"/>
    </svg>`
  },
  {
    id: "logo-viper",
    name: "Viper Gaming",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#022c22" stroke="#22c55e" stroke-width="4"/>
      <path d="M50,20 C60,20 70,30 70,45 C70,65 50,80 50,80 C50,80 30,65 30,45 C30,30 40,20 50,20 Z" fill="#15803d" opacity="0.5"/>
      <path d="M50,30 C55,30 62,35 62,45 C62,58 50,70 50,70 C50,70 38,58 38,45 C38,35 45,30 50,30 Z" fill="#22c55e"/>
      <path d="M46,45 L50,55 L54,45" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>`
  }
];

// Prepopulated SVGs representing Weapons/Guns (Rectangular)
const WEAPONS = [
  {
    id: "gun-ak47",
    name: "AK-47 Rifle",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <path d="M15,45 L25,43 L45,43 L60,40 L90,40 L105,40 L105,43 L90,43 L80,47 L65,47 L55,52 L45,52 L35,52 L25,55 L15,55 Z" fill="#f97316"/>
      <rect x="58" y="43" width="18" height="15" fill="#f97316" rx="2" transform="rotate(15 58 43)"/>
      <rect x="70" y="37" width="22" height="4" fill="#fdba74"/>
      <path d="M98,40 L102,36 L102,40 Z" fill="#fdba74"/>
    </svg>`
  },
  {
    id: "gun-m4a1",
    name: "M4A1 Carbine",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <path d="M10,42 L25,42 L35,42 L55,42 L70,40 L95,40 L110,40 L110,42 L95,42 L90,45 L75,45 L65,50 L50,50 L35,50 L20,50 Z" fill="#3b82f6"/>
      <rect x="62" y="42" width="10" height="12" fill="#3b82f6" rx="1" transform="rotate(10 62 42)"/>
      <rect x="42" y="36" width="15" height="4" fill="#93c5fd"/>
      <rect x="80" y="37" width="15" height="3" fill="#93c5fd"/>
    </svg>`
  },
  {
    id: "gun-awm",
    name: "AWM Sniper",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <path d="M5,45 L20,43 L45,43 L60,40 L100,40 L115,40 L115,41 L100,41 L85,44 L70,44 L55,48 L35,48 L15,50 Z" fill="#22c55e"/>
      <rect x="50" y="33" width="25" height="5" fill="#22c55e"/>
      <line x1="55" y1="38" x2="52" y2="43" stroke="#86efac" stroke-width="2"/>
      <line x1="70" y1="38" x2="67" y2="43" stroke="#86efac" stroke-width="2"/>
      <rect x="80" y="41" width="15" height="2" fill="#86efac"/>
    </svg>`
  },
  {
    id: "item-gloo",
    name: "Gloo Wall Shield",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <path d="M20,60 C20,35 40,25 60,25 C80,25 100,35 100,60 L85,60 C85,45 75,37 60,37 C45,37 35,45 35,60 Z" fill="#06b6d4"/>
      <path d="M40,55 L80,55 L75,51 L45,51 Z" fill="#67e8f9" opacity="0.8"/>
    </svg>`
  },
  {
    id: "item-grenade",
    name: "Frag Grenade",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <ellipse cx="60" cy="45" rx="18" ry="22" fill="#ef4444"/>
      <rect x="54" y="18" width="12" height="6" fill="#fca5a5" rx="1"/>
      <path d="M50,45 L70,45" stroke="#1e293b" stroke-width="2"/>
      <path d="M60,25 L60,65" stroke="#1e293b" stroke-width="2"/>
      <circle cx="68" cy="20" r="4" fill="none" stroke="#fca5a5" stroke-width="2"/>
    </svg>`
  },
  {
    id: "item-medkit",
    name: "Tactical Medkit",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <rect x="40" y="25" width="40" height="30" fill="#10b981" rx="4"/>
      <path d="M60,32 L60,48 M52,40 L68,40" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    </svg>`
  }
];

// Prepopulated SVGs representing Tactical Markers (Mixed shapes)
const TACTICS = [
  {
    id: "tac-waypoint",
    name: "Waypoint Pin",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#ec4899" stroke-width="3"/>
      <path d="M50,20 C35,20 25,32 25,48 C25,68 50,85 50,85 C50,85 75,68 75,48 C75,32 65,20 50,20 Z" fill="#ec4899"/>
      <circle cx="50" cy="45" r="10" fill="#ffffff"/>
    </svg>`
  },
  {
    id: "tac-danger",
    name: "Danger Zone",
    isCircular: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
      <rect width="120" height="80" rx="10" fill="#1e293b" opacity="0.4"/>
      <polygon points="60,15 95,70 25,70" fill="#eab308" stroke="#1e293b" stroke-width="3"/>
      <path d="M60,35 L60,53" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
      <circle cx="60" cy="62" r="3.5" fill="#1e293b"/>
    </svg>`
  },
  {
    id: "tac-target",
    name: "Target Point",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#f43f5e" stroke-width="3"/>
      <circle cx="50" cy="50" r="35" fill="none" stroke="#f43f5e" stroke-width="4"/>
      <circle cx="50" cy="50" r="22" fill="none" stroke="#f43f5e" stroke-width="3"/>
      <circle cx="50" cy="50" r="8" fill="#f43f5e"/>
      <line x1="50" y1="12" x2="50" y2="88" stroke="#f43f5e" stroke-width="3"/>
      <line x1="12" y1="50" x2="88" y2="50" stroke="#f43f5e" stroke-width="3"/>
    </svg>`
  },
  {
    id: "tac-shield",
    name: "Defend Position",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/>
      <path d="M50,22 C62,22 74,26 74,38 C74,58 50,78 50,78 C50,78 26,58 26,38 C26,26 38,22 50,22 Z" fill="#3b82f6"/>
      <path d="M50,30 C57,30 66,33 66,41 C66,55 50,69 50,69 C50,69 34,55 34,41 C34,33 43,30 50,30 Z" fill="#60a5fa"/>
    </svg>`
  },
  {
    id: "tac-flag",
    name: "Rally Flag",
    isCircular: true,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#a855f7" stroke-width="3"/>
      <line x1="38" y1="22" x2="38" y2="78" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <path d="M38,24 L74,38 L38,52 Z" fill="#a855f7"/>
      <circle cx="38" cy="24" r="3.5" fill="#ffffff"/>
    </svg>`
  }
];

interface AssetsStorePanelProps {
  onAddAsset: (asset: { name: string; url: string; isCircular: boolean }) => void;
  allowUpload?: boolean;
}

export function AssetsStorePanel({ onAddAsset, allowUpload = false }: AssetsStorePanelProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "logos" | "weapons" | "tactics" | "uploads">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customUploads, setCustomUploads] = useState<{ id: string; name: string; url: string; isCircular: boolean }[]>([]);

  // Load custom uploads from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("whiteboard_custom_assets");
      if (stored) {
        setCustomUploads(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse custom assets from LocalStorage", e);
    }
  }, []);

  // Save custom uploads helper
  const saveCustomUploads = (newUploads: typeof customUploads) => {
    setCustomUploads(newUploads);
    try {
      localStorage.setItem("whiteboard_custom_assets", JSON.stringify(newUploads));
    } catch (e) {
      console.error("Failed to persist custom assets", e);
    }
  };

  // Add all static assets together
  const allStaticAssets = [
    ...TEAM_LOGOS.map(x => ({ ...x, category: "logos", url: `data:image/svg+xml;utf8,${encodeURIComponent(x.svg)}` })),
    ...WEAPONS.map(x => ({ ...x, category: "weapons", url: `data:image/svg+xml;utf8,${encodeURIComponent(x.svg)}` })),
    ...TACTICS.map(x => ({ ...x, category: "tactics", url: `data:image/svg+xml;utf8,${encodeURIComponent(x.svg)}` }))
  ];

  // Merge static with custom uploads
  const allAssets = [
    ...allStaticAssets,
    ...customUploads.map(x => ({ ...x, category: "uploads" }))
  ];

  // Filtering based on tab & query
  const filteredAssets = allAssets.filter(asset => {
    const matchesCategory = activeCategory === "all" || asset.category === activeCategory;
    const matchesQuery = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Custom upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadIsCircular, setUploadIsCircular] = useState(true);

  // File loading handler
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size exceeds the 3MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        setUploadUrl(base64);
        if (!uploadName) {
          setUploadName(file.name.split(".")[0].substring(0, 20));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomAsset = () => {
    if (!uploadName.trim()) {
      toast.error("Please provide a name for the asset.");
      return;
    }
    if (!uploadUrl) {
      toast.error("Please select an image file first.");
      return;
    }

    const newAsset = {
      id: `custom-asset-${Date.now()}`,
      name: uploadName.trim(),
      url: uploadUrl,
      isCircular: uploadIsCircular
    };

    saveCustomUploads([newAsset, ...customUploads]);
    setUploadName("");
    setUploadUrl("");
    toast.success(`Custom asset "${newAsset.name}" added to library!`);
  };

  const handleDeleteCustomAsset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customUploads.filter(item => item.id !== id);
    saveCustomUploads(updated);
    toast.info("Asset deleted from library.");
  };

  const categories = ["all", "logos", "weapons", "tactics"];
  if (allowUpload || customUploads.length > 0) {
    categories.push("uploads");
  }

  return (
    <div className="space-y-4 select-none flex flex-col h-full min-h-0">
      
      {/* Search Header */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search store assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9 pr-4 bg-[#1C1E26] border-slate-800 text-slate-200 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-lg placeholder:text-slate-550"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0 border-b border-slate-800/40 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as any)}
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
              activeCategory === cat
                ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400 font-extrabold shadow-sm"
                : "bg-[#1C1E26]/40 border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1C1E26]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Contents (Scrollable Grid) */}
      <div className="flex-1 overflow-y-auto pr-0.5 min-h-0 space-y-4 no-scrollbar">
        
        {/* Custom Upload Form shown inside Uploads Tab (Owner only) */}
        {activeCategory === "uploads" && allowUpload && (
          <div className="bg-[#1C1E26]/40 border border-slate-800/80 p-3 rounded-xl space-y-3.5 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Upload Canva Marker
            </span>
            
            <div className="space-y-2">
              <Label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wide">Marker Name</Label>
              <Input
                placeholder="e.g. Squad A Sniper"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="bg-[#0B0C10] border-slate-800 text-[11px] h-8 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUploadIsCircular(true)}
                className={`py-1.5 rounded-lg border text-[10px] font-extrabold cursor-pointer transition ${
                  uploadIsCircular 
                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400" 
                    : "bg-[#0B0C10] border-slate-800 text-slate-500 hover:text-slate-350"
                }`}
              >
                Circular (Logo)
              </button>
              <button
                type="button"
                onClick={() => setUploadIsCircular(false)}
                className={`py-1.5 rounded-lg border text-[10px] font-extrabold cursor-pointer transition ${
                  !uploadIsCircular 
                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400" 
                    : "bg-[#0B0C10] border-slate-800 text-slate-500 hover:text-slate-350"
                }`}
              >
                Rect (Gun/Item)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFile}
                className="hidden"
                id="canva-store-upload"
              />
              <label
                htmlFor="canva-store-upload"
                className="flex-1 flex items-center justify-center gap-2 border border-slate-800 border-dashed rounded-lg bg-[#0B0C10] p-2 text-slate-500 hover:text-slate-300 hover:border-slate-700 cursor-pointer text-[10px] h-10 transition-colors shadow-sm"
              >
                <Upload className="h-3.5 w-3.5 text-slate-400" />
                <span>{uploadUrl ? "Image Loaded" : "Choose File"}</span>
              </label>
              
              {uploadUrl && (
                <Avatar className="h-9 w-9 border border-slate-800 shrink-0">
                  <AvatarImage src={uploadUrl} />
                  <AvatarFallback className="text-[10px] bg-slate-900 text-slate-450 font-bold">M</AvatarFallback>
                </Avatar>
              )}
            </div>

            <Button
              onClick={handleSaveCustomAsset}
              className="w-full text-[10px] font-black uppercase tracking-wider h-8.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md rounded-lg"
            >
              Add to Store Library
            </Button>
          </div>
        )}

        {/* Display Filtered Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-slate-550 space-y-1.5 select-none">
            <ImageIcon className="h-7 w-7 text-slate-650 mx-auto opacity-30" />
            <p className="text-[10.5px] font-bold text-slate-400">No assets found</p>
            <p className="text-[9.5px]">Try typing another keyword or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onAddAsset({ name: asset.name, url: asset.url, isCircular: asset.isCircular })}
                className="group relative flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800/40 bg-[#1C1E26]/30 hover:bg-[#1C1E26]/90 hover:border-indigo-500/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.12)] cursor-pointer select-none transition-all duration-200"
              >
                {/* SVG/Image Preview Box */}
                <div className="w-16 h-16 flex items-center justify-center rounded-lg overflow-hidden bg-slate-950/20 group-hover:scale-105 transition-transform duration-200 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className={`w-full h-full object-contain p-1.5 ${asset.isCircular ? "rounded-full" : ""}`}
                  />
                </div>

                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 text-center line-clamp-1 mt-2 w-full px-1">
                  {asset.name}
                </span>

                {/* Subtitle tag */}
                <span className="text-[8px] font-mono text-slate-600 group-hover:text-indigo-400 uppercase tracking-widest leading-none mt-0.5">
                  {asset.category === "uploads" ? "Custom" : asset.category}
                </span>

                {/* Delete option for custom uploads (Owner only) */}
                {asset.category === "uploads" && allowUpload && (
                  <button
                    onClick={(e) => handleDeleteCustomAsset(e, asset.id)}
                    className="absolute top-1.5 right-1.5 h-5 w-5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/30 text-rose-400 hover:text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove custom marker"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
