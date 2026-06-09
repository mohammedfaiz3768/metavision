"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Globe, User as UserIcon, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(50, "Full name too long"),
  age: z.coerce.number().int().min(10, "Age must be at least 10").max(60, "Age cannot exceed 60"),
  inGameName: z.string().min(2, "IGN must be at least 2 characters").max(30, "IGN too long"),
  bio: z.string().max(300, "Bio cannot exceed 300 characters").optional(),
  discord: z.string().optional(),
  twitter: z.string().optional(),
  youtube: z.string().optional(),
  showTeamOnProfile: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profileLoading, setProfileLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as any,
  });

  const showTeamOnProfileValue = watch("showTeamOnProfile");

  // Fetch initial profile values
  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      try {
        const response = await fetch("/api/profile/me");
        if (!response.ok) {
          throw new Error("Failed to load profile data");
        }
        const data = await response.json();
        
        reset({
          fullName: data.full_name || "",
          age: data.age || undefined,
          inGameName: data.in_game_name || "",
          bio: data.bio || "",
          discord: data.social_links?.discord || "",
          twitter: data.social_links?.twitter || "",
          youtube: data.social_links?.youtube || "",
          showTeamOnProfile: data.show_team_on_profile !== false,
        });

        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Error loading your profile data.");
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();
  }, [user, reset]);

  // Loading indicator for auth & profile data
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  // Redirect if not signed in
  if (!user) {
    router.replace("/login");
    return null;
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size exceeds 3MB limit.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setAvatarUrl(data.url);
      toast.success("Avatar updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitting(true);

    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: values.fullName,
          age: values.age,
          in_game_name: values.inGameName,
          bio: values.bio,
          social_links: {
            discord: values.discord || "",
            twitter: values.twitter || "",
            youtube: values.youtube || "",
          },
          show_team_on_profile: values.showTeamOnProfile,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update profile");
      }

      toast.success("Profile saved successfully!");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header section with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Player Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your tactical credentials, bio, and gaming handles.
            </p>
          </div>
        </div>
        <Link href={`/players/${user.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            View Public Profile
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-6 border-b border-border">
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            This information is shown to coaches, recruiters, and other players.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Avatar section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src={avatarUrl} alt="Avatar preview" className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <UserIcon className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <h3 className="font-semibold text-base">Profile Image</h3>
                <p className="text-xs text-muted-foreground">
                  PNG, JPEG or WebP up to 3MB.
                </p>
                <div className="flex justify-center sm:justify-start gap-2 pt-1">
                  <Label htmlFor="avatar-file" className="cursor-pointer">
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors gap-2">
                      {uploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Change Photo
                    </span>
                    <input
                      id="avatar-file"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploading}
                      className="hidden"
                    />
                  </Label>
                </div>
              </div>
            </div>

            {/* Input Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-medium text-sm">Full Name</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  className="bg-background"
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="font-medium text-sm">Age</Label>
                <Input
                  id="age"
                  type="number"
                  {...register("age")}
                  className="bg-background"
                />
                {errors.age && (
                  <p className="text-xs text-destructive">{errors.age.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="inGameName" className="font-medium text-sm">In-Game Name (IGN)</Label>
                <Input
                  id="inGameName"
                  {...register("inGameName")}
                  className="bg-background"
                />
                {errors.inGameName && (
                  <p className="text-xs text-destructive">{errors.inGameName.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio" className="font-medium text-sm">Bio / Playstyle Summary</Label>
                <textarea
                  id="bio"
                  placeholder="Describe your role, gaming schedule, or team experience..."
                  {...register("bio")}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.bio && (
                  <p className="text-xs text-destructive">{errors.bio.message}</p>
                )}
                <p className="text-xs text-muted-foreground text-right">Max 300 characters</p>
              </div>
            </div>

            {/* Social handles */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base border-b border-border pb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Social Channels
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discord" className="text-xs font-medium">Discord Username</Label>
                  <Input
                    id="discord"
                    {...register("discord")}
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="text-xs font-medium">Twitter / X Link</Label>
                  <Input
                    id="twitter"
                    {...register("twitter")}
                    className="bg-background text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube" className="text-xs font-medium">YouTube Channel</Label>
                  <Input
                    id="youtube"
                    {...register("youtube")}
                    className="bg-background text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Checkbox */}
            <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-secondary/30">
              <Checkbox
                id="showTeamOnProfile"
                checked={showTeamOnProfileValue}
                onCheckedChange={(checked) => setValue("showTeamOnProfile", !!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="showTeamOnProfile" className="text-sm font-semibold cursor-pointer">
                  Show team affiliation on my profile
                </Label>
                <p className="text-xs text-muted-foreground">
                  If checked, public users will be able to see your team logo and stats when viewing your player card.
                </p>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex gap-4 pt-4 border-t border-border">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || uploading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
