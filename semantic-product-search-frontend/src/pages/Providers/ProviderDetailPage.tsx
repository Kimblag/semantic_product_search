import { useCallback, useEffect, useState, ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  FileUp,
  FileX,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  XCircle,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


import { getAxiosErrorMessage } from "@/api/errors";
import { CatalogStatus, ProviderDetail } from "@/types/providers";
import { fetchProviderDetail, updateProvider, uploadProviderCatalog } from '@/api/providers';


interface StatusConfig {
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: LucideIcon;
  className: string;
}

const CATALOG_STATUS_MAP: Record<CatalogStatus, StatusConfig> = {
  PROCESSING: {
    variant: "secondary",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-none",
  },
  ACTIVE: {
    variant: "default",
    icon: FileCheck,
    className: "bg-emerald-500/10 text-emerald-600 border-none",
  },
  FAILED: {
    variant: "destructive",
    icon: FileX,
    className: "",
  },
  ARCHIVED: {
    variant: "outline",
    icon: FileText,
    className: "text-muted-foreground",
  },
};

export function ProviderDetailPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    if (!providerId) return;
    setIsLoading(true);
    try {
      const data = await fetchProviderDetail(providerId);
      setProvider(data);
    } catch (err) {
      toast.error(
        getAxiosErrorMessage(err) || "Failed to load provider details",
      );
      navigate("/providers");
    } finally {
      setIsLoading(false);
    }
  }, [providerId, navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleStatus = async () => {
    if (!provider || !providerId) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = !provider.active;
      await updateProvider(providerId, { active: newStatus });
      setProvider({ ...provider, active: newStatus });
      toast.success(
        `Provider ${newStatus ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      toast.error(getAxiosErrorMessage(err) || "Update failed");
    } finally {
      setIsUpdatingStatus(false);
      setIsStatusDialogOpen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !providerId) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Only CSV files are allowed");
      return;
    }

    setIsUploading(true);
    try {
      await uploadProviderCatalog(providerId, file);
      toast.success("Catalog uploaded and processing started");
      void loadData();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err) || "Upload failed");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const renderStatusBadge = (status: CatalogStatus): ReactElement => {
    const config = CATALOG_STATUS_MAP[status];
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={`gap-1.5 px-2 py-0.5 font-medium ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!provider) return null;

  return (
    <section className="flex flex-col gap-6 animate-rise">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          to="/providers"
          className="hover:text-foreground transition-colors"
        >
          Providers
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{provider.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{provider.name}</h1>
            <Badge
              variant={provider.active ? "default" : "secondary"}
              className={
                provider.active
                  ? "bg-emerald-500/15 text-emerald-700 border-none"
                  : ""
              }
            >
              {provider.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Provider unique code:{" "}
            <span className="font-mono font-bold text-foreground">
              {provider.code}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/providers")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile and Catalogs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Information</CardTitle>
              <CardDescription>
                Official contact and location details.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Email
                  </p>
                  <p className="text-sm font-medium">{provider.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Telephone
                  </p>
                  <p className="text-sm font-medium">
                    {provider.telephone || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2 border-t pt-4">
                <MapPin className="mt-1 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Headquarters Address
                  </p>
                  <p className="text-sm font-medium">
                    {provider.address || "No address registered"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <CardTitle>Catalog History</CardTitle>
                <CardDescription>
                  Managed CSV versions for semantic search.
                </CardDescription>
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="catalog-upload"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading || !provider.active}
                />
                <Button
                  asChild
                  variant="default"
                  disabled={isUploading || !provider.active}
                >
                  <label
                    htmlFor="catalog-upload"
                    className="cursor-pointer gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Upload New
                  </label>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-y">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Version</th>
                      <th className="px-6 py-3 font-medium">Filename</th>
                      <th className="px-6 py-3 font-medium">Upload Date</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {provider.catalogProviderVersions?.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-muted-foreground italic"
                        >
                          No catalogs uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      [...provider.catalogProviderVersions]
                        .reverse()
                        .map((v) => (
                          <tr
                            key={v.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4 font-mono font-bold">
                              v{v.versionNumber}
                            </td>
                            <td className="px-6 py-4 truncate max-w-50">
                              {v.originalFile}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              {renderStatusBadge(v.status)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deactivating a provider prevents new catalog uploads and ignores
                its products in matching operations.
              </p>
              <Button
                variant={provider.active ? "destructive" : "default"}
                className="w-full gap-2"
                onClick={() => setIsStatusDialogOpen(true)}
                disabled={isUpdatingStatus}
              >
                {provider.active ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                {provider.active
                  ? "Deactivate Provider"
                  : "Reactivate Provider"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" /> System Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Internal ID</span>
                <span className="font-mono text-[10px] bg-muted px-1 rounded">
                  {provider.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created at</span>
                <span>{new Date(provider.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {provider.active
                ? "This will hide all products associated with this provider from the semantic search until reactivated."
                : "This will make the latest active catalog of this provider available for matching again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleToggleStatus();
              }}
              className={
                provider.active
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
