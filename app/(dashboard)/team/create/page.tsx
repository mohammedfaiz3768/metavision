"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const REGIONS = [
  { id: "NA", name: "North America" },
  { id: "LATAM", name: "Latin America" },
  { id: "BR", name: "Brazil" },
  { id: "EU", name: "Europe" },
  { id: "MEA", name: "Middle East & Africa" },
  { id: "PK", name: "Pakistan" },
  { id: "IND", name: "India" },
  { id: "SEA", name: "Southeast Asia" },
];

export default function CreateTeamPage() {
  const [teamName, setTeamName] = useState("");
  const [region, setRegion] = useState("SEA");
  const [role, setRole] = useState("coach");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { refetch } = useTeam();
  const supabase = createClient();

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Insert team
      const { data: team, error: teamError } = await (supabase
        .from("teams") as any)
        .insert({
          name: teamName,
          owner_id: user.id,
          region,
        })
        .select()
        .single();

      if (teamError) {
        toast.error(`Team creation failed: ${teamError.message}`);
        setLoading(false);
        return;
      }

      // 2. Insert team member mapping for owner
      const { error: memberError } = await (supabase.from("team_members") as any).insert({
        team_id: team.id,
        user_id: user.id,
        role: role as any,
      });

      if (memberError) {
        toast.error(`Roster assignment failed: ${memberError.message}`);
        setLoading(false);
        return;
      }

      toast.success("Team successfully created!");
      await refetch();
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
            <Users className="h-5 w-5" />
            <span>Esports Roster Creation</span>
          </div>
          <CardTitle className="text-2xl font-bold">Assemble Your Squad</CardTitle>
          <CardDescription>
            Create an analytical tactical center for your Free Fire esports team.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateTeam}>
          <CardContent className="space-y-4">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                placeholder="e.g. EVOS Phoenix, Fluxo, Magic Squad"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label htmlFor="region">Competitive Region</Label>
              <Select value={region} onValueChange={(val) => setRegion(val || "SEA")} disabled={loading}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((reg) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.name} ({reg.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Your Role in Team</Label>
              <Select value={role} onValueChange={(val) => setRole(val || "coach")} disabled={loading}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach">Head Coach</SelectItem>
                  <SelectItem value="analyst">Lead Analyst</SelectItem>
                  <SelectItem value="IGL">In-Game Leader (IGL)</SelectItem>
                  <SelectItem value="player">Slayer / Entry / Support</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground pt-1 leading-normal">
                Coaches, analysts, and IGLs have administrative credentials to create and delete whiteboards. All teammates can draw.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4">
            <Link href="/dashboard">
              <Button type="button" variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="px-6 font-semibold">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assemble Team
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
