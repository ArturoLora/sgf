"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { SociosStats } from "./socios-stats";
import { SociosFiltrosComponent } from "./socios-filtros";
import { SociosLista } from "./socios-lista";
import { CrearSocioModal } from "./crear-socio-modal";
import { EditarSocioModal } from "./editar-socio-modal";
import { DetalleSocioModal } from "./detalle-socio-modal";
import { RenovarMembresiaModal } from "./renovar-membresia-modal";
import type { SocioResponse } from "@/types/api/members";
import type { SociosFiltros } from "@/lib/domain/members";
import {
  FILTROS_INICIALES,
  filtrarSocios,
  paginar,
} from "@/lib/domain/members";
import { fetchMembers } from "@/lib/api/members.client";

interface SociosManagerProps {
  initialMembers: SocioResponse[];
}

const ITEMS_POR_PAGINA = 15;

export function SociosManager({ initialMembers }: SociosManagerProps) {
  const [members, setMembers] = useState<SocioResponse[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [memberEditar, setMemberEditar] = useState<SocioResponse | null>(null);
  const [memberDetalle, setMemberDetalle] = useState<SocioResponse | null>(
    null,
  );
  const [memberRenovar, setMemberRenovar] = useState<SocioResponse | null>(
    null,
  );

  // Filtros
  const [filtros, setFiltros] = useState<SociosFiltros>(FILTROS_INICIALES);

  // Recargar datos
  const recargarDatos = useCallback(async () => {
    setLoading(true);
    const result = await fetchMembers();
    if (result.ok) {
      setMembers(result.data);
    }
    setLoading(false);
  }, []);

  // Filtrar y ordenar
  const membersFiltrados = useMemo(
    () => filtrarSocios(members, filtros),
    [members, filtros],
  );

  // Paginar
  const { items: membersPaginados, totalPaginas } = useMemo(
    () => paginar(membersFiltrados, paginaActual, ITEMS_POR_PAGINA),
    [membersFiltrados, paginaActual],
  );

  const handleFiltrar = useCallback((nuevosFiltros: SociosFiltros) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  }, []);

  const handleSuccess = useCallback(() => {
    recargarDatos();
    setError("");
  }, [recargarDatos]);

  const handleVerDetalle = useCallback((member: SocioResponse) => {
    setMemberDetalle(member);
  }, []);

  const handleEditar = useCallback((member: SocioResponse) => {
    setMemberEditar(member);
  }, []);

  const handleRenovar = useCallback((member: SocioResponse) => {
    setMemberRenovar(member);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Socios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión de membresías y clientes
          </p>
        </div>
        <Button
          onClick={() => setModalCrear(true)}
          className="gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo Socio
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex justify-between items-start gap-2 dark:bg-red-950 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <SociosStats members={membersFiltrados} />

      <SociosFiltrosComponent onFiltrar={handleFiltrar} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Socios</span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              {membersFiltrados.length} resultados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SociosLista
            members={membersPaginados}
            loading={loading}
            currentPage={paginaActual}
            totalPages={totalPaginas}
            onPageChange={setPaginaActual}
            onVerDetalle={handleVerDetalle}
            onEditar={handleEditar}
            onRenovar={handleRenovar}
          />
        </CardContent>
      </Card>

      {/* Modales */}
      <CrearSocioModal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={handleSuccess}
      />

      <EditarSocioModal
        member={memberEditar}
        onClose={() => setMemberEditar(null)}
        onSuccess={handleSuccess}
      />

      <DetalleSocioModal
        member={memberDetalle}
        onClose={() => setMemberDetalle(null)}
      />

      <RenovarMembresiaModal
        member={memberRenovar}
        onClose={() => setMemberRenovar(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
