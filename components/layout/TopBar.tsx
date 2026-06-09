"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Users, User, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { user, signOut } = useAuth();
  const { currentTeam } = useTeam();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const username = user?.email?.split("@")[0] || "User";
  const userInitials = username.slice(0, 2).toUpperCase();

  // Determine a nice clean display title based on route
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Command Center";
    if (pathname.startsWith("/boards")) return "Strategic Whiteboards";
    if (pathname.startsWith("/matches")) return "POV Reviews & Maps";
    if (pathname.startsWith("/analytics")) return "Team Performance Metrics";
    if (pathname.startsWith("/scrims")) return "Scrim Logs & Round Data";
    if (pathname.startsWith("/tournaments")) return "Championship Standings";
    if (pathname.startsWith("/top-teams-analysis")) return "Top Teams Tactical Library";
    if (pathname.startsWith("/team")) return "Roster Management";
    if (pathname.startsWith("/owner")) return "Owner Administration Portal";
    if (pathname.startsWith("/video-analysis")) return "Tactical Video Analyzer";
    if (pathname.startsWith("/recruitment")) return "Gamer Recruitment Board";
    if (pathname.startsWith("/profile")) return "Player Settings Workspace";
    if (pathname.startsWith("/players")) return "Tactical Player Profile";
    return "Whiteboard Tactical Center";
  };

  const isOwnerRoute = pathname.startsWith("/owner");

  return (
    <header className={cn(
      "fixed top-0 right-0 z-30 h-[52px] border-b border-[#E5E7EB] bg-white flex items-center justify-between px-[28px] shrink-0 select-none",
      isOwnerRoute ? "w-[calc(100%-240px)]" : "w-[calc(100%-52px)]"
    )}>
      {/* Left side: Light Page Title */}
      <div>
        <span className="text-[13px] font-medium text-[#6B7280] font-mono uppercase tracking-wider">
          {getPageTitle()}
        </span>
      </div>

      {/* Right side: Game mode pill badge & Avatar */}
      <div className="flex items-center gap-[16px]">
        {/* Game Mode Pill */}
        <div className="bg-[#E5E7EB] rounded-full px-3 py-1 flex items-center justify-center border border-[#D1D5DB]">
          <span className="text-[11px] font-bold text-[#374151] font-mono tracking-wide">
            {currentTeam ? `${currentTeam.name} / Free Fire` : "Free Fire"}
          </span>
        </div>

        {/* User profile dropdown trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full border-2 border-[#7C3AED] overflow-hidden p-0 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer"
            >
              <Avatar className="h-full w-full">
                <AvatarImage
                  src={user?.user_metadata?.avatar_url || ""}
                  alt={username}
                />
                <AvatarFallback className="bg-[#7C3AED] text-white text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-56 border-[#2A2B35] bg-[#13141A] text-[#F1F1F3]" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal text-[#F1F1F3]">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none capitalize">{username}</p>
                  <p className="text-xs leading-none text-[#9CA3AF] mt-1">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="bg-[#2A2B35]" />
            
            <DropdownMenuItem 
              onClick={() => router.push(`/players/${user?.id}`)} 
              className="hover:bg-[#1E1F28] hover:text-white cursor-pointer"
            >
              <User className="mr-2 h-4 w-4 text-[#7C3AED]" />
              <span className="text-xs">My Profile Card</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => router.push("/profile/edit")} 
              className="hover:bg-[#1E1F28] hover:text-white cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4 text-[#7C3AED]" />
              <span className="text-xs">Edit Profile Info</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => router.push("/team")} 
              className="hover:bg-[#1E1F28] hover:text-white cursor-pointer"
            >
              <Users className="mr-2 h-4 w-4 text-[#7C3AED]" />
              <span className="text-xs">Team Settings</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[#2A2B35]" />
            
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-[#EF4444] focus:bg-[#EF4444]/10 focus:text-[#EF4444] cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4 text-[#EF4444]" />
              <span className="text-xs font-bold">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
