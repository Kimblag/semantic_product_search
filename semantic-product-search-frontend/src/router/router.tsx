import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "../layout/MainLayout";
import { LoginPage } from "../pages/Login/LoginPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { ProfilePage } from "../pages/Profile/ProfilePage";
import { ProvidersPage } from "../pages/Providers/ProvidersPage";
import { RequirementsPage } from "../pages/Requirements/RequirementsPage";
import { RolesPage } from "../pages/Roles/RolesPage";
import { UsersPage } from "../pages/Users/UsersPage";
import { ClientsPage } from "../pages/Clients/ClientsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<MainLayout />}>
          <Route index element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/requirements" element={<RequirementsPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
