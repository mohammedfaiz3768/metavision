"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2, ShieldAlert, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: PageProps) {
  const { token } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<any>(null);

  // ---- 1. Fetch Invite Token Validation Details ----
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const { data: invite, error: inviteError } = await (supabase
          .from("team_invites") as any)
          .select("*, teams(name, region)")
          .eq("token", token)
          .single();

        if (inviteError || !invite) {
          setError("This invite link is invalid, expired, or deactivated.");
          setLoading(false);
          return;
        }

        // Expiry check
        if (new Date(invite.expires_at) < new Date()) {
          setError("This invite link has expired.");
          setLoading(false);
          return;
        }

        // Usage limit check
        if (invite.uses >= invite.max_uses) {
          setError("This invite link has reached its maximum usage limit.");
          setLoading(false);
          return;
        }

        setInviteDetails(invite);
      } catch (err: any) {
        setError(err.message || "Failed to load invite details.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchInvite();
  }, [token]);

  // ---- 2. Accept Roster Invite Action ----
  const handleAcceptInvite = async () => {
    if (!user || !inviteDetails) return;
    setJoining(true);

    try {
      // Create team member mapping
      const { error: joinError } = await (supabase.from("team_members") as any).insert({
        team_id: inviteDetails.team_id,
        user_id: user.id,
        role: "player", // join as generic player role
      });

      if (joinError) {
        if (joinError.code === "23505") {
          toast.info("You are already registered on this team roster!");
          router.push("/dashboard");
          return;
        }
        throw joinError;
      }

      // Increment usage count of the token
      await (supabase
        .from("team_invites") as any)
        .update({ uses: inviteDetails.uses + 1 })
        .eq("id", inviteDetails.id);

      toast.success(`Successfully joined ${inviteDetails.teams.name}!`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to join team.");
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Checking credentials...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card">
        {error ? (
          /* Error Onboarding Card */
          <>
            <CardHeader className="space-y-2 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-destructive mb-2">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">Invite Invalid</CardTitle>
              <CardDescription className="text-xs leading-normal">
                {error}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/">
                <Button variant="outline">Back to Landing</Button>
              </Link>
            </CardFooter>
          </>
        ) : (
          /* Valid Invite Card */
          <>
            <CardHeader className="space-y-3 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-semibold mx-auto">
                <Sparkles className="h-3 w-3" />
                Roster Deployment Invite
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Join {inviteDetails?.teams?.name}
              </CardTitle>
              <CardDescription className="text-xs">
                You are invited to join the active esports squad representing the{" "}
                <strong className="text-foreground uppercase">
                  {inviteDetails?.teams?.region || "Global"}
                </strong>{" "}
                competitive region.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 select-none">
              {!user ? (
                /* 1. Logged out Onboarding block */
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-normal text-center mb-2">
                    Create a free account or log in to register your profile inside this team workspace.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href={`/login?next=/invite/${token}`}>
                      <Button variant="outline" className="w-full font-semibold">
                        Log in
                      </Button>
                    </Link>
                    <Link href={`/signup?next=/invite/${token}`}>
                      <Button className="w-full font-semibold">
                        Register
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* 2. Logged in Join button */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg border border-border bg-secondary/15 flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Authorized Identity
                      </p>
                      <p className="text-xs font-bold text-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleAcceptInvite}
                    disabled={joining}
                    className="w-full font-semibold h-9.5 gap-2"
                  >
                    {joining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4.5 w-4.5 text-white" />
                    )}
                    Accept Deployment
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
