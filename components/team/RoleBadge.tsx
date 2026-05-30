import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TeamMemberDbRole } from "@/lib/types/app.types";

interface RoleBadgeProps {
  role: TeamMemberDbRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  let badgeStyles = "bg-secondary text-foreground hover:bg-secondary/80 border-border";

  switch (role) {
    case "coach":
      badgeStyles =
        "bg-[hsl(35,95%,55%,0.15)] text-[hsl(35,95%,55%)] hover:bg-[hsl(35,95%,55%,0.25)] border-[hsl(35,95%,55%,0.3)]";
      break;
    case "analyst":
      badgeStyles =
        "bg-[hsl(280,65%,55%,0.15)] text-[hsl(280,65%,55%)] hover:bg-[hsl(280,65%,55%,0.25)] border-[hsl(280,65%,55%,0.3)]";
      break;
    case "IGL":
      badgeStyles =
        "bg-[hsl(0,70%,55%,0.15)] text-[hsl(0,70%,55%)] hover:bg-[hsl(0,70%,55%,0.25)] border-[hsl(0,70%,55%,0.3)] font-extrabold";
      break;
    case "sniper":
      badgeStyles =
        "bg-[hsl(210,100%,60%,0.15)] text-[hsl(210,100%,60%)] hover:bg-[hsl(210,100%,60%,0.25)] border-[hsl(210,100%,60%,0.3)]";
      break;
    case "entry":
      badgeStyles =
        "bg-[hsl(160,70%,45%,0.15)] text-[hsl(160,70%,45%)] hover:bg-[hsl(160,70%,45%,0.25)] border-[hsl(160,70%,45%,0.3)]";
      break;
    case "support":
      badgeStyles =
        "bg-secondary/90 text-foreground hover:bg-secondary/100 border-border/80";
      break;
    case "player":
    default:
      badgeStyles =
        "bg-secondary/40 text-muted-foreground border-border/30";
      break;
  }

  const displayName = role === "IGL" ? "IGL" : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <Badge className={cn("px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border", badgeStyles, className)}>
      {displayName}
    </Badge>
  );
}
