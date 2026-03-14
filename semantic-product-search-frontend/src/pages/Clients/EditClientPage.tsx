import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchClientById, updateClient } from "@/api/clients";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientResponse, CreateClientInput } from "@/types/clients";

export function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClient = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchClientById(id);
      setClient(data);
    } catch {
      toast.error("Client not found");
      navigate("/clients");
    } finally {
      setIsLoadingData(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  const handleUpdate = async (data: CreateClientInput) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await updateClient(id, data);
      toast.success("Client updated successfully");
      navigate(`/clients/${id}`);
    } catch {
      toast.error("Failed to update client information");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-rise">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Edit className="h-8 w-8 text-primary" /> Edit Client
          </h1>
          <p className="text-muted-foreground text-sm">
            Update the contact information for {client?.name}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/clients/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Button>
      </div>

      {/* FORM SECTION */}
      <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="pt-6">
          <ClientForm
            initialData={
              client
                ? {
                    name: client.name,
                    email: client.email,
                    telephone: client.telephone,
                    address: client.address,
                  }
                : undefined
            }
            onSubmit={handleUpdate}
            isLoading={isSubmitting}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}