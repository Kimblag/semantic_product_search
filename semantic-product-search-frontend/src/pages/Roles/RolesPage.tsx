import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAxiosErrorMessage, getAxiosStatus } from "../../api/errors";
import { fetchRolesList } from "../../api/roles";
import { ShieldIcon } from "../../components/icons";
import type { RoleListItem } from "../../types/role";

function normalizeRoleName(name: string): string {
	return name.trim().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function getRolesErrorMessage(error: unknown): string {
	const status = getAxiosStatus(error);
	if (status === 403) {
		return "You do not have permission to view roles.";
	}

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

	const totalRoles = useMemo(() => roles.length, [roles.length]);

	return (
		<section className="space-y-6">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-pine-teal-300 md:text-3xl">Roles</h1>
					<p className="mt-1 text-sm text-pine-teal-600">
						Fixed role catalog for access control and permissions.
					</p>
				</div>

				<button
					type="button"
					onClick={() => void loadRoles()}
					disabled={isLoading}
					className="inline-flex items-center gap-2 rounded-xl border border-pine-teal-600/20 bg-white px-4 py-2 text-sm font-semibold text-pine-teal-400 transition hover:bg-dust-grey-900 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isLoading ? "Refreshing..." : "Refresh list"}
				</button>
			</header>

			<section className="overflow-hidden rounded-2xl border border-pine-teal-600/10 bg-white shadow-[0_12px_28px_-20px_rgba(31,46,38,0.45)]">
				<div className="overflow-x-auto">
					<table className="min-w-full text-left text-sm">
						<thead className="bg-dust-grey-900 text-xs uppercase tracking-wider text-pine-teal-600">
							<tr>
								<th className="px-6 py-4">Role</th>
								<th className="px-6 py-4">Description</th>
								<th className="px-6 py-4 text-right">Detail</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-pine-teal-600/10">
							{isLoading && (
								<tr>
									<td className="px-6 py-5 text-pine-teal-600" colSpan={3}>
										Loading roles...
									</td>
								</tr>
							)}

							{!isLoading && errorMessage && (
								<tr>
									<td className="px-6 py-5 text-hunter-green-300" colSpan={3}>
										{errorMessage}
									</td>
								</tr>
							)}

							{!isLoading && !errorMessage && roles.length === 0 && (
								<tr>
									<td className="px-6 py-5 text-pine-teal-600" colSpan={3}>
										No roles found.
									</td>
								</tr>
							)}

							{!isLoading &&
								!errorMessage &&
								roles.map((role) => (
									<tr key={role.id} className="hover:bg-dust-grey-900/35 transition-colors">
										<td className="px-6 py-5 whitespace-nowrap">
											<div className="flex items-center gap-3">
												<span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fern-700/15 text-fern-500">
													<ShieldIcon className="h-4 w-4" aria-hidden="true" />
												</span>
												<span className="font-semibold text-pine-teal-400">
													{normalizeRoleName(role.name)}
												</span>
											</div>
										</td>
										<td className="px-6 py-5 text-pine-teal-600">{role.description}</td>
										<td className="px-6 py-5 text-right">
											<Link
												to={`/roles/${role.id}`}
												className="text-sm font-semibold text-fern-500 hover:text-fern-400"
											>
												Open detail
											</Link>
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>

				<footer className="border-t border-pine-teal-600/10 bg-dust-grey-900/55 px-6 py-3 text-xs text-pine-teal-600">
					Showing {totalRoles} {totalRoles === 1 ? "role" : "roles"}.
				</footer>
			</section>

			<aside className="rounded-xl border border-fern-700/25 bg-fern-700/10 p-4 text-sm text-fern-300">
				Roles are fixed in this system. This module is read-only and intended for
				visibility of role definitions and their permission scope.
			</aside>
		</section>
	);
}
