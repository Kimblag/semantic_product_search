import { useCallback, useEffect, useState } from "react";
import {
  FileUp,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  User as UserIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  downloadRequirementTemplate,
  fetchRequirements,
  uploadRequirementFile,
} from "@/api/requirements";
import { RequirementListItem } from "@/types/requirement";
import { useAuth } from "@/auth/useAuth";

export function RequirementHistory({
  clientId,
  isActive,
}: {
  clientId: string;
  isActive: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.roles?.includes("Admin") ?? false;

  const [history, setHistory] = useState<RequirementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadHistory = useCallback(
    async (showLoader = false) => {
      if (showLoader) setIsLoading(true);
      try {
        const res = await fetchRequirements(
          { page: 1, limit: 10, clientId },
          isAdmin,
        );
        setHistory(res.data);
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [clientId, isAdmin],
  );

  useEffect(() => {
    void loadHistory(true);
  }, [loadHistory]);

  useEffect(() => {
    const isProcessing = history.some((req) => req.status === "PROCESSING");
    if (!isProcessing) return;

    const intervalId = window.setInterval(() => {
      void loadHistory(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [history, loadHistory]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadRequirementFile(clientId, file);
      toast.success("File uploaded. Matching process started.");
      void loadHistory(false);
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadRequirementTemplate();
    } catch {
      toast.error("Could not download the template. Please try again.");
    }
  };

  return (
    <div className="space-y-4 animate-rise">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/70">
          Requirement History
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-2"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-3.5 w-3.5" /> Template
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleUpload}
              disabled={isUploading || !isActive}
            />
            <Button
              asChild
              size="sm"
              className="h-8 text-xs gap-2"
              disabled={isUploading || !isActive}
            >
              <span>
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileUp className="h-3.5 w-3.5" />
                )}{" "}
                New Search
              </span>
            </Button>
          </label>
        </div>
      </div>

      <div className="rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent text-[10px] font-bold uppercase">
              <TableHead className="py-3">Executed By</TableHead>
              <TableHead className="text-center py-3">Status</TableHead>
              <TableHead className="text-right py-3">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs italic">Loading history...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground italic text-xs"
                >
                  No search requirements registered for this client.
                </TableCell>
              </TableRow>
            ) : (
              history.map((req) => (
                <TableRow
                  key={req.id}
                  className={`group transition-colors ${
                    req.status === "PROCESSED"
                      ? "cursor-pointer hover:bg-muted/30"
                      : "cursor-default"
                  }`}
                  onClick={() => {
                    if (req.status === "PROCESSED") {
                      navigate(`/requirements/${req.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate uppercase tracking-tight">
                          {req.userName}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate font-mono">
                          {req.userEmail}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`border-none font-bold text-[9px] uppercase gap-1.5 px-2 py-0.5 ${
                        req.status === "PROCESSED"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : req.status === "ERROR"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-600 animate-pulse"
                      }`}
                    >
                      {req.status === "PROCESSING" && (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                      {req.status === "PROCESSED" && (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      )}
                      {req.status === "ERROR" && (
                        <XCircle className="h-2.5 w-2.5" />
                      )}
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-foreground/80">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
