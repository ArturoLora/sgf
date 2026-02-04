"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateMemberInputSchema } from "@/types/api/members";
import type { UpdateMemberInputRaw } from "@/types/api/members";
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
import { useState, useEffect } from "react";
import type { SocioResponse } from "@/types/api/members";

interface EditarSocioModalProps {
  member: SocioResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_MEMBRESIA = [
  { value: "VISIT", label: "Visita" },
  { value: "WEEK", label: "Semana" },
  { value: "MONTH_STUDENT", label: "Mes Estudiante" },
  { value: "MONTH_GENERAL", label: "Mes General" },
  { value: "QUARTER_STUDENT", label: "Trimestre Estudiante" },
  { value: "QUARTER_GENERAL", label: "Trimestre General" },
  { value: "ANNUAL_STUDENT", label: "Anual Estudiante" },
  { value: "ANNUAL_GENERAL", label: "Anual General" },
  { value: "PROMOTION", label: "Promoción" },
  { value: "REBIRTH", label: "Renacer" },
  { value: "NUTRITION_CONSULTATION", label: "Consulta Nutrición" },
];

export function EditarSocioModal({
  member,
  onClose,
  onSuccess,
}: EditarSocioModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<UpdateMemberInputRaw>({
    resolver: zodResolver(UpdateMemberInputSchema),
  });

  const membershipType = watch("membershipType");
  const isActive = watch("isActive");

  useEffect(() => {
    if (member) {
      reset({
        name: member.name || "",
        phone: member.phone || "",
        email: member.email || "",
        birthDate: member.birthDate
          ? typeof member.birthDate === "string"
            ? member.birthDate
            : member.birthDate.toISOString().split("T")[0]
          : "",
        membershipType: member.membershipType || "",
        membershipDescription: member.membershipDescription || "",
        startDate: member.startDate
          ? typeof member.startDate === "string"
            ? member.startDate
            : member.startDate.toISOString().split("T")[0]
          : "",
        endDate: member.endDate
          ? typeof member.endDate === "string"
            ? member.endDate
            : member.endDate.toISOString().split("T")[0]
          : "",
        isActive: member.isActive,
      });
    }
  }, [member, reset]);

  const onSubmit = async (data: UpdateMemberInputRaw) => {
    if (!member) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        name: data.name || null,
        phone: data.phone || null,
        email: data.email || null,
        birthDate: data.birthDate || null,
        membershipType: data.membershipType || null,
        membershipDescription: data.membershipDescription || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        isActive: data.isActive,
      };

      const res = await fetch(`/api/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar socio");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  if (!member) return null;

  return (
    <Dialog open={!!member} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Socio</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            #{member.memberNumber}
          </p>
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

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
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
                value={membershipType || ""}
                onValueChange={(value) => setValue("membershipType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin membresía" />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && (
                  <p className="text-sm text-red-500">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de Fin</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && (
                  <p className="text-sm text-red-500">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setValue("isActive", e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Socio Activo
              </Label>
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
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
