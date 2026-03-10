import { useCallback, useEffect, useState, ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Download,
  FileCheck,
  FileText,
  FileUp,
  FileX,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  XCircle,
  LucideIcon,
  AlertCircle,
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

import {
  fetchProviderDetail,
  updateProvider,
  uploadProviderCatalog,
  downloadProviderTemplate,
} from "@/api/providers";
import { getAxiosErrorMessage } from "@/api/errors";
import type { ProviderDetail, CatalogStatus } from "@/types/providers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusConfig {
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: LucideIcon;
  className: string;
}

const CATALOG_STATUS_MAP: Record<CatalogStatus, StatusConfig> = {
  PROCESSING: {
    variant: "secondary",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-none animate-pulse",
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

  const loadData = useCallback(
    async (showLoader = true) => {
      if (!providerId) return;
      if (showLoader) setIsLoading(true);
      try {
        const data = await fetchProviderDetail(providerId);
        setProvider(data);
      } catch (err) {
        toast.error(
          getAxiosErrorMessage(err) || "Failed to load provider details",
        );
        if (showLoader) navigate("/providers");
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [providerId, navigate],
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    const isProcessing = provider?.catalogProviderVersions?.some(
      (v) => v.status === "PROCESSING",
    );

    if (!isProcessing) return;

    const intervalId: number = window.setInterval(() => {
      loadData(false);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [provider, loadData]);

  const handleToggleStatus = async () => {
    if (!provider || !providerId) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = !provider.active;
      await updateProvider(providerId, { active: newStatus });
      setProvider({ ...provider, active: newStatus });
      toast.success(`Provider ${newStatus ? "activated" : "deactivated"}`);
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

    setIsUploading(true);
    try {
      await uploadProviderCatalog(providerId, file);
      toast.info("Processing catalog...");
      await loadData(false);
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
      {/* BREADCRUMB */}
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

      {/* HEADER */}
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
            Code:{" "}
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
        {/* INFO & CATALOGS */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Email
                  </p>
                  <p className="text-sm font-medium">{provider.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Phone
                  </p>
                  <p className="text-sm font-medium">
                    {provider.telephone || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2 border-t pt-4">
                <MapPin className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Address
                  </p>
                  <p className="text-sm font-medium">{provider.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <CardTitle>Catalog History</CardTitle>
                <CardDescription>
                  Upload CSV files to update the semantic database.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadProviderTemplate()}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" /> Template
                </Button>
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
                    size="sm"
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
                      Upload CSV
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-y">
                    <tr className="text-left text-muted-foreground font-medium uppercase text-[10px]">
                      <th className="px-6 py-3">Version</th>
                      <th className="px-6 py-3">File</th>
                      <th className="px-6 py-3">Upload Date</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {!provider.catalogProviderVersions?.length ? (
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
                        .sort((a, b) => b.versionNumber - a.versionNumber)
                        .map((v) => (
                          <tr
                            key={v.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4 font-mono font-bold">
                              v{v.versionNumber}
                            </td>
                            <td className="px-6 py-4 truncate max-w-60">
                              {v.originalFile.split("/").pop()}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {renderStatusBadge(v.status)}

                                {v.status === "FAILED" && v.errorMessage && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs bg-destructive text-destructive-foreground">
                                        <p className="text-xs font-semibold">
                                          Processing Error:
                                        </p>
                                        <p className="text-[11px]">
                                          {v.errorMessage}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
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

        {/* ACTIONS & SYSTEM */}
        <div className="space-y-6">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Deactivating this provider will exclude its catalog from all
                matching operations.
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
                {provider.active ? "Deactivate" : "Activate"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[11px] font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">UUID</span>
                <span>{provider.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(provider.createdAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Provider Status?</AlertDialogTitle>
            <AlertDialogDescription>
              {provider.active
                ? "Disabling the provider will immediately stop its products from appearing in search results."
                : "Enabling the provider will restore its products to the semantic matching engine."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleToggleStatus();
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
