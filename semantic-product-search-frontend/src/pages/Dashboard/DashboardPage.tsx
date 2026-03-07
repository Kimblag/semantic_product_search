import { AlertIcon, CheckIcon, PulseIcon } from "../../components/icons";

const metrics = [
	{ label: "Processing", value: "24", note: "Active", Icon: PulseIcon },
	{ label: "Processed", value: "1,432", note: "+12% today", Icon: CheckIcon },
	{ label: "Errors", value: "12", note: "Requires action", Icon: AlertIcon },
];

const recentRequirements = [
	{
		id: "REQ-9042",
		client: "Global Tech",
		user: "Sarah Jenkins",
		status: "Processed",
		createdAt: "2026-03-07",
	},
	{
		id: "REQ-9041",
		client: "Apex Corp",
		user: "Mark Smith",
		status: "Processing",
		createdAt: "2026-03-07",
	},
	{
		id: "REQ-9040",
		client: "Zenith Solutions",
		user: "Emily Chen",
		status: "Error",
		createdAt: "2026-03-06",
	},
];

export function DashboardPage() {
	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-bold text-pine-teal-300 md:text-3xl">Dashboard</h1>
				<p className="mt-1 text-sm text-pine-teal-600">
					Overview of your product matching pipeline.
				</p>
			</header>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				{metrics.map((metric, index) => (
					<article
						key={metric.label}
						className="rounded-2xl border border-pine-teal-600/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(31,46,38,0.45)] animate-rise"
						style={{ animationDelay: `${100 + index * 60}ms` }}
					>
						<div className="flex items-center justify-between">
							<p className="text-xs font-semibold uppercase tracking-wider text-pine-teal-600">
								{metric.label}
							</p>
							<div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-dust-grey-900 text-pine-teal-500">
								<metric.Icon className="h-4 w-4" aria-hidden="true" />
							</div>
						</div>
						<div className="mt-4 flex items-end gap-3">
							<p className="text-3xl font-bold text-pine-teal-400">{metric.value}</p>
							<p className="rounded-full bg-dry-sage-700/40 px-2 py-0.5 text-xs font-medium text-pine-teal-400">
								{metric.note}
							</p>
						</div>
					</article>
				))}
			</div>

			<section className="overflow-hidden rounded-2xl border border-pine-teal-600/10 bg-white shadow-[0_12px_28px_-20px_rgba(31,46,38,0.45)] animate-rise" style={{ animationDelay: "240ms" }}>
				<header className="border-b border-pine-teal-600/10 px-4 py-4 md:px-6">
					<h2 className="text-base font-semibold text-pine-teal-400">Recent Requirements</h2>
				</header>
				<div className="overflow-x-auto">
					<table className="min-w-full text-left text-sm">
						<thead className="bg-dust-grey-800 text-xs uppercase tracking-wider text-pine-teal-600">
							<tr>
								<th className="px-4 py-3 md:px-6">ID</th>
								<th className="px-4 py-3 md:px-6">Client</th>
								<th className="px-4 py-3 md:px-6">User</th>
								<th className="px-4 py-3 md:px-6">Status</th>
								<th className="px-4 py-3 md:px-6">Created</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-pine-teal-600/10">
							{recentRequirements.map((row) => (
								<tr key={row.id} className="text-pine-teal-400">
									<td className="px-4 py-3 font-semibold md:px-6">{row.id}</td>
									<td className="px-4 py-3 md:px-6">{row.client}</td>
									<td className="px-4 py-3 md:px-6">{row.user}</td>
									<td className="px-4 py-3 md:px-6">{row.status}</td>
									<td className="px-4 py-3 text-pine-teal-600 md:px-6">{row.createdAt}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</section>
	);
}
