import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Eye,
  Plus,
  Search,
  X,
  Phone,
  Mail,
  Hash,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchProvidersList } from "@/api/providers";
import { getAxiosErrorMessage } from "@/api/errors";
import { ProviderListItem } from "@/types/providers";

const ROWS_PER_PAGE = 10;

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isActive =
        filterStatus === "all" ? undefined : filterStatus === "active";

      const response = await fetchProvidersList({
        page,
        limit: ROWS_PER_PAGE,
        name: searchQuery || undefined,
        isActive,
      });

      setProviders(response.data);
      setTotalItems(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (err) {
      setError(getAxiosErrorMessage(err) || "Failed to load providers.");
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus, searchQuery]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const startIndex = (page - 1) * ROWS_PER_PAGE + 1;
  const endIndex = Math.min(page * ROWS_PER_PAGE, totalItems);

  return (
    <section className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Providers</h1>
          <p className="text-sm text-muted-foreground">
            Manage product catalogs and supplier information.
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link to="/providers/create">
            <Plus className="h-4 w-4" />
            Add Provider
          </Link>
        </Button>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v as "all" | "active" | "inactive");
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex w-full max-w-md items-center gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-8"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-75">Provider Info</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Loading providers...
                  </TableCell>
                </TableRow>
              ) : providers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {error || "No providers found."}
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold truncate text-foreground">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span>{p.code}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {p.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {p.telephone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.active ? "default" : "secondary"}
                        className={
                          p.active
                            ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-none"
                            : ""
                        }
                      >
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/providers/details/${p.id}`}
                          title="View user details"
                          className="gap-2 h-8 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/20"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        <div className="flex items-center justify-between border-t px-6 py-4 bg-muted/5">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">
              {startIndex}-{endIndex}
            </span>{" "}
            of <span className="font-medium">{totalItems}</span> providers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
