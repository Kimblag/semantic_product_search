import { useEffect, useState } from "react";
import { Eye, EyeOff, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

import { fetchRolesList } from "@/api/roles";
import type { RoleListItem } from "@/types/role";

export interface CreateUserFormData {
  name: string;
  email: string;
  password?: string;
  roles: string[];
}

interface CreateUserFormProps {
  initialData?: CreateUserFormData;
  onSubmit: (data: CreateUserFormData) => Promise<void>;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  roles?: string;
}

export function CreateUserForm({
  initialData,
  onSubmit,
  isLoading = false,
}: CreateUserFormProps) {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<CreateUserFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    roles: initialData?.roles || [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const [availableRoles, setAvailableRoles] = useState<RoleListItem[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const roles = await fetchRolesList();
        setAvailableRoles(roles);
      } catch (error) {
        console.error("Failed to load roles", error);
      } finally {
        setIsLoadingRoles(false);
      }
    };
    void loadRoles();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = "A valid email is required.";
    }

    if (!isEditing || formData.password) {
      const p = formData.password || "";
      if (p.length < 12) {
        newErrors.password = "Password must be at least 12 characters long.";
      } else if (
        !/[A-Z]/.test(p) ||
        !/[a-z]/.test(p) ||
        !/[0-9]/.test(p) ||
        !/[^A-Za-z0-9]/.test(p)
      ) {
        newErrors.password =
          "Must include uppercase, lowercase, numbers, and special characters.";
      }
    }

    if (formData.roles.length === 0) {
      newErrors.roles = "At least one role must be selected.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const toggleRole = (roleId: string) => {
    setFormData((prev) => {
      const currentRoles = prev.roles;
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter((id) => id !== roleId)
        : [...currentRoles, roleId];

      if (errors.roles && newRoles.length > 0) {
        setErrors((errs) => ({ ...errs, roles: undefined }));
      }

      return { ...prev, roles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit({
        ...formData,
        name: formData.name.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* General Information */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-lg font-medium">General Information</h3>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="name"
              className={errors.name ? "text-destructive" : ""}
            >
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              className={
                errors.name
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className={errors.email ? "text-destructive" : ""}
            >
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane.doe@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className={
                errors.email
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label
              htmlFor="password"
              className={errors.password ? "text-destructive" : ""}
            >
              {isEditing
                ? "New Password (leave blank to keep current)"
                : "Password"}
            </Label>
            <div className="relative max-w-md">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={isEditing ? "••••••••" : "Complex password"}
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={`pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
            {!errors.password && !isEditing && (
              <p className="text-xs text-muted-foreground">
                Min 12 chars. Must include uppercase, lowercase, numbers &
                special characters.
              </p>
            )}
          </div>

          {/* Roles Assignment */}
          <div className="space-y-4 md:col-span-2 mt-4 pt-4 border-t">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Role Assignment</h3>
              <p className="text-sm text-muted-foreground">
                Select the permissions this user will have.
              </p>
            </div>

            {isLoadingRoles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading roles...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableRoles.map((role) => {
                  const isSelected = formData.roles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => toggleRole(role.id)}
                      className={`flex flex-col items-start p-4 border rounded-xl text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}
                      >
                        {role.name.replace(/[_-]/g, " ").toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {role.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.roles && (
              <p className="text-xs text-destructive">{errors.roles}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isLoading || isLoadingRoles}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? "Save Changes" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
