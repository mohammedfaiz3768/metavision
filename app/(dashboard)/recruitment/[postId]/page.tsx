"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Send,
  User as UserIcon,
  ShieldAlert,
  Calendar,
  Briefcase,
  Trophy,
  Swords,
  Megaphone,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Post {
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

interface Thread {
  id: string;
  post_id: string;
  applicant_id: string;
  post_owner_id: string;
  created_at: string;
  is_active: boolean;
  applicant?: {
    username: string;
    avatar_url: string | null;
    in_game_name: string | null;
  } | null;
  post_owner?: {
    username: string;
    avatar_url: string | null;
    in_game_name: string | null;
  } | null;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  is_read: boolean;
  sender?: {
    username: string;
    avatar_url: string | null;
    in_game_name: string | null;
  } | null;
}

export default function RecruitmentDetailsPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  
  // Chat state
  const [isOwner, setIsOwner] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]); // Recruiter view: list of applicant threads
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null); // Active thread in viewport
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  
  // Realtime ref
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load posting details
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    async function loadPostData() {
      try {
        setLoading(true);

        const response = await fetch(`/api/recruitment/posts/${postId}`);
        if (!response.ok) throw new Error("Listing not found");
        const postData: Post = await response.json();
        setPost(postData);

        const checkIsOwner = postData.posted_by === currentUserId;
        setIsOwner(checkIsOwner);

        if (checkIsOwner) {
          // Recruiter: fetch all threads started for this post
          const { data: threadData, error: threadError } = await supabase
            .from("recruitment_threads")
            .select(`
              *,
              applicant:profiles!recruitment_threads_applicant_id_fkey(username, avatar_url, in_game_name)
            `)
            .eq("post_id", postId)
            .order("created_at", { ascending: false });

          if (threadError) throw threadError;
          setThreads(threadData as unknown as Thread[]);
          if (threadData && threadData.length > 0) {
            setSelectedThread(threadData[0] as unknown as Thread);
          }
        } else {
          // Applicant: check if they already have an active thread
          const { data: threadData } = await supabase
            .from("recruitment_threads")
            .select(`
              *,
              post_owner:profiles!recruitment_threads_post_owner_id_fkey(username, avatar_url, in_game_name)
            `)
            .eq("post_id", postId)
            .eq("applicant_id", currentUserId)
            .maybeSingle();

          if (threadData) {
            setSelectedThread(threadData as unknown as Thread);
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load recruitment details");
      } finally {
        setLoading(false);
      }
    }

    loadPostData();
  }, [postId, user, supabase]);

  // Load messages whenever selectedThread changes
  useEffect(() => {
    if (!selectedThread) return;

    async function loadMessages() {
      try {
        setMessagesLoading(true);
        const res = await fetch(`/api/recruitment/threads/${selectedThread?.id}/messages`);
        if (!res.ok) throw new Error("Failed to load conversation history");
        const data = await res.json();
        setMessages(data);
      } catch (err: any) {
        console.error(err);
        toast.error("Error loading chat messages");
      } finally {
        setMessagesLoading(false);
      }
    }

    loadMessages();

    // Subscribe to realtime changes for recruitment_messages
    const channel = supabase
      .channel(`chat-thread-${selectedThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recruitment_messages",
          filter: `thread_id=eq.${selectedThread.id}`,
        },
        async (payload: any) => {
          // Resolve sender profile info locally for the new message
          const msg = payload.new as Message;
          
          let senderProfile = null;
          if (msg.sender_id === user?.id) {
            // Fetch own profile details
            const { data } = await supabase.from("profiles").select("username, avatar_url, in_game_name").eq("id", user.id).single();
            senderProfile = data;
          } else {
            // Sender is the other party: check applicant or post_owner details
            if (isOwner) {
              senderProfile = selectedThread.applicant;
            } else {
              senderProfile = selectedThread.post_owner;
            }
          }
          
          const enrichedMessage: Message = {
            ...msg,
            sender: senderProfile
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === enrichedMessage.id)) return prev;
            return [...prev, enrichedMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedThread, supabase, user, isOwner]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading listing details...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-destructive">Listing Not Found</h2>
        <p className="text-sm text-muted-foreground">The recruitment post does not exist or has been deleted.</p>
        <Button onClick={() => router.push("/recruitment")} variant="outline">
          Back to Board
        </Button>
      </div>
    );
  }

  const handleStartChat = async () => {
    try {
      const response = await fetch(`/api/recruitment/posts/${postId}/chat`, {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start conversation");
      }

      const newThread = await response.json();
      
      // Fetch post owner profile details to enrich thread
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("username, avatar_url, in_game_name")
        .eq("id", newThread.post_owner_id)
        .single();
      
      setSelectedThread({
        ...newThread,
        post_owner: ownerProfile
      });
      
      toast.success("Connection established! Say hello to the recruiter.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start chat session");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedThread) return;

    const content = messageInput;
    setMessageInput("");

    try {
      const res = await fetch(`/api/recruitment/threads/${selectedThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to deliver message");
      }

      // Proactively insert message locally
      const newMsg = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message");
    }
  };

  const togglePostStatus = async () => {
    const nextStatus = post.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/recruitment/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to change status");
      
      const updatedPost = await res.json();
      setPost(updatedPost);
      toast.success(`Listing status updated to: ${nextStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to alter status");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to permanently delete this recruitment post?")) return;
    try {
      const res = await fetch(`/api/recruitment/posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete post");
      toast.success("Recruitment post deleted");
      router.push("/recruitment");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete post");
    }
  };

  const uploaderName = post.profiles?.in_game_name || post.profiles?.username || "Unknown Gamer";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/recruitment">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Board
          </Button>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              variant={post.status === "open" ? "secondary" : "default"}
              size="sm"
              onClick={togglePostStatus}
            >
              {post.status === "open" ? "Close Posting" : "Re-open Posting"}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeletePost}>
              Delete Posting
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left column: Posting Details Card */}
        <Card className="border-border bg-card shadow-sm h-fit">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <Badge variant={post.status === "open" ? "default" : "secondary"} className="font-mono">
                {post.status.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {post.post_type === "player_seeking_team" ? "Free Agent" : "Recruiter"}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight pt-3">{post.title}</CardTitle>
            <CardDescription className="text-xs font-mono">Posted {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                Summary & Expectations
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {post.description}
              </p>
            </div>

            {/* Target Roles */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                Target Roles
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {post.roles.map((r) => (
                  <Badge key={r} variant="outline" className="bg-secondary/40 border-border text-xs font-mono">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Poster details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                Contact Person
              </h3>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
                <Link href={`/players/${post.posted_by}`}>
                  <Avatar className="h-10 w-10 border border-border cursor-pointer">
                    <AvatarImage src={post.profiles?.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {uploaderName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <h4 className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer">
                    <Link href={`/players/${post.posted_by}`}>{uploaderName}</Link>
                  </h4>
                  {post.teams ? (
                    <p className="text-xs text-muted-foreground font-mono">Guild: {post.teams.name}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono">Solo Player</p>
                  )}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Right column: Private Chat Area */}
        <div className="lg:col-span-2">
          {post.status === "closed" && !selectedThread ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-base">Listing Closed</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                This recruitment listing is no longer open for active applications.
              </p>
            </div>
          ) : !selectedThread && !isOwner ? (
            // Applicant view with no existing thread
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
              <MessageSquare className="h-12 w-12 text-primary/40 mb-4" />
              <h3 className="font-bold text-lg">Interested in this posting?</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Start a private 1-to-1 conversation with the recruiter to discuss roster requirements and test schedules.
              </p>
              <Button onClick={handleStartChat} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Apply & Open Live Chat
              </Button>
            </div>
          ) : (
            // Active Conversation Workspace
            <div className="grid grid-cols-1 md:grid-cols-3 border border-border rounded-xl bg-card overflow-hidden shadow-sm h-[550px]">
              
              {/* Recruiter View Sidebar: List of Applicants */}
              {isOwner && (
                <div className="border-r border-border flex flex-col justify-between h-full bg-secondary/10">
                  <div className="p-3 border-b border-border bg-card">
                    <h3 className="text-xs font-bold font-mono text-muted-foreground uppercase">
                      Candidates ({threads.length})
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                    {threads.length > 0 ? (
                      threads.map((t) => {
                        const applicantName = t.applicant?.in_game_name || t.applicant?.username || "Gamer";
                        const active = selectedThread?.id === t.id;
                        
                        return (
                          <div
                            key={t.id}
                            className={`p-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors cursor-pointer ${
                              active ? "bg-primary/5 border-l-2 border-primary" : ""
                            }`}
                            onClick={() => setSelectedThread(t)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={t.applicant?.avatar_url || ""} className="object-cover" />
                              <AvatarFallback className="bg-muted text-xs font-bold">
                                {applicantName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold truncate text-foreground">{applicantName}</h4>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {formatDistanceToNow(new Date(t.created_at), { addSuffix: false })} ago
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-20 text-center text-xs text-muted-foreground">
                        No applications received yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat View Panel */}
              <div className={`flex flex-col justify-between h-full ${isOwner ? "md:col-span-2" : "col-span-full"}`}>
                
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={
                          isOwner
                            ? selectedThread?.applicant?.avatar_url || ""
                            : selectedThread?.post_owner?.avatar_url || ""
                        }
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-xs font-bold">
                        {(isOwner
                          ? selectedThread?.applicant?.in_game_name || selectedThread?.applicant?.username || "Candidate"
                          : selectedThread?.post_owner?.in_game_name || selectedThread?.post_owner?.username || "Recruiter"
                        ).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-bold">
                        {isOwner
                          ? selectedThread?.applicant?.in_game_name || selectedThread?.applicant?.username || "Candidate"
                          : selectedThread?.post_owner?.in_game_name || selectedThread?.post_owner?.username || "Recruiter"}
                      </h4>
                      <p className="text-[10px] text-[#10B981] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 fill-current" />
                        Live Connection Active
                      </p>
                    </div>
                  </div>
                  
                  {/* Link to view candidate profile if recruiter */}
                  {isOwner && selectedThread && (
                    <Link href={`/players/${selectedThread.applicant_id}`} target="_blank">
                      <Button variant="outline" size="xs" className="text-xs font-mono">
                        View Stats Card
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
                  {messagesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((m) => {
                      const isSelf = m.sender_id === user?.id;
                      const senderName = m.sender?.in_game_name || m.sender?.username || "Gamer";
                      const dateStr = new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col max-w-[80%] ${
                            isSelf ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground font-mono mb-1">{senderName} • {dateStr}</span>
                          <div
                            className={`p-3 rounded-lg text-sm leading-relaxed ${
                              isSelf
                                ? "bg-primary text-white rounded-br-none"
                                : "bg-card border border-border text-foreground rounded-bl-none"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center text-xs text-muted-foreground font-mono">
                      No messages exchanged yet. Send a greeting to start the conversation!
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Footer / Form Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex gap-2 bg-card">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 text-sm bg-background"
                    required
                  />
                  <Button type="submit" size="icon" className="shrink-0 cursor-pointer">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
