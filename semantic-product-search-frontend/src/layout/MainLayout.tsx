import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { SVGProps, useCallback, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "../auth/useAuth";
import {
  ClientIcon,
  DashboardIcon,
  ProfileIcon,
  ProviderIcon,
  RequirementIcon,
  ShieldIcon,
  UsersIcon,
} from "../components/icons";

type MenuItem = {
  label: string;
  to: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  allowedRoles?: string[];
};
type MenuSection = {
  title: string;
  items: MenuItem[];
  allowedRoles?: string[];
};

const menuSections: MenuSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", to: "/dashboard", Icon: DashboardIcon },
      { label: "Requirements", to: "/requirements", Icon: RequirementIcon },
      {
        label: "Providers",
        to: "/providers",
        Icon: ProviderIcon,
        allowedRoles: ["Admin"],
      },
      { label: "Clients", to: "/clients", Icon: ClientIcon },
    ],
  },
  {
    title: "Access",
    allowedRoles: ["Admin"],
    items: [
      { label: "Users", to: "/users", Icon: UsersIcon },
      { label: "Roles", to: "/roles", Icon: ShieldIcon },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Profile", to: "/profile", Icon: ProfileIcon }],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, navigate]);

  // filter sections based on user roles if needed
  const visibleSections = useMemo(() => {
    return menuSections
      .filter((section) => {
        if (!section.allowedRoles || section.allowedRoles.length === 0)
          return true;
        return hasAnyRole(section.allowedRoles);
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
          return hasAnyRole(item.allowedRoles);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [hasAnyRole]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-6">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          SPS Platform
        </p>
        <h1 className="mt-2 text-lg font-bold text-foreground">
          Product Operations
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
        {visibleSections.map((section) => (
          <section key={section.title}>
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground/70">
              {section.title}
            </p>
            <div className="mt-3 space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    ].join(" ")
                  }
                >
                  <item.Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-border px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleLogout}
          disabled={isSigningOut}
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? "Signing out..." : "Logout"}
        </Button>
      </div>

      <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
        v0.1.0 • SPS
      </div>
    </div>
  );
}

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const displayName = user?.name?.trim() || "Workspace User";
  const displayRole = user?.roles?.[0] || "Executive";

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0]?.slice(0, 2).toUpperCase() || "WU";
  }, [displayName]);

  const currentPageLabel = useMemo(() => {
    for (const section of menuSections) {
      const match = section.items.find((item) => item.to === location.pathname);
      if (match) return match.label;
    }
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1 min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between h-16 px-4 md:px-8">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label="Open menu"
                  className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-input hover:bg-accent"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-bold">{currentPageLabel}</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayRole}</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {initials}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu backdrop"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-border bg-sidebar animate-rise">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <p className="text-sm font-semibold">Navigation</p>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <Toaster richColors position="top-right" />
    </div>
  );
}
