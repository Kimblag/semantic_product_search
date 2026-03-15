import {
  downloadRequirementCsv,
  fetchRequirementDetail,
} from "@/api/requirements";
import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RequirementMatchingResponse } from "@/types/requirement";
import {
  ArrowLeft,
  Box,
  Building,
  Download,
  Loader2,
  Search,
  Target,
  User as UserIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin =
    user?.roles?.some((role) => role.toUpperCase() === "ADMIN") ?? false;

  const [data, setData] = useState<RequirementMatchingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetchRequirementDetail(id, isAdmin, currentPage);
      setData(res);
    } catch {
      toast.error("Failed to load matching results");
      navigate("/requirements");
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, currentPage, navigate]);

  useEffect(() => {
    void loadDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadDetail]);

  const handleExport = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      await downloadRequirementCsv(id);
      toast.success("Results exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  if (!data && loading) {
    return (
      <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const paginatedData = data.results[0]?.items;
  const items = paginatedData?.data || [];
  const meta = paginatedData?.meta || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  return (
    <div className="flex flex-col gap-8 animate-rise pb-10">
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between border-b pb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5 gap-1.5 px-2"
            >
              <Target className="h-3 w-3" /> Processed
            </Badge>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Match Results</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Semantic analysis for requirement ID:{" "}
              <span className="font-mono">
                {data.requirementId?.split("-")[0]}
              </span>
            </p>
          </div>
          <div className="flex gap-6 text-[11px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-3.5 w-3.5" />{" "}
              <span className="font-bold text-foreground">{data.client}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" /> {data.userName}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2 shadow-lg shadow-primary/20 h-10"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}{" "}
            Export CSV
          </Button>
          <span className="text-[10px] font-medium text-muted-foreground">
            Total items: {meta.total}
          </span>
        </div>
      </div>

      {loading && data && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <div className="space-y-10">
          <div className="space-y-6">
            {items.map((item, idx) => {
              // Calcular índice continuo para mejor UX
              const globalIndex = (meta.page - 1) * meta.limit + idx + 1;

              return (
                <div
                  key={idx}
                  className="grid lg:grid-cols-12 gap-6 bg-card rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md"
                >
                  {/* LEFT: REQUIRED ITEM */}
                  <div className="lg:col-span-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-3">
                      <Search className="h-3 w-3" /> Target Item #{globalIndex}
                    </div>
                    <h3 className="font-bold text-xl leading-tight mb-3">
                      {item.productName}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.category && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] uppercase"
                        >
                          {item.category}
                        </Badge>
                      )}
                      {item.brand && item.brand.trim() !== "" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase border-primary/30"
                        >
                          {item.brand}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-4 italic border-l-2 pl-3">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* RIGHT: MATCHES */}
                  <div className="lg:col-span-8 bg-muted/30 rounded-xl p-4 ring-1 ring-border/50">
                    <div className="text-[10px] uppercase font-black text-primary tracking-widest mb-4 flex items-center gap-2">
                      <Box className="h-3 w-3" /> Found in Catalog (
                      {item.matches?.length || 0})
                    </div>

                    <div className="space-y-3 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
                      {!item.matches || item.matches.length === 0 ? (
                        <div className="h-24 flex items-center justify-center text-xs text-muted-foreground italic border border-dashed rounded-lg bg-background">
                          No matches found above threshold.
                        </div>
                      ) : (
                        item.matches.map((match, mIdx) => (
                          <div
                            key={mIdx}
                            className="flex items-center justify-between p-4 rounded-xl bg-background border hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`flex flex-col items-center justify-center h-12 w-14 rounded-lg text-xs font-black ${
                                  mIdx === 0
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <span>{Math.round(match.score * 100)}%</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-primary tracking-tighter">
                                  {match.providerName}
                                </span>
                                <span className="font-bold text-sm leading-tight py-0.5">
                                  {match.name}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  SKU: {match.sku}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SERVER PAGINATION CONTROLS */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t mt-4">
          <p className="text-[11px] font-medium text-muted-foreground italic">
            Showing page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-4"
              disabled={meta.page === 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-4"
              disabled={meta.page === meta.totalPages || loading}
              onClick={() =>
                setCurrentPage((p) => Math.min(meta.totalPages, p + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
