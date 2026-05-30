"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportButtonProps {
  stageRef: React.RefObject<any>;
  boardTitle: string;
}

export function ExportButton({ stageRef, boardTitle }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) {
      toast.error("Whiteboard canvas not initialized");
      return;
    }

    setExporting(true);
    toast.info("Rendering tactical blueprint in HD...");

    // Run in timeout to allow UI spinner to render and prevent main thread locking
    setTimeout(() => {
      try {
        // Calculate crop bounds to avoid empty stage area exports, or just export full stage
        // Export at 2x resolution for HD visual crispness!
        const dataUrl = stage.toDataURL({
          pixelRatio: 2,
          mimeType: "image/png",
        });

        // Trigger browser download
        const link = document.createElement("a");
        const safeTitle = boardTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        link.download = `ff_intel_${safeTitle}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("HD Blueprint exported successfully!");
      } catch (err: any) {
        console.error("HD Blueprint export failed:", err);
        toast.error("Failed to compile image: WebGL taint or canvas error");
      } finally {
        setExporting(false);
      }
    }, 100);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="font-semibold gap-2 border-border bg-card/40 hover:bg-secondary"
      onClick={handleExport}
      disabled={exporting}
      type="button"
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <Download className="h-4 w-4 text-primary" />
      )}
      <span>Export PNG</span>
    </Button>
  );
}
