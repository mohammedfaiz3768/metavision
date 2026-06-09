"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Megaphone, Plus, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface TeamItem {
  id: string;
  name: string;
}

export default function NewRecruitmentPost() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient() as any;

  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState<"player_seeking_team" | "team_seeking_player">("player_seeking_team");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Roles tags
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");

  // User team
  const [userTeam, setUserTeam] = useState<TeamItem | null>(null);

  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    async function fetchUserTeam() {
      // Find team uploader belongs to
      const { data: memberData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (memberData?.team_id) {
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", memberData.team_id)
          .single();
        
        if (teamData) {
          setUserTeam(teamData);
        }
      }
    }

    fetchUserTeam();
  }, [user, supabase]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading form...</span>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  const handleAddRole = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = roleInput.trim().replace(/,/g, "");
      if (tag && !roles.includes(tag)) {
        setRoles([...roles, tag]);
        setRoleInput("");
      }
    }
  };

  const handleRemoveRole = (tag: string) => {
    setRoles(roles.filter(r => r !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (roles.length === 0) {
      toast.error("Please add at least one role tag.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/recruitment/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: postType,
          title,
          description,
          roles,
          team_id: postType === "team_seeking_player" ? userTeam?.id : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create posting");
      }

      toast.success("Recruitment post published!");
      router.push("/recruitment");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to publish posting");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recruitment">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Recruitment Posting</h1>
          <p className="text-sm text-muted-foreground">Advertise your free agent availability or team openings.</p>
        </div>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-6 border-b border-border">
          <CardTitle>Post Requirements</CardTitle>
          <CardDescription>Specify roles, capabilities, and detailed expectations.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Post Type Selector */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Listing Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={postType === "player_seeking_team" ? "default" : "outline"}
                  onClick={() => setPostType("player_seeking_team")}
                  className="py-6 text-sm"
                >
                  Free Agent seeking Team
                </Button>
                <Button
                  type="button"
                  variant={postType === "team_seeking_player" ? "default" : "outline"}
                  onClick={() => {
                    if (!userTeam) {
                      toast.error("You must belong to a team roster to create team openings.");
                      return;
                    }
                    setPostType("team_seeking_player");
                  }}
                  className="py-6 text-sm"
                  disabled={!userTeam}
                >
                  Team seeking Roster Player
                </Button>
              </div>
              {!userTeam && (
                <p className="text-xs text-muted-foreground">
                  Note: Team recruitment option is disabled because you are not currently associated with a team roster.
                </p>
              )}
              {postType === "team_seeking_player" && userTeam && (
                <p className="text-xs text-[#10B981] font-mono">
                  This post will represent: <strong>{userTeam.name}</strong>
                </p>
              )}
            </div>

            {/* Post Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-medium text-sm">
                Posting Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder={postType === "player_seeking_team" ? "e.g. Entry Fragger looking for Competitive Guild (Grandmaster)" : "e.g. Elite Esports looking for Lead Sniper (Regional Scrims)"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="font-medium text-sm">
                Detailed Summary <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="description"
                placeholder={
                  postType === "player_seeking_team"
                    ? "Provide details about your preferred playing hours, competitive achievements, average KD/ADR, active communication, and target tournaments..."
                    : "Describe team requirements, practice schedules, coaching support, tournament target registrations, and other roster benefits..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Roles / Tags */}
            <div className="space-y-2">
              <Label htmlFor="role-input" className="font-medium text-sm">
                Roles Wanted / Offered <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-input"
                placeholder="Type role name (e.g. Rusher, Sniper, IGL) and press Enter"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={handleAddRole}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {roles.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1 font-mono text-xs">
                    {tag}
                    <button type="button" onClick={() => handleRemoveRole(tag)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tip: Press Enter or comma after typing a role to commit it as a searchable tag filter.
              </p>
            </div>

            {/* Submit buttons */}
            <div className="flex gap-4 pt-4 border-t border-border">
              <Link href="/recruitment" className="flex-1">
                <Button variant="outline" className="w-full" type="button" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Posting"
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
