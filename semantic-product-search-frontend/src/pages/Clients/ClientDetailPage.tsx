import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  History,
  ShieldAlert,
  Loader2,
  User,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchClientById, updateClient } from "@/api/clients";
import { ClientResponse } from "@/types/clients";
import { RequirementHistory } from "@/components/clients/RequirementHistory";

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchClientById(id);
      setClient(data);
    } catch {
      toast.error("Error retrieving client details");
      navigate("/clients");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleStatus = async () => {
    if (!client || !id) return;
    try {
      const nextStatus = !client.active;
      await updateClient(id, { isActive: nextStatus });
      setClient({ ...client, active: nextStatus });
      toast.success(`Client ${nextStatus ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Status update failed");
    }
  };

  if (isLoading)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!client) return null;

  return (
    <div className="flex flex-col gap-6 animate-rise">
      {/* NAVIGATION SECTION */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            to="/clients"
            className="hover:text-foreground transition-colors"
          >
            Clients
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{client.name}</span>
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/clients")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to list
        </Button>
      </div>

      {/* HEADER SECTION */}
      {/* HEADER SECTION */}
      <div className="flex items-end justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <User className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex gap-2">
              <Badge variant={client.active ? "default" : "secondary"}>
                {client.active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground uppercase self-center">
                UID: {client.id}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/clients/edit/${client.id}`)}
          className="gap-2 h-9 cursor-pointer"
        >
          <Edit className="h-4 w-4" /> Edit Profile
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/40 backdrop-blur-sm border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-bold">
                Contact Data
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Mail className="h-4 w-4 text-primary" /> {client.email}
              </div>
              <div className="flex items-center gap-3 text-sm font-medium">
                <Phone className="h-4 w-4 text-primary" /> {client.telephone}
              </div>
              <div className="flex items-center gap-3 text-sm font-medium sm:col-span-2 pt-2 border-t">
                <MapPin className="h-4 w-4 text-primary" /> {client.address}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="history">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="history" className="gap-2 text-xs py-2">
                <History className="h-4 w-4" /> History
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 text-xs py-2">
                <ShieldAlert className="h-4 w-4" /> Controls
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <RequirementHistory
                clientId={client.id}
                isActive={client.active}
              />
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive text-sm font-bold uppercase">
                    Critical Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Disabling the client will prevent executives from uploading
                    new search requirements files.
                  </p>
                  <Button
                    variant={client.active ? "destructive" : "default"}
                    size="sm"
                    onClick={toggleStatus}
                  >
                    {client.active ? "Deactivate" : "Activate"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xs uppercase text-primary font-bold">
                Registration Meta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Joined At</span>
                <span className="font-mono font-bold">
                  {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Matching Engine</span>
                <span className="font-mono font-bold">Enabled</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
