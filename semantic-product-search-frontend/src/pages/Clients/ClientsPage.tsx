import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  UserCircle,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchClients } from "@/api/clients";
import { ClientResponse } from "@/types/clients";


export function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchClients({ page, limit: 10, name: search });
      setClients(response.data);
      setTotalPages(response.meta.totalPages);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => void loadClients(), 400);
    return () => clearTimeout(timer);
  }, [loadClients]);

  return (
    <div className="flex flex-col gap-6 animate-rise">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm">
            Manage business customers and their search requirements.
          </p>
        </div>
        <Button onClick={() => navigate("/clients/create")} className="gap-2">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* FILTER SECTION */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by client name..."
          className="pl-10 h-11 bg-card/50"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* TABLE SECTION */}
      <div className="rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold text-[10px] uppercase tracking-wider">
                Client Info
              </TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-wider">
                Contact Details
              </TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-wider text-center">
                Status
              </TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-muted-foreground"
                >
                  Loading clients...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-muted-foreground italic"
                >
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="group cursor-pointer transition-colors"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <UserCircle className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-sm">
                        {client.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {client.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {client.telephone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={client.active ? "default" : "secondary"}
                      className={
                        client.active
                          ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-none"
                          : ""
                      }
                    >
                      {client.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION SECTION */}
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
