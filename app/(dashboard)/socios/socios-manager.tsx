"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import SociosStats from "./socios-stats";
import SociosFiltros from "./socios-filtros";
import SociosLista from "./socios-lista";
import CrearSocioModal from "./modals/crear-socio-modal";
import EditarSocioModal from "./modals/editar-socio-modal";
import DetalleSocioModal from "./modals/detalle-socio-modal";
import RenovarMembresiaModal from "./modals/renovar-membresia-modal";

interface Member {
  id: number;
  memberNumber: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  membershipType: string | null;
  membershipDescription: string | null;
  startDate: string | null;
  endDate: string | null;
  totalVisits: number;
  lastVisit: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SociosManagerProps {
  initialMembers: Member[];
}

const ITEMS_POR_PAGINA = 15;

export default function SociosManager({ initialMembers }: SociosManagerProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [memberEditar, setMemberEditar] = useState<Member | null>(null);
  const [memberDetalle, setMemberDetalle] = useState<Member | null>(null);
  const [memberRenovar, setMemberRenovar] = useState<Member | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState<SociosFiltros>({
    busqueda: "",
    estado: "activos",
    vigencia: "todos",
    tipoMembresia: "todos",
    ordenarPor: "numero",
    orden: "asc",
  });

  // Recargar datos después de mutaciones
  const recargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error("Error al recargar socios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Aplicar filtros y ordenamiento
  const membersFiltrados = useMemo(() => {
    let resultado = [...members];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(
        (m) =>
          m.memberNumber.toLowerCase().includes(busqueda) ||
          m.name?.toLowerCase().includes(busqueda) ||
          m.phone?.toLowerCase().includes(busqueda) ||
          m.email?.toLowerCase().includes(busqueda),
      );
    }

    // Estado
    if (filtros.estado !== "todos") {
      resultado = resultado.filter((m) =>
        filtros.estado === "activos" ? m.isActive : !m.isActive,
      );
    }

    // Vigencia
    if (filtros.vigencia !== "todos") {
      resultado = resultado.filter((m) => {
        if (filtros.vigencia === "sin_membresia") {
          return !m.membershipType || !m.endDate;
        }
        if (!m.endDate) return false;
        const end = new Date(m.endDate);
        if (filtros.vigencia === "vigentes") {
          return end >= today;
        }
        return end < today;
      });
    }

    // Tipo de membresía
    if (filtros.tipoMembresia !== "todos") {
      resultado = resultado.filter(
        (m) => m.membershipType === filtros.tipoMembresia,
      );
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA: any, valorB: any;

      switch (filtros.ordenarPor) {
        case "nombre":
          valorA = a.name || "";
          valorB = b.name || "";
          break;
        case "fecha_registro":
          valorA = new Date(a.createdAt).getTime();
          valorB = new Date(b.createdAt).getTime();
          break;
        case "visitas":
          valorA = a.totalVisits;
          valorB = b.totalVisits;
          break;
        default:
          valorA = a.memberNumber;
          valorB = b.memberNumber;
      }

      if (valorA < valorB) return filtros.orden === "asc" ? -1 : 1;
      if (valorA > valorB) return filtros.orden === "asc" ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [members, filtros]);

  // Paginación
  const totalPaginas = Math.ceil(membersFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const membersPaginados = membersFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  const handleFiltrar = (nuevosFiltros: SociosFiltros) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  };

  const handleSuccess = () => {
    recargarDatos();
    setError("");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Socios</h1>
          <p className="text-sm sm:text-base text-gray-500">
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
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex justify-between items-start gap-2">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <SociosStats members={membersFiltrados} />

      <SociosFiltros onFiltrar={handleFiltrar} loading={loading} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Socios</span>
            <span className="text-xs sm:text-sm font-normal text-gray-500">
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
            onVerDetalle={setMemberDetalle}
            onEditar={setMemberEditar}
            onRenovar={setMemberRenovar}
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
