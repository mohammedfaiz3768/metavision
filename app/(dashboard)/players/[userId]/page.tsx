"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Globe, Shield, Swords, Trophy, Activity, MessageSquare, User as UserIcon } from "lucide-react";
import Link from "next/link";

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  full_name: string | null;
  age: number | null;
  in_game_name: string | null;
  bio: string | null;
  social_links: {
    discord?: string;
    twitter?: string;
    youtube?: string;
  } | null;
  show_team_on_profile: boolean;
}

interface TeamMember {
  role: string;
  joined_at: string;
  teams: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

interface StatSummary {
  scrims: {
    roundsPlayed: number;
    totalKills: number;
    totalDamage: number;
    averageKills: number;
    averageDamage: number;
    survivalRate: number;
  };
  matches: {
    matchesPlayed: number;
    totalKills: number;
    totalDamage: number;
    averageKills: number;
    averageDamage: number;
    survivalRate: number;
  };
}

export default function PlayerProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamMember | null>(null);
  const [stats, setStats] = useState<StatSummary>({
    scrims: { roundsPlayed: 0, totalKills: 0, totalDamage: 0, averageKills: 0, averageDamage: 0, survivalRate: 0 },
    matches: { matchesPlayed: 0, totalKills: 0, totalDamage: 0, averageKills: 0, averageDamage: 0, survivalRate: 0 }
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError || !profileData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        setProfile(profileData as unknown as Profile);

        // 2. Fetch Team Info if enabled
        if (profileData.show_team_on_profile) {
          const { data: teamData } = await supabase
            .from("team_members")
            .select(`
              role,
              joined_at,
              teams (
                id,
                name,
                logo_url
              )
            `)
            .eq("user_id", userId)
            .maybeSingle();

          if (teamData) {
            setTeamInfo(teamData as unknown as TeamMember);
          }
        }

        // 3. Fetch Scrim Stats
        const { data: scrimStats } = await supabase
          .from("scrim_round_players")
          .select("kills, damage, survived")
          .eq("player_id", userId);

        const totalScrimRounds = scrimStats?.length || 0;
        let totalScrimKills = 0;
        let totalScrimDamage = 0;
        let scrimSurvived = 0;

        if (scrimStats && totalScrimRounds > 0) {
          scrimStats.forEach((r: any) => {
            totalScrimKills += r.kills || 0;
            totalScrimDamage += r.damage || 0;
            if (r.survived) scrimSurvived++;
          });
        }

        // 4. Fetch Tournament/Match Stats
        let matchStats: any[] = [];
        if (profileData.in_game_name) {
          const { data: mStats } = await supabase
            .from("match_players")
            .select("kills, damage, survived")
            .eq("player_name", profileData.in_game_name);
          if (mStats) matchStats = mStats;
        }

        // Add stats queried by username as backup
        if (matchStats.length === 0 && profileData.username) {
          const { data: mStats } = await supabase
            .from("match_players")
            .select("kills, damage, survived")
            .eq("player_name", profileData.username);
          if (mStats) matchStats = mStats;
        }

        const totalMatches = matchStats.length;
        let totalMatchKills = 0;
        let totalMatchDamage = 0;
        let matchSurvived = 0;

        if (matchStats && totalMatches > 0) {
          matchStats.forEach(m => {
            totalMatchKills += m.kills || 0;
            totalMatchDamage += m.damage || 0;
            if (m.survived) matchSurvived++;
          });
        }

        setStats({
          scrims: {
            roundsPlayed: totalScrimRounds,
            totalKills: totalScrimKills,
            totalDamage: totalScrimDamage,
            averageKills: totalScrimRounds > 0 ? parseFloat((totalScrimKills / totalScrimRounds).toFixed(2)) : 0,
            averageDamage: totalScrimRounds > 0 ? Math.round(totalScrimDamage / totalScrimRounds) : 0,
            survivalRate: totalScrimRounds > 0 ? Math.round((scrimSurvived / totalScrimRounds) * 100) : 0,
          },
          matches: {
            matchesPlayed: totalMatches,
            totalKills: totalMatchKills,
            totalDamage: totalMatchDamage,
            averageKills: totalMatches > 0 ? parseFloat((totalMatchKills / totalMatches).toFixed(2)) : 0,
            averageDamage: totalMatches > 0 ? Math.round(totalMatchDamage / totalMatches) : 0,
            survivalRate: totalMatches > 0 ? Math.round((matchSurvived / totalMatches) * 100) : 0,
          }
        });

      } catch (err) {
        console.error("Error loading public profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading player card...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-destructive">Player Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested user profile does not exist or has not completed onboarding.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const userInitials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Profile Summary Card */}
        <Card className="border-border bg-card shadow-sm h-fit">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-28 w-28 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                <AvatarImage src={profile.avatar_url || ""} alt={profile.in_game_name || profile.username} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground text-3xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <h2 className="text-2xl font-bold mt-4 tracking-tight">
                {profile.in_game_name || profile.username}
              </h2>
              {profile.full_name && (
                <p className="text-sm text-muted-foreground font-medium">{profile.full_name}</p>
              )}
              {profile.age && (
                <Badge variant="secondary" className="mt-2 text-xs font-mono">
                  Age: {profile.age}
                </Badge>
              )}
            </div>

            <Separator className="bg-border" />

            {/* Team Affiliation */}
            <div className="space-y-3 text-left">
              <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                Team Affiliation
              </h3>
              {teamInfo?.teams ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={teamInfo.teams.logo_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {teamInfo.teams.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-semibold">{teamInfo.teams.name}</h4>
                    <p className="text-xs text-muted-foreground capitalize font-mono">
                      Role: {teamInfo.role}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center rounded-lg border border-dashed border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground font-mono">Free Agent / Solo Player</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="space-y-2 text-left">
                <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                  Bio / Playstyle
                </h3>
                <p className="text-sm leading-relaxed text-card-foreground/90 bg-muted/20 p-3 rounded-md border border-border/50">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Social channels */}
            {profile.social_links && (Object.values(profile.social_links).some(Boolean)) && (
              <div className="space-y-3 text-left">
                <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                  Contact & Channels
                </h3>
                <div className="space-y-2 text-sm">
                  {profile.social_links.discord && (
                    <div className="flex items-center gap-2 text-card-foreground">
                      <MessageSquare className="h-4 w-4 text-[#7289da]" />
                      <span className="font-mono text-xs">{profile.social_links.discord}</span>
                    </div>
                  )}
                  {profile.social_links.twitter && (
                    <a
                      href={profile.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary transition-colors text-card-foreground"
                    >
                      <Twitter className="h-4 w-4 text-[#1da1f2]" />
                      <span className="text-xs underline truncate">{profile.social_links.twitter.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    </a>
                  )}
                  {profile.social_links.youtube && (
                    <a
                      href={profile.social_links.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary transition-colors text-card-foreground"
                    >
                      <Youtube className="h-4 w-4 text-[#ff0000]" />
                      <span className="text-xs underline truncate">{profile.social_links.youtube.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Right column: Performance Metrics & Statistics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tactical Scrim Stats */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Swords className="h-5 w-5 text-primary" />
                  Scrimmage Round Metrics
                </CardTitle>
                <CardDescription>Aggregate practice performance in custom scrims</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {stats.scrims.roundsPlayed} Rounds
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              {stats.scrims.roundsPlayed > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  {/* Average Kills */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Avg Kills</p>
                    <p className="text-2xl font-extrabold mt-1 text-primary">{stats.scrims.averageKills}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Per Round</p>
                  </div>

                  {/* Average Damage */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Avg Damage</p>
                    <p className="text-2xl font-extrabold mt-1 text-primary">{stats.scrims.averageDamage}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">ADR</p>
                  </div>

                  {/* Total Kills */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Total Kills</p>
                    <p className="text-2xl font-extrabold mt-1 text-foreground">{stats.scrims.totalKills}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Practice Kills</p>
                  </div>

                  {/* Survival Rate */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Survival %</p>
                    <p className="text-2xl font-extrabold mt-1 text-foreground">{stats.scrims.survivalRate}%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Wins/Survivals</p>
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 animate-pulse" />
                  <p className="text-sm">No scrim rounds recorded for this player yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament & Competitive Matches */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-[#EAB308]" />
                  Tournament Matches
                </CardTitle>
                <CardDescription>Competitive match analytics extracted from team rosters</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {stats.matches.matchesPlayed} Matches
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              {stats.matches.matchesPlayed > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  {/* Avg Kills */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Avg Kills</p>
                    <p className="text-2xl font-extrabold mt-1 text-[#EAB308]">{stats.matches.averageKills}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Per Match</p>
                  </div>

                  {/* Avg Damage */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Avg Damage</p>
                    <p className="text-2xl font-extrabold mt-1 text-[#EAB308]">{stats.matches.averageDamage}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">ADR</p>
                  </div>

                  {/* Total Kills */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Total Kills</p>
                    <p className="text-2xl font-extrabold mt-1 text-foreground">{stats.matches.totalKills}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Championship Kills</p>
                  </div>

                  {/* Survival Rate */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border text-center">
                    <p className="text-xs font-bold font-mono text-muted-foreground uppercase">Survival %</p>
                    <p className="text-2xl font-extrabold mt-1 text-foreground">{stats.matches.survivalRate}%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Survived Matches</p>
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Shield className="h-8 w-8 mx-auto text-muted-foreground/50 animate-pulse" />
                  <p className="text-sm">No competitive match statistics logged for this player name.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
