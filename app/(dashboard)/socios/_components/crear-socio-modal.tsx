"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateMemberInputSchema } from "@/types/api/members";
import type { CreateMemberInputRaw } from "@/types/api/members";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { TIPOS_MEMBRESIA } from "@/lib/domain/members";
import { buildCrearSocioPayload } from "@/lib/domain/members";
import { createMember } from "@/lib/api/members.client";

interface CrearSocioModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearSocioModal({
  open,
  onClose,
  onSuccess,
}: CrearSocioModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateMemberInputRaw>({
    resolver: zodResolver(CreateMemberInputSchema),
    defaultValues: {
      memberNumber: "",
      name: "",
      phone: "",
      email: "",
      birthDate: "",
      membershipType: "",
      membershipDescription: "",
    },
  });

  const membershipType = watch("membershipType");

  const onSubmit = async (data: CreateMemberInputRaw) => {
    if (!data.phone?.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }

    setLoading(true);
    setError("");

    const payload = buildCrearSocioPayload(data);
    const result = await createMember(payload);

    if (result.ok) {
      onSuccess();
      reset();
      onClose();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Socio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="memberNumber">
                  Número de Socio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="memberNumber"
                  {...register("memberNumber")}
                  placeholder="001"
                />
                {errors.memberNumber && (
                  <p className="text-sm text-red-500">
                    {errors.memberNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Juan Pérez"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="3111234567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="socio@ejemplo.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
              <Input id="birthDate" type="date" {...register("birthDate")} />
              {errors.birthDate && (
                <p className="text-sm text-red-500">
                  {errors.birthDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="membershipType">Tipo de Membresía</Label>
              <Select
                value={membershipType ?? ""}
                onValueChange={(value) => setValue("membershipType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MEMBRESIA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.membershipType && (
                <p className="text-sm text-red-500">
                  {errors.membershipType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="membershipDescription">
                Descripción de Membresía
              </Label>
              <Input
                id="membershipDescription"
                {...register("membershipDescription")}
                placeholder="Información adicional"
              />
              {errors.membershipDescription && (
                <p className="text-sm text-red-500">
                  {errors.membershipDescription.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : "Crear Socio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
