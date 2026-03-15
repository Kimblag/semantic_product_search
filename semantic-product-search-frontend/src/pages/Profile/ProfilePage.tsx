import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  ShieldAlert,
  Save,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMe, updateMeName } from "@/api/users";
import { CurrentUserResponse } from "@/types/user";
import { useAuth } from "@/auth/useAuth";

export function ProfilePage() {
  const { refreshSession } = useAuth();

  const [profile, setProfile] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para el formulario (solo el nombre es editable por el propio usuario)
  const [nameInput, setNameInput] = useState("");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMe();
      setProfile(data);
      setNameInput(data.name);
    } catch {
      toast.error("Failed to load profile data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      await updateMeName(nameInput.trim());
      setProfile((prev) => (prev ? { ...prev, name: nameInput.trim() } : null));

      await refreshSession();
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-rise">
      {/* HEADER SECTION */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Account Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal information and workspace preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* EDITABLE SECTION */}
        <Card className="md:col-span-2 border-none shadow-sm bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your display name. Changes will be reflected across the
              platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Full Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="pl-10 h-11 bg-background/50"
                    placeholder="Enter your name"
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving || nameInput === profile.name}
                  className="gap-2 font-bold tracking-wider uppercase text-xs h-10 px-6 shadow-md shadow-primary/20"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* READ-ONLY / SYSTEM DATA SECTION */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> System Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Registered Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    value={profile.email}
                    disabled
                    readOnly
                    className="pl-10 h-9 bg-transparent cursor-not-allowed opacity-70 border-dashed"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground px-1 italic">
                  Contact an administrator to change your email address.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Assigned Roles
                </Label>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="gap-1.5 px-3 py-1 font-bold text-[10px] uppercase border-primary/20 bg-primary/5 text-primary"
                    >
                      <ShieldCheck className="h-3 w-3" /> {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
