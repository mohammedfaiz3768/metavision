import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const createInviteSchema = z.object({
  max_uses: z.number().int().min(1).max(100).default(5),
  expires_in_hours: z.number().int().min(1).max(168).default(24), // up to 7 days
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's team membership to find team ownership
    const { data: teamMembership, error: teamErr } = await (supabase
      .from("team_members") as any)
      .select("team_id, role")
      .eq("user_id", user.id)
      .single();

    if (teamErr || !teamMembership) {
      return NextResponse.json(
        { error: "No active team roster found" },
        { status: 400 }
      );
    }

    // Verify user is team owner
    const { data: team, error: ownerErr } = await (supabase
      .from("teams") as any)
      .select("owner_id")
      .eq("id", teamMembership.team_id)
      .single();

    if (ownerErr || !team || team.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only the team owner can generate invites" },
        { status: 403 }
      );
    }

    // Parse options
    const body = await request.json().catch(() => ({}));
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { max_uses, expires_in_hours } = parsed.data;
    
    // Generate secure token
    const token = uuidv4().replace(/-/g, "").slice(0, 12);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

    // Insert invite
    const { data: invite, error: inviteErr } = await (supabase
      .from("team_invites") as any)
      .insert({
        team_id: teamMembership.team_id,
        token,
        created_by: user.id,
        max_uses,
        uses: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`,
      expires_at: invite.expires_at,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
