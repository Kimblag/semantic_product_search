import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { MainLayout } from "../layout/MainLayout";
import { LoginPage } from "../pages/Login/LoginPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { ProfilePage } from "../pages/Profile/ProfilePage";
import { ProvidersPage } from "../pages/Providers/ProvidersPage";
import { RequirementsPage } from "../pages/Requirements/RequirementsPage";
import { RoleDetailPage } from "../pages/Roles/RoleDetailPage";
import { RolesPage } from "../pages/Roles/RolesPage";
import { UsersPage } from "../pages/Users/UsersPage";
import { ClientsPage } from "../pages/Clients/ClientsPage";
import { CreateUserPage } from "@/pages/Users/CreateUserPage";
import { UserDetailPage } from "@/pages/Users/UserDetailPage";
import { CreateProviderPage } from "@/pages/Providers/CreateProviderPage";
import { ProviderDetailPage } from "@/pages/Providers/ProviderDetailPage";
import { ClientDetailPage } from "@/pages/Clients/ClientDetailPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate replace to="/dashboard" />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
          <Route element={<MainLayout />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/create" element={<CreateUserPage />} />
            <Route path="/users/details/:userId" element={<UserDetailPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/roles/:roleId" element={<RoleDetailPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/providers/create" element={<CreateProviderPage />} />
            <Route
              path="/providers/details/:providerId"
              element={<ProviderDetailPage />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate replace to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
