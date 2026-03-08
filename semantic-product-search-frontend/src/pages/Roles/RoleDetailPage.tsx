import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, Shield } from "lucide-react";

import { fetchRoleDetail } from "../../api/roles";
import { getAxiosErrorMessage, getAxiosStatus } from "../../api/errors";
import type { RoleDetail } from "../../types/role";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function normalizeLabel(value: string) {
  return value.trim().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function getDetailErrorMessage(error: unknown) {
  const status = getAxiosStatus(error);
  if (status === 403) return "You do not have permission to view this role.";
  if (status === 404) return "Role was not found.";
  const msg = getAxiosErrorMessage(error);
  return msg || "Unable to load role details right now. Please try again.";
}

export function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRole = useCallback(async () => {
    if (!roleId) {
      setErrorMessage("Missing role id in route.");
      setIsLoading(false);
      setRole(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchRoleDetail(roleId);
      setRole(data ?? null);
    } catch (error) {
      setErrorMessage(getDetailErrorMessage(error));
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  const totalPermissions = role?.permissions.length ?? 0;
  const pageTitle = useMemo(
    () => normalizeLabel(role?.name ?? "Role Details"),
    [role],
  );

  return (
    <section className="flex flex-col gap-6 min-h-[calc(100vh-4rem)]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          to="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/roles" className="hover:text-foreground transition-colors">
          Roles
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{pageTitle}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Role Details</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/roles")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </Button>
      </div>

      {/* Error and Loading States */}
      {(isLoading || errorMessage || !role) && (
        <Card className="flex items-center justify-center p-12">
          <p
            className={`text-sm ${errorMessage ? "text-destructive" : "text-muted-foreground"}`}
          >
            {isLoading
              ? "Loading role details..."
              : (errorMessage ?? "Role not found.")}
          </p>
        </Card>
      )}

      {/* Role Content */}
      {role && !isLoading && (
        <div className="flex flex-col gap-6 flex-1">
          {/* Role Info Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 flex flex-col md:flex-row">
              <div className="flex items-center justify-center bg-muted/50 p-8 md:w-64 shrink-0 border-b md:border-b-0 md:border-r">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Shield className="h-12 w-12" />
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
                <div>
                  <Badge
                    variant="secondary"
                    className="mb-3 uppercase tracking-wider text-[10px]"
                  >
                    System Default
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {normalizeLabel(role.name)}
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed max-w-3xl">
                  {role.description}
                </p>
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium">
                    This role is system-defined and read-only.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Role definitions are fixed and cannot be edited from this
                    module.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Section */}
          <section className="flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Permissions</h3>
              <Badge variant="outline" className="bg-background">
                {totalPermissions} active{" "}
                {totalPermissions === 1 ? "permission" : "permissions"}
              </Badge>
            </div>

            {role.permissions.length === 0 ? (
              <Card className="flex flex-1 items-center justify-center p-12 text-muted-foreground">
                No permissions assigned to this role.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {role.permissions.map((permission) => (
                  <Card
                    key={permission.id}
                    className="p-5 transition-colors hover:border-primary/40 hover:bg-muted/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Check className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm">
                          {normalizeLabel(permission.name)}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
