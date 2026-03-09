import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { resetUserPassword } from "@/api/auth";
import { getAxiosErrorMessage, getAxiosStatus } from "@/api/errors";
import { fetchRolesList } from "@/api/roles";
import {
  deactivateUser,
  fetchUserDetail,
  reactivateUser,
  updateUserEmail,
  updateUserName,
  updateUserRoles,
  type UserDetailResponse,
} from "@/api/users";
import type { RoleListItem } from "@/types/role";

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for toggle status (AlertDialog)
  const [isConfirmStatusOpen, setIsConfirmStatusOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // States for editing name (Inline)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // States for editing email (Modal)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // States for editing roles (Modal)
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolesError, setRolesError] = useState("");
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);

  // States for editing password (Modal)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const isRootUser = user?.email === "root@system.com";

  const loadData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [userData, rolesData] = await Promise.all([
        fetchUserDetail(userId),
        fetchRolesList(),
      ]);
      setUser(userData);
      setEditNameValue(userData.name);
      setAvailableRoles(rolesData);
    } catch (err) {
      const status = getAxiosStatus(err);
      setError(
        status === 404 ? "User not found." : "Failed to load user details.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handlers

  const handleUpdateName = async () => {
    if (!userId || !user) return;
    const newName = editNameValue.trim();
    if (!newName || newName === user.name) {
      setIsEditingName(false);
      return;
    }

    setIsUpdatingName(true);
    try {
      await updateUserName(userId, newName.toLowerCase());
      setUser({ ...user, name: newName });
      setIsEditingName(false);
      toast.success("User name updated successfully.");
    } catch (err) {
      toast.error(getAxiosErrorMessage(err) || "Failed to update name.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!userId || !user) return;
    const newEmail = editEmailValue.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newEmail || !emailRegex.test(newEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsUpdatingEmail(true);
    setEmailError("");
    try {
      await updateUserEmail(userId, newEmail);
      setUser({ ...user, email: newEmail });
      setIsEmailModalOpen(false);
      toast.success("User email updated successfully.");
    } catch (err) {
      setEmailError(getAxiosErrorMessage(err) || "Failed to update email.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!userId || !user) return;
    if (selectedRoles.length === 0) {
      setRolesError("At least one role must be selected.");
      return;
    }

    setIsUpdatingRoles(true);
    setRolesError("");
    try {
      await updateUserRoles(userId, selectedRoles);
      const updatedRoles = availableRoles
        .filter((r) => selectedRoles.includes(r.id))
        .map((r) => ({ id: r.id, name: r.name }));

      setUser({ ...user, roles: updatedRoles });
      setIsRolesModalOpen(false);
      toast.success("User roles updated successfully.");
    } catch (err) {
      setRolesError(getAxiosErrorMessage(err) || "Failed to update roles.");
    } finally {
      setIsUpdatingRoles(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userId || !user) return;

    if (newPassword.length < 12) {
      setPasswordError("Password must be at least 12 characters long.");
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setPasswordError(
        "Must include uppercase, lowercase, numbers, and special characters.",
      );
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError("");
    try {
      await resetUserPassword(userId, newPassword);
      setIsPasswordModalOpen(false);
      setNewPassword("");
      toast.success("Password reset successfully. Active sessions revoked.");
    } catch (err) {
      setPasswordError(
        getAxiosErrorMessage(err) || "Failed to reset password.",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggleStatusClick = () => {
    setIsConfirmStatusOpen(true);
  };

  const executeToggleStatus = async () => {
    if (!user || !userId) return;

    const actionStr = user.active ? "deactivate" : "reactivate";
    setIsUpdatingStatus(true);
    try {
      if (user.active) {
        await deactivateUser(userId);
      } else {
        await reactivateUser(userId);
      }
      setUser({ ...user, active: !user.active });
      toast.success(`User ${actionStr}d successfully.`);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err) || `Failed to ${actionStr} user.`);
    } finally {
      setIsUpdatingStatus(false);
      setIsConfirmStatusOpen(false);
    }
  };

  const openRolesModal = () => {
    setSelectedRoles(user?.roles.map((r) => r.id) || []);
    setRolesError("");
    setIsRolesModalOpen(true);
  };

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          to="/dashboard"
          className="transition-colors hover:text-foreground"
        >
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/users" className="transition-colors hover:text-foreground">
          Users
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate font-medium text-foreground">
          {isLoading ? "Loading..." : user?.name || "User Details"}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">User Management</h1>
            {user && (
              <Badge
                variant={user.active ? "default" : "secondary"}
                className={
                  user.active
                    ? "border-none bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
                    : ""
                }
              >
                {user.active ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage profile, security, and access settings for this user.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/users")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to users</span>
        </Button>
      </div>

      {isLoading && (
        <Card className="flex flex-1 items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-12 text-center text-destructive">
          {error}
        </Card>
      )}

      {user && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* left column: profile and Roles */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Basic personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        disabled={isUpdatingName}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdateName}
                        disabled={isUpdatingName}
                        className="w-16"
                      >
                        {isUpdatingName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditNameValue(user.name);
                          setIsEditingName(false);
                        }}
                        disabled={isUpdatingName}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                      <span className="font-medium">{user.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => setIsEditingName(true)}
                        disabled={isRootUser}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                    <span className="text-muted-foreground">{user.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2"
                      onClick={() => {
                        setEditEmailValue(user.email);
                        setEmailError("");
                        setIsEmailModalOpen(true);
                      }}
                      disabled={isRootUser}
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assigned Roles</CardTitle>
                    <CardDescription>System access levels.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={openRolesModal} disabled={isRootUser}>
                    Manage Roles
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      No roles assigned.
                    </span>
                  ) : (
                    user.roles.map((r) => (
                      <Badge
                        key={r.id}
                        variant="secondary"
                        className="font-normal"
                      >
                        {r.name.replace(/[_-]/g, " ").toUpperCase()}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Security and Status */}
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" /> Security
                </CardTitle>
                <CardDescription>
                  Administrative security actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  As an administrator, you can force a password reset for this
                  user. This will immediately revoke all their active sessions.
                </p>
                <Button
                  variant="default"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setNewPassword("");
                    setPasswordError("");
                    setIsPasswordModalOpen(true);
                  }}
                >
                  Reset User Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" /> Account Status
                </CardTitle>
                <CardDescription>
                  Enable or disable system access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {user.active
                    ? "Deactivating this user will prevent them from logging in, but their historical data will be preserved."
                    : "Reactivating this user will restore their ability to log into the system."}
                </p>
                <Button
                  variant={user.active ? "destructive" : "default"}
                  className="w-full gap-2 sm:w-auto"
                  onClick={handleToggleStatusClick}
                  disabled={isUpdatingStatus || isRootUser}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : user.active ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {user.active ? "Deactivate User" : "Reactivate User"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODALS (DIALOGS) */}

      {/* Modify Email */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Email Address</DialogTitle>
            <DialogDescription>
              Enter the new email address for this user. They will use this to
              log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label
              htmlFor="email"
              className={emailError ? "text-destructive" : ""}
            >
              New Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={editEmailValue}
              onChange={(e) => setEditEmailValue(e.target.value)}
              disabled={isUpdatingEmail}
              className={
                emailError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailModalOpen(false)}
              disabled={isUpdatingEmail}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail}>
              {isUpdatingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Roles */}
      <Dialog open={isRolesModalOpen} onOpenChange={setIsRolesModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              Assign or remove system roles for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 sm:grid-cols-2">
            {availableRoles.map((role) => {
              const isSelected = selectedRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  disabled={isUpdatingRoles}
                  onClick={() => {
                    setSelectedRoles((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== role.id)
                        : [...prev, role.id],
                    );
                    setRolesError("");
                  }}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  } ${isUpdatingRoles ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span
                    className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
                  >
                    {role.name.replace(/[_-]/g, " ").toUpperCase()}
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {role.description}
                  </span>
                </button>
              );
            })}
          </div>
          {rolesError && (
            <p className="text-sm text-destructive">{rolesError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRolesModalOpen(false)}
              disabled={isUpdatingRoles}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRoles} disabled={isUpdatingRoles}>
              {isUpdatingRoles ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Roles"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new strong password for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label
              htmlFor="password"
              className={passwordError ? "text-destructive" : ""}
            >
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Complex password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isUpdatingPassword}
                className={`pr-10 ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isUpdatingPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {passwordError ? (
              <p className="text-xs text-destructive">{passwordError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Min 12 chars. Must include uppercase, lowercase, numbers &
                special characters.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isUpdatingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for confirmations */}
      <AlertDialog
        open={isConfirmStatusOpen}
        onOpenChange={setIsConfirmStatusOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {user?.active
                ? "This will deactivate the user account. They will immediately lose access to the system."
                : "This will reactivate the user account. They will be able to log in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void executeToggleStatus();
              }}
              disabled={isUpdatingStatus}
              className={
                user?.active
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : ""
              }
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
