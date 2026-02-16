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
import { TIPOS_MEMBRESIA } from "@/lib/domain/members";
import { formatearFechaISO } from "@/lib/domain/members";
import { buildActualizarSocioPayload } from "@/lib/domain/members";
import { updateMember } from "@/lib/api/members.client";

interface EditarSocioModalProps {
  member: SocioResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

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
        name: member.name ?? "",
        phone: member.phone ?? "",
        email: member.email ?? "",
        birthDate: formatearFechaISO(member.birthDate),
        membershipType: member.membershipType ?? "",
        membershipDescription: member.membershipDescription ?? "",
        startDate: formatearFechaISO(member.startDate),
        endDate: formatearFechaISO(member.endDate),
        isActive: member.isActive,
      });
    }
  }, [member, reset]);

  const onSubmit = async (data: UpdateMemberInputRaw) => {
    if (!member) return;

    setLoading(true);
    setError("");

    const payload = buildActualizarSocioPayload(data);
    const result = await updateMember(member.id, payload);

    if (result.ok) {
      onSuccess();
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
                value={membershipType ?? ""}
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
                checked={isActive ?? false}
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
