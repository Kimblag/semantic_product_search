import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/api/clients";
import { ClientForm } from "@/components/clients/ClientForm";
import { CreateClientInput } from "@/types/clients";

export function CreateClientPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (data: CreateClientInput) => {
    setIsSubmitting(true);
    try {
      const newClient = await createClient(data);
      toast.success("Client registered successfully");
      navigate(`/clients/${newClient.id}`);
    } catch {
      toast.error(
        "Failed to create client. The email might already be in use.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-rise">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" /> New Client
          </h1>
          <p className="text-muted-foreground text-sm">
            Register a new business account in the platform.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/clients")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {/* FORM SECTION */}
      <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm">
        <CardContent className="pt-6">
          <ClientForm
            onSubmit={handleCreate}
            isLoading={isSubmitting}
            submitLabel="Register Client"
          />
        </CardContent>
      </Card>
    </div>
  );
}
