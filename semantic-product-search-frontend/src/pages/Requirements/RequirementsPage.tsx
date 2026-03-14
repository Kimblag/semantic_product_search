import { fetchRequirements } from "@/api/requirements";
import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequirementListItem } from "@/types/requirement";
import {
  Building,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function RequirementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;

  const [requirements, setRequirements] = useState<RequirementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true);
      try {
        // Sin filtro de clientId, trae todo según el rol
        const res = await fetchRequirements({ page, limit: 10 }, isAdmin);
        setRequirements(res.data);
        setTotalPages(res.meta.totalPages);
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [page, isAdmin],
  );

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  // Polling general
  useEffect(() => {
    const isProcessing = requirements.some(
      (req) => req.status === "PROCESSING",
    );
    if (!isProcessing) return;
    const intervalId = window.setInterval(() => void loadData(false), 5000);
    return () => window.clearInterval(intervalId);
  }, [requirements, loadData]);

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Semantic Requirements
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? "Global monitor of all client search ingestions."
              : "Monitor your search ingestions and matching results."}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4 pl-6">
                Client Context
              </TableHead>
              {isAdmin && (
                <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4">
                  Executed By
                </TableHead>
              )}
              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4">
                Status
              </TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-wider text-right py-4 pr-6">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 4 : 3}
                  className="h-40 text-center"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : requirements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 4 : 3}
                  className="h-40 text-center text-muted-foreground italic text-xs"
                >
                  No requirements found.
                </TableCell>
              </TableRow>
            ) : (
              requirements.map((req) => (
                <TableRow
                  key={req.id}
                  className={`group transition-all ${req.status === "PROCESSED" ? "cursor-pointer hover:bg-muted/50" : "opacity-70"}`}
                  onClick={() =>
                    req.status === "PROCESSED" &&
                    navigate(`/requirements/${req.id}`)
                  }
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Building className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">
                          {req.clientName}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-mono">
                          <FileText className="h-3 w-3" /> UID:{" "}
                          {req.id.split("-")[0]}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {isAdmin && (
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold uppercase">
                          {req.userName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {req.userEmail}
                        </span>
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-none font-bold text-[9px] uppercase px-2 py-0.5 gap-1.5 ${
                        req.status === "PROCESSED"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : req.status === "ERROR"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-600 animate-pulse"
                      }`}
                    >
                      {req.status === "PROCESSING" ? (
                        <Clock className="h-3 w-3" />
                      ) : req.status === "PROCESSED" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {req.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {new Date(req.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {req.status === "PROCESSED" && (
                        <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-medium text-muted-foreground italic">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-4"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-4"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
