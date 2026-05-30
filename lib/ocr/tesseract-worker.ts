import { createWorker } from "tesseract.js";
import type { OcrPlayerResult, OcrResult } from "@/lib/types/app.types";

export type WorkerState = "idle" | "loading" | "ready" | "processing" | "destroyed";

class TesseractSingleton {
  private worker: any = null;
  private state: WorkerState = "idle";
  private currentPromise: Promise<any> | null = null;

  getState(): WorkerState {
    return this.state;
  }

  async getWorker() {
    if (this.state === "destroyed" || !this.worker) {
      this.state = "loading";
      // Lazy load worker
      this.worker = await createWorker();
      this.state = "ready";
    }
    return this.worker;
  }

  async terminateActiveWorker() {
    if (this.worker) {
      this.state = "destroyed";
      try {
        await this.worker.terminate();
      } catch (e) {
        console.error("Failed to terminate OCR worker:", e);
      }
      this.worker = null;
      this.state = "idle";
    }
  }

  /**
   * Run OCR on a base64 preprocessed image URL with vertical proximity clustering.
   */
  async processScreenshot(base64Image: string): Promise<OcrResult> {
    if (this.state === "processing") {
      throw new Error("OCR worker is currently processing another screenshot. Request locked.");
    }

    this.state = "processing";
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("OCR parsing timed out (20s limit exceeded)")), 20000)
    );

    try {
      const ocrTask = async () => {
        const workerInstance = await this.getWorker();
        const { data } = await workerInstance.recognize(base64Image);
        
        // Extract words with word coordinates
        const words = data.words || [];
        
        // Spatial Clustering: Y-axis vertical midpoint grouping
        const rows: any[][] = [];
        const rowThreshold = 15; // Vertical px distance to group text on the same scoreboard line

        words.forEach((word: any) => {
          const bbox = word.bbox;
          if (!bbox) return;

          const yCenter = (bbox.y0 + bbox.y1) / 2;

          // Find if there is an existing row matching this vertical center
          let foundRow = rows.find((r) => {
            const firstWordBbox = r[0].bbox;
            const rCenter = (firstWordBbox.y0 + firstWordBbox.y1) / 2;
            return Math.abs(yCenter - rCenter) < rowThreshold;
          });

          if (foundRow) {
            foundRow.push(word);
          } else {
            rows.push([word]);
          }
        });

        // Sort rows vertically (Y-axis top-to-bottom)
        rows.sort((a, b) => a[0].bbox.y0 - b[0].bbox.y0);

        // Sort words horizontally within each row (X-axis left-to-right)
        rows.forEach((row) => {
          row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        });

        // Map structured rows to OCR scoreboard items
        const players: OcrPlayerResult[] = [];
        let placement: number | null = null;
        let total_kills: number | null = null;

        rows.forEach((row) => {
          const rowText = row.map((w) => w.text).join(" ").trim();
          const lowerText = rowText.toLowerCase();

          // Match placement rank (e.g. "Rank 2", "Placement #4", "1st", "2nd")
          if (lowerText.includes("rank") || lowerText.includes("place") || lowerText.includes("placement")) {
            const numMatch = rowText.match(/\d+/);
            if (numMatch) {
              placement = parseInt(numMatch[0]);
            }
          }

          // Match overall team kills
          if (lowerText.includes("squad kills") || lowerText.includes("team kills") || lowerText.includes("total kills")) {
            const numMatch = rowText.match(/\d+/);
            if (numMatch) {
              total_kills = parseInt(numMatch[0]);
            }
          }

          // Match scorecard rows: look for name token followed by numeric tokens (e.g., "Faiz 4 1250")
          const numbers = row
            .filter((w) => /^\d+$/.test(w.text))
            .map((w) => parseInt(w.text));

          const textTokens = row
            .filter((w) => !/^\d+$/.test(w.text) && w.text.length > 2)
            .map((w) => w.text);

          if (textTokens.length > 0 && numbers.length >= 2 && players.length < 4) {
            const name = textTokens.join(" ");
            // Usually the first number is Kills, second is Damage
            const kills = numbers[0];
            const damage = numbers[1];
            players.push({
              name: name.substring(0, 15), // cap player name
              kills,
              damage,
              survived: lowerText.includes("alive") || lowerText.includes("yes") || false,
            });
          }
        });

        // Fill remaining players up to 4 if OCR missed some rows
        while (players.length < 4) {
          players.push({
            name: `Player ${players.length + 1}`,
            kills: 0,
            damage: 0,
            survived: false,
          });
        }

        return {
          placement: placement || 12,
          total_kills: total_kills || 0,
          players,
          requires_manual_input: true,
          raw_text: data.text || "",
        };
      };

      const result = await Promise.race([ocrTask(), timeoutPromise]);
      this.state = "ready";
      return result;
    } catch (err) {
      // On failure or timeout, destroy the worker to avoid memory leaks
      await this.terminateActiveWorker();
      this.state = "ready";
      throw err;
    }
  }
}

export const ocrWorkerInstance = new TesseractSingleton();
