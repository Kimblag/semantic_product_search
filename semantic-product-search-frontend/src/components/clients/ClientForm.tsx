import { useState } from "react";
import { Building, Mail, Phone, MapPin, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateClientInput } from "@/types/clients";

interface ClientFormProps {
  initialData?: CreateClientInput;
  onSubmit: (data: CreateClientInput) => Promise<void>;
  isLoading: boolean;
  submitLabel: string;
}

export function ClientForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel,
}: ClientFormProps) {
  const [formData, setFormData] = useState<CreateClientInput>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    telephone: initialData?.telephone || "",
    address: initialData?.address || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
          Company Name
        </Label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="pl-10 h-11 bg-background/50"
            placeholder="Acme Corporation"
            required
            minLength={3}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
            Corporate Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="pl-10 h-11 bg-background/50"
              placeholder="admin@acme.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
            Telephone
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className="pl-10 h-11 bg-background/50"
              placeholder="+1 234 567 8900"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">
          Physical Address
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="pl-10 h-11 bg-background/50"
            placeholder="123 Business Blvd, Tech District"
            required
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border/50">
        <Button
          type="submit"
          className="w-full h-11 font-bold uppercase tracking-widest gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
