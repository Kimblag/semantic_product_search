import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";

import {
  CreateUserForm,
  type CreateUserFormData,
} from "@/components/users/CreateUserForm";
import { Button } from "@/components/ui/button";

import { createUser } from "@/api/users";
import { getAxiosErrorMessage } from "@/api/errors";

export function CreateUserPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // El password es obligatorio en creación gracias a la validación del form,
      // pero para TypeScript aseguramos que se envía.
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password!,
        roles: data.roles,
      });

      navigate("/users");
    } catch (error) {
      const msg = getAxiosErrorMessage(error);
      setApiError(
        msg ||
          "Failed to create user. Please check your network and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6 min-h-[calc(100vh-4rem)]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          to="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/users" className="hover:text-foreground transition-colors">
          Users
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Create User</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Create New User</h1>
          <p className="text-sm text-muted-foreground">
            Add a new user to the system and assign their access roles.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/users")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to users</span>
        </Button>
      </div>

      {apiError && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive border border-destructive/30">
          {apiError}
        </div>
      )}

      <CreateUserForm onSubmit={handleSubmit} isLoading={isSubmitting} />
    </section>
  );
}
