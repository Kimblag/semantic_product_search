import type { SVGProps } from "react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ClientIcon,
  CloseIcon,
  DashboardIcon,
  MenuIcon,
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
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", to: "/dashboard", Icon: DashboardIcon },
      { label: "Requirements", to: "/requirements", Icon: RequirementIcon },
      { label: "Providers", to: "/providers", Icon: ProviderIcon },
      { label: "Clients", to: "/clients", Icon: ClientIcon },
    ],
  },
  {
    title: "Access",
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
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.24em] text-dust-grey-700">
          Semantic Product Search
        </p>
        <h1 className="mt-1 text-lg font-semibold text-dust-grey-900 animate-rise">
          Control Center
        </h1>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {menuSections.map((section) => (
          <section key={section.title}>
            <p className="px-3 text-[10px] uppercase tracking-[0.2em] text-dry-sage-700">
              {section.title}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item, itemIndex) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition duration-200",
                      isActive
                        ? "bg-linear-to-r from-dry-sage-700/35 to-fern-700/18 text-dust-grey-900 ring-1 ring-white/15"
                        : "text-dust-grey-700 hover:bg-white/10 hover:text-dust-grey-900",
                    ].join(" ")
                  }
                  style={{ animationDelay: `${50 + itemIndex * 35}ms` }}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/12 text-dust-grey-900 group-hover:bg-white/22">
                    <item.Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-dust-grey-700">
        v0.1.0 Build with rhythm
      </div>
    </>
  );
}

export function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const currentPageLabel = useMemo(() => {
    for (const section of menuSections) {
      const current = section.items.find(
        (item) => item.to === location.pathname,
      );
      if (current) return current.label;
    }
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="min-h-screen text-pine-teal-300">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-10 top-14 h-48 w-48 rounded-full bg-dry-sage-700/30 blur-3xl animate-float-soft" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-fern-700/25 blur-3xl animate-float-soft" />
      </div>
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col bg-gradient-to-b from-pine-teal-500 via-pine-teal-500 to-pine-teal-400 md:flex">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-pine-teal-600/20 bg-dust-grey-900/85 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 md:px-7">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Open menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-pine-teal-700/30 text-pine-teal-400 md:hidden"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <MenuIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-pine-teal-600">
                    Workspace
                  </p>
                  <h2 className="text-base font-semibold text-pine-teal-300 md:text-lg">
                    {currentPageLabel}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-pine-teal-300">
                    Alex Miller
                  </p>
                  <p className="text-xs text-pine-teal-600">Administrator</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-dry-sage-500 text-sm font-semibold text-pine-teal-300 ring-2 ring-dust-grey-900/70">
                  AM
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-7 md:py-8 animate-rise">
            <Outlet />
          </main>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-gradient-to-b from-pine-teal-500 via-pine-teal-500 to-pine-teal-400 shadow-2xl animate-rise">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="text-sm font-semibold text-dust-grey-900">
                Navigation
              </p>
              <button
                type="button"
                aria-label="Close menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dust-grey-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
