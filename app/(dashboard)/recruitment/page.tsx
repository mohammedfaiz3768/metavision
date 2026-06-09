"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Plus, Search, Megaphone, MapPin, Calendar, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface PostItem {
  id: string;
  posted_by: string;
  team_id: string | null;
  post_type: "player_seeking_team" | "team_seeking_player";
  title: string;
  description: string;
  roles: string[];
  status: "open" | "closed";
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    in_game_name: string | null;
  } | null;
  teams?: {
    name: string;
    logo_url: string | null;
  } | null;
}

export default function RecruitmentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("find_team");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const loadPosts = async () => {
    try {
      setLoading(true);
      // Fetch open posts
      const res = await fetch("/api/recruitment/posts?status=open");
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load recruitment listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading recruitment board...</span>
      </div>
    );
  }

  // Filter posts based on active tab and search query/role
  // "Find a Team" (find_team) tab shows posts of type "player_seeking_team" (players looking for a team)
  // "Find a Player" (find_player) tab shows posts of type "team_seeking_player" (teams looking for players)
  const currentPostType = activeTab === "find_team" ? "player_seeking_team" : "team_seeking_player";
  
  const filteredPosts = posts.filter((post) => {
    if (post.post_type !== currentPostType) return false;
    
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = 
      roleFilter === "all" || 
      post.roles.some(r => r.toLowerCase() === roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  const allAvailableRoles = Array.from(
    new Set(posts.filter(p => p.post_type === currentPostType).flatMap(p => p.roles))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Esports Recruitment Board</h1>
          <p className="text-sm text-muted-foreground">
            Connect with teams looking for players, or advertise your skills as a free agent.
          </p>
        </div>
        <Link href="/recruitment/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Posting
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="find_team">Find a Team (Free Agents)</TabsTrigger>
          <TabsTrigger value="find_player">Find a Player (Team Roster)</TabsTrigger>
        </TabsList>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Roles</option>
              {allAvailableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="find_team" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <RecruitmentCard key={post.id} post={post} />
              ))
            ) : (
              <EmptyState type="players" query={searchQuery} role={roleFilter} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="find_player" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <RecruitmentCard key={post.id} post={post} />
              ))
            ) : (
              <EmptyState type="teams" query={searchQuery} role={roleFilter} />
            )}
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function RecruitmentCard({ post }: { post: PostItem }) {
  const router = useRouter();
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const uploaderName = post.profiles?.in_game_name || post.profiles?.username || "Unknown Gamer";

  return (
    <Card className="border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/players/${post.posted_by}`} onClick={(e) => e.stopPropagation()}>
              <Avatar className="h-10 w-10 ring-1 ring-primary/20 ring-offset-background cursor-pointer">
                <AvatarImage src={post.profiles?.avatar_url || ""} className="object-cover" />
                <AvatarFallback className="bg-muted text-xs font-bold font-mono">
                  {uploaderName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <h4 className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer">
                <Link href={`/players/${post.posted_by}`} onClick={(e) => e.stopPropagation()}>
                  {uploaderName}
                </Link>
              </h4>
              <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" />
                {timeAgo}
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
            {post.post_type === "player_seeking_team" ? "Free Agent" : "Roster Recruitment"}
          </Badge>
        </div>

        <h3
          className="font-bold text-base hover:text-primary transition-colors cursor-pointer pt-3 line-clamp-1"
          onClick={() => router.push(`/recruitment/${post.id}`)}
        >
          {post.title}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1">
        <p className="text-sm text-card-foreground/90 line-clamp-3 leading-relaxed">
          {post.description}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-4">
          {post.roles.map((r) => (
            <Badge key={r} variant="outline" className="bg-secondary/40 border-border text-xs font-mono">
              {r}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-3 border-t border-border/50 flex justify-between items-center bg-secondary/10">
        {post.teams ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="truncate max-w-[150px]">{post.teams.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Independent</span>
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/recruitment/${post.id}`)}
          className="text-xs"
        >
          View Listing
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ type, query, role }: { type: "players" | "teams"; query: string; role: string }) {
  return (
    <div className="col-span-full text-center py-20 bg-card rounded-lg border border-dashed border-border space-y-3">
      <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40" />
      <h3 className="font-bold text-lg">No Recruitment Postings</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {query || role !== "all" 
          ? "No open postings match your filter queries." 
          : type === "players"
            ? "No free agents have posted looking for a team. Advertise your services by creating a new posting!"
            : "No teams are currently recruiting players. Create a posting to let others know you're hiring!"}
      </p>
    </div>
  );
}
