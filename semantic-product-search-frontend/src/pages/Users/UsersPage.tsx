import { useCallback, useEffect, useState } from "react";
import { Eye, Search, X } from "lucide-react";
import { getAxiosErrorMessage, getAxiosStatus } from "../../api/errors";
import { fetchUsersList } from "../../api/users";
import type { UserListItem } from "../../types/user";

const ROWS_PER_PAGE = 10;

function normalizeUserName(name: string): string {
  return name.trim();
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getUserErrorMessage(error: unknown): string {
  const status = getAxiosStatus(error);
  if (status === 403) {
    return "You do not have permission to view users.";
  }

  const message = getAxiosErrorMessage(error);
  if (message) return message;

  return "Unable to load users right now. Please try again.";
}

export function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const isActive =
        filterStatus === "all"
          ? undefined
          : filterStatus === "active";

      const data = await fetchUsersList({
        page: currentPage,
        limit: ROWS_PER_PAGE,
        q: appliedSearchQuery.trim() || undefined,
        isActive,
      });

      setUsers(data.data);
      setTotalUsers(data.meta.total);
      setTotalPages(data.meta.totalPages);
      setCurrentPage(data.meta.page);
    } catch (error) {
      setErrorMessage(getUserErrorMessage(error));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filterStatus, appliedSearchQuery]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback(() => {
    setAppliedSearchQuery(searchQueryInput.trim());
    setCurrentPage(1);
  }, [searchQueryInput]);

  const handleResetFilters = useCallback(() => {
    setSearchQueryInput("");
    setAppliedSearchQuery("");
    setFilterStatus("all");
    setCurrentPage(1);
  }, []);

  const startIndex = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ROWS_PER_PAGE, totalUsers);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-pine-teal-300 md:text-3xl">Users</h1>
        <p className="text-sm text-pine-teal-600">
          Manage system access and permissions for all team members.
        </p>
      </header>

      {/* Filters Card */}
      <article className="overflow-hidden rounded-2xl border border-pine-teal-600/10 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-pine-teal-600">
              Search
            </label>
            <input
              type="text"
              placeholder="email, name, role..."
              value={searchQueryInput}
              onChange={(e) => setSearchQueryInput(e.target.value)}
              className="h-9 w-full rounded-lg border border-pine-teal-600/15 bg-dust-grey-900/35 px-3 text-sm text-pine-teal-300 placeholder:text-pine-teal-600/50 transition focus:border-fern-700/30 focus:outline-none focus:ring-2 focus:ring-fern-700/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-pine-teal-600">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as "all" | "active" | "inactive");
                setCurrentPage(1);
              }}
              className="h-9 w-full rounded-lg border border-pine-teal-600/15 bg-dust-grey-900/35 px-3 text-sm text-pine-teal-300 transition focus:border-fern-700/30 focus:outline-none focus:ring-2 focus:ring-fern-700/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          <div />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-fern-700 px-4 text-sm font-semibold text-dust-grey-900 shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-pine-teal-600/20 px-3 text-pine-teal-600 transition hover:bg-pine-teal-600/10 disabled:cursor-not-allowed disabled:opacity-60"
              title="Clear all filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-pine-teal-600/10 bg-white shadow-[0_12px_28px_-20px_rgba(31,46,38,0.45)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-dust-grey-900 text-xs uppercase tracking-wider text-pine-teal-600">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pine-teal-600/10">
              {isLoading && (
                <tr>
                  <td className="px-6 py-5 text-pine-teal-600" colSpan={6}>
                    Loading users...
                  </td>
                </tr>
              )}

              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-6 py-5 text-hunter-green-300" colSpan={6}>
                    {errorMessage}
                  </td>
                </tr>
              )}

              {!isLoading && !errorMessage && users.length === 0 && (
                <tr>
                  <td className="px-6 py-5 text-pine-teal-600" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors ${
                      user.active
                        ? "hover:bg-dust-grey-900/30"
                        : "opacity-65 hover:bg-dust-grey-900/20"
                    }`}
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fern-700/15 text-xs font-bold text-fern-500">
                          {getInitials(user.name)}
                        </span>
                        <span className={`font-semibold ${user.active ? "text-pine-teal-300" : "text-pine-teal-600"}`}>
                          {normalizeUserName(user.name)}
                        </span>
                      </div>
                    </td>

                    <td className={`px-6 py-5 ${user.active ? "text-pine-teal-600" : "text-pine-teal-600/75"}`}>
                      {user.email}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center rounded-full bg-fern-700/20 px-3 py-1.5 text-xs font-semibold text-fern-500 ring-1 ring-fern-700/30"
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-pine-teal-600/60 italic">No roles</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-fern-700/15 px-2.5 py-1 text-xs font-semibold text-fern-500">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-fern-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-teal-600/10 px-2.5 py-1 text-xs font-semibold text-pine-teal-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-pine-teal-600" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className={`px-6 py-5 text-xs ${user.active ? "text-pine-teal-600" : "text-pine-teal-600/75"}`}>
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg text-fern-500 transition hover:text-fern-400 disabled:cursor-not-allowed disabled:opacity-60"
                        title="View user details"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-semibold">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && users.length > 0 && (
          <footer className="border-t border-pine-teal-600/10 bg-dust-grey-900/55 px-6 py-4 text-xs text-pine-teal-600">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">
                {totalUsers > 0
                  ? `Page ${currentPage} of ${totalPages} • ${startIndex}–${endIndex} of ${totalUsers} users`
                  : "No users to display"}
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-pine-teal-600/20 text-pine-teal-600 transition hover:bg-pine-teal-600/10 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Previous page"
                  >
                    ←
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(
                        Math.max(0, currentPage - 2),
                        Math.min(totalPages, currentPage + 1),
                      )
                      .map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                            currentPage === page
                              ? "bg-fern-700 text-dust-grey-900 font-bold"
                              : "border border-pine-teal-600/20 text-pine-teal-600 hover:bg-pine-teal-600/10"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-pine-teal-600/20 text-pine-teal-600 transition hover:bg-pine-teal-600/10 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Next page"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}
