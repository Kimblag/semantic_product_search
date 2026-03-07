import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAxiosErrorMessage, getAxiosStatus } from "../../api/errors";
import { fetchRoleDetail } from "../../api/roles";
import { CheckIcon, ShieldIcon } from "../../components/icons";
import type { RoleDetail } from "../../types/role";

function normalizeLabel(value: string): string {
  return value.trim().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function permissionAccentClass(index: number): string {
  const accents = [
    "from-fern-700/20 to-dry-sage-700/10 text-fern-400",
    "from-dry-sage-700/25 to-fern-700/12 text-dry-sage-500",
    "from-pine-teal-700/20 to-dry-sage-700/15 text-pine-teal-400",
  ];

  return accents[index % accents.length];
}

function getDetailErrorMessage(error: unknown): string {
  const status = getAxiosStatus(error);

  if (status === 403) {
    return "You do not have permission to view this role.";
  }

  if (status === 404) {
    return "Role was not found.";
  }

  const message = getAxiosErrorMessage(error);
  if (message) return message;

  return "Unable to load role details right now. Please try again.";
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
      if (!data) {
        setErrorMessage("Role was not found.");
        setRole(null);
        return;
      }

      setRole(data);
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
  const pageTitle = useMemo(() => {
    if (!role) return "Role Details";
    return normalizeLabel(role.name);
  }, [role]);

  const isNotFound = !isLoading && !role && !errorMessage;

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-pine-teal-600 md:text-sm">
          <Link to="/dashboard" className="hover:text-pine-teal-400 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/roles" className="hover:text-pine-teal-400 transition-colors">
            Roles
          </Link>
          <span>/</span>
          <span className="font-semibold text-pine-teal-300">{pageTitle}</span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/roles")}
          className="rounded-lg border border-pine-teal-700/30 px-4 py-2 text-sm font-semibold text-pine-teal-300 transition hover:bg-pine-teal-700/10"
        >
          Back to roles
        </button>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-pine-teal-600/10 bg-white p-6 text-pine-teal-600">
          Loading role details...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-2xl border border-hunter-green-300/30 bg-white p-6 text-hunter-green-300">
          {errorMessage}
        </div>
      )}

      {!isLoading && isNotFound && (
        <div className="rounded-2xl border border-pine-teal-600/10 bg-white p-6 text-pine-teal-600">
          Role was not found.
        </div>
      )}

      {!isLoading && role && (
        <>
          <article className="overflow-hidden rounded-2xl border border-pine-teal-600/10 bg-white shadow-[0_16px_36px_-26px_rgba(31,46,38,0.5)]">
            <div className="grid gap-0 md:grid-cols-[220px_1fr]">
              <div className="flex items-center justify-center bg-linear-to-br from-dry-sage-700/20 via-fern-700/10 to-transparent p-8">
                <div className="inline-flex h-28 w-28 items-center justify-center rounded-3xl bg-fern-700/14 text-fern-500 ring-1 ring-fern-700/20">
                  <ShieldIcon className="h-14 w-14" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-5 p-7 md:p-8">
                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full bg-dry-sage-700/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-dry-sage-500">
                    System Default
                  </span>
                  <h1 className="text-3xl font-bold tracking-tight text-pine-teal-300">
                    {normalizeLabel(role.name)}
                  </h1>
                  <p className="max-w-3xl text-base leading-relaxed text-pine-teal-600 md:text-lg">
                    {role.description}
                  </p>
                </div>

                <div className="border-t border-pine-teal-600/10 pt-4">
                  <p className="text-sm font-medium text-pine-teal-600">
                    This role is system-defined and read-only.
                  </p>
                  <p className="mt-1 text-sm text-pine-teal-600/85">
                    Role definitions are fixed and cannot be edited from this module.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <section className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-pine-teal-300 md:text-2xl">Permissions</h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pine-teal-600 ring-1 ring-pine-teal-600/10">
                {totalPermissions} active {totalPermissions === 1 ? "permission" : "permissions"}
              </span>
            </header>

            {role.permissions.length === 0 && (
              <div className="rounded-2xl border border-pine-teal-600/10 bg-white p-5 text-pine-teal-600">
                No permissions assigned to this role.
              </div>
            )}

            {role.permissions.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {role.permissions.map((permission, index) => (
                  <article
                    key={permission.id}
                    className="group rounded-xl border border-pine-teal-600/10 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(31,46,38,0.55)] transition hover:-translate-y-0.5 hover:border-fern-700/25"
                  >
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br ${permissionAccentClass(index)} ring-1 ring-current/10`}
                    >
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-pine-teal-300">
                      {normalizeLabel(permission.name)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-pine-teal-600">
                      {permission.description}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
