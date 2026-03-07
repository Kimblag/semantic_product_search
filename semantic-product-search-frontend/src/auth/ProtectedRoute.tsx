import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

type ProtectedRouteProps = {
	allowedRoles?: string[];
	redirectTo?: string;
};

export function ProtectedRoute({
	allowedRoles,
	redirectTo = "/login",
}: ProtectedRouteProps) {
	const { isAuthenticated, isInitializing, hasAnyRole, user } = useAuth();
	const location = useLocation();

	if (isInitializing) {
		return (
			<div className="grid min-h-screen place-items-center bg-dust-grey-900 text-pine-teal-400">
				<p className="text-sm">Checking your session...</p>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to={redirectTo} replace state={{ from: location }} />;
	}

	const canEvaluateRoles = Boolean(user && user.roles && user.roles.length > 0);

	if (
		allowedRoles &&
		allowedRoles.length > 0 &&
		canEvaluateRoles &&
		!hasAnyRole(allowedRoles)
	) {
		return <Navigate to="/dashboard" replace />;
	}

	return <Outlet />;
}
