import { Eye, RefreshCw, Shield } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { getAxiosErrorMessage, getAxiosStatus } from "@/api/errors";
import { fetchRolesList } from "@/api/roles";

import type { RoleListItem } from "@/types/role";

function normalizeRoleName(name: string): string {
  return name.trim().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function getRolesErrorMessage(error: unknown): string {
  const status = getAxiosStatus(error);
  if (status === 403) return "You do not have permission to view roles.";

  const message = getAxiosErrorMessage(error);
  if (message) return message;

  return "Unable to load roles right now. Please try again.";
}

export function RolesPage() {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchRolesList();
      setRoles(data);
    } catch (error) {
      setErrorMessage(getRolesErrorMessage(error));
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const totalRoles = useMemo(() => roles.length, [roles]);

  return (
    <section className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Fixed role catalog for access control and permissions.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void loadRoles()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <aside className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
        Roles are fixed in this system. This module is read-only and intended
        for visibility of role definitions and their permission scope.
      </aside>

      {/* Card Container */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="sr-only">
          <h2 className="text-lg font-semibold">Roles List</h2>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col p-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-75">Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-30 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      Loading roles...
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && errorMessage && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-destructive"
                    >
                      {errorMessage}
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !errorMessage && roles.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No roles found.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  !errorMessage &&
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            {/* Reemplacé ShieldIcon por la importación de lucide-react para asegurar consistencia si no existía el componente */}
                            <Shield className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <span className="font-semibold truncate">
                            {normalizeRoleName(role.name)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {role.description}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 h-8"
                          asChild
                        >
                          <Link
                            to={`/roles/${role.id}`}
                            title="View role details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer Area */}
          <div className="border-t px-6 py-4 bg-card text-right">
            <span className="text-sm text-muted-foreground">
              Showing {totalRoles} {totalRoles === 1 ? "role" : "roles"}.
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
