import { Eye, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getAxiosErrorMessage, getAxiosStatus } from "@/api/errors";
import { fetchUsersList } from "@/api/users";

import type { UserListItem } from "@/types/user";
import type React from "react";
import { Link } from "react-router-dom";

const ROWS_PER_PAGE = 10;

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getUserErrorMessage(error: unknown): string {
  const status = getAxiosStatus(error);

  if (status === 403) {
    return "You do not have permission to view users.";
  }

  const message = getAxiosErrorMessage(error);
  if (message) return message;

  return "Unable to load users right now.";
}

export function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const loadUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const isActive =
        filterStatus === "all" ? undefined : filterStatus === "active";

      const response = await fetchUsersList({
        page,
        limit: ROWS_PER_PAGE,
        q: searchQuery || undefined,
        isActive,
      });

      setUsers(response.data);
      setTotalUsers(response.meta.total);
      setTotalPages(response.meta.totalPages);
      setPage(response.meta.page);
    } catch (error: unknown) {
      setErrorMessage(getUserErrorMessage(error));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus, searchQuery]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function handleSearch(): void {
    setSearchQuery(searchInput.trim());
    setPage(1);
  }

  function handleClearSearch(): void {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }

  function handleSearchInput(event: React.ChangeEvent<HTMLInputElement>): void {
    setSearchInput(event.target.value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  }

  const startIndex = (page - 1) * ROWS_PER_PAGE + 1;
  const endIndex = Math.min(page * ROWS_PER_PAGE, totalUsers);

  return (
    <section className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage system access and permissions.
          </p>
        </div>

        <Link
          to="/users/create"
          className="gap-2 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create User
        </Link>
      </div>

      {/* Main Card*/}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={filterStatus}
              onValueChange={(value: string) => {
                const status = value as "all" | "active" | "inactive";
                setFilterStatus(status);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex w-full max-w-md items-center gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search users..."
                  value={searchInput}
                  onChange={handleSearchInput}
                  onKeyDown={handleKeyDown}
                  className="pr-8"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={handleSearch}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col p-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-65">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-35">Created</TableHead>
                  <TableHead className="w-45 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && errorMessage && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-destructive"
                    >
                      {errorMessage}
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && users.length === 0 && !errorMessage && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}

                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {user.name}
                          </span>
                          {user.email === "root@system.com" && (
                            <Badge
                              variant="default"
                              className="h-5 bg-slate-800 px-1.5 py-0 text-[10px] hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900"
                            >
                              ROOT
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{user.email}</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No roles
                          </span>
                        )}
                        {user.roles.map((role) => (
                          <Badge
                            key={role.id}
                            variant="secondary"
                            className="font-normal"
                          >
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      {user.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400 border-none">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/users/details/${user.id}`}
                          title="View user details"
                          className="gap-2 h-8 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/20"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination*/}
          <div className="flex items-center justify-between border-t px-6 py-4 bg-card">
            <span className="text-sm text-muted-foreground">
              {totalUsers > 0
                ? `${startIndex}–${endIndex} of ${totalUsers} users`
                : "No users"}
            </span>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
