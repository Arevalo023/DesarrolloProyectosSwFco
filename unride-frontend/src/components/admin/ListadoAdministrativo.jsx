import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/services/api";
import BarraBusquedaFiltros from "./BarraBusquedaFiltros";
import TablaPaginada from "./TablaPaginada";
import ModalConfirmacion from "./ModalConfirmacion";
import VistaDetalleUsuario from "./VistaDetalleUsuario";
import VistaDetalleViaje from "./VistaDetalleViaje";

const LIMIT = 20;

const mostrarEstado = (estado) => {
  const estados = {
    pendiente: "Pendiente",
    programado: "Programado",
    en_curso: "En curso",
    activo: "Activo",
    completado: "Completado",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  };

  return estados[String(estado || "").toLowerCase()] || estado || "—";
};

const configuraciones = {
  usuarios: {
    ruta: "/users",
    key: "usuarios",
    campoBusqueda: "q",
    placeholder: "Nombre o correo",
    filtros: [
      {
        key: "rol",
        titulo: "Rol",
        opciones: ["Administrador", "Conductor", "Pasajero"].map(
          (valor) => ({
            valor,
            etiqueta: valor,
          })
        ),
      },
    ],
    columnas: [
      { key: "id", titulo: "ID" },
      {
        key: "nombre",
        titulo: "Nombre",
        render: (u) =>
          [u.nombre, u.apellido].filter(Boolean).join(" "),
      },
      { key: "correo", titulo: "Correo" },
      {
        key: "rol",
        titulo: "Rol",
        render: (u) => {
          if (Array.isArray(u.roles) && u.roles.length) {
            return u.roles.join(", ");
          }

          if (
            Array.isArray(u.roles_detalle) &&
            u.roles_detalle.length
          ) {
            return u.roles_detalle.map((r) => r.nombre).join(", ");
          }

          return (
            u.rol_nombre ??
            u.rol ??
            ({
              1: "Pasajero",
              2: "Conductor",
              3: "Administrador",
            }[u.rol_id] ?? "—")
          );
        },
      },
    ],
  },

  viajes: {
    ruta: "/api/trips/admin",
    key: "viajes",
    campoBusqueda: "conductor",
    placeholder: "Nombre, correo o ID del conductor",
    etiquetaBusqueda: "Conductor",
    filtros: [
      {
        key: "estado",
        titulo: "Estado",
        opciones: [
          { valor: "programado", etiqueta: "Programado" },
          { valor: "en_curso", etiqueta: "En curso" },
          { valor: "finalizado", etiqueta: "Finalizado" },
          { valor: "cancelado", etiqueta: "Cancelado" },
          { valor: "historial", etiqueta: "Historial" },
          { valor: "activos", etiqueta: "Activos" },
        ],
      },
      {
        key: "fecha",
        titulo: "Fecha de salida",
        tipo: "fecha",
      },
    ],
    columnas: [
      { key: "id", titulo: "ID" },
      { key: "origen", titulo: "Origen" },
      { key: "destino", titulo: "Destino" },
      {
        key: "conductor",
        titulo: "Conductor",
        render: (viaje) =>
          viaje.conductor?.nombre_completo ||
          viaje.conductor_nombre ||
          "—",
      },
      {
        key: "fecha_salida",
        titulo: "Salida",
        render: (viaje) =>
          viaje.fecha_salida
            ? new Date(viaje.fecha_salida).toLocaleString("es-MX")
            : "—",
      },
      {
        key: "estado",
        titulo: "Estado",
        render: (viaje) => mostrarEstado(viaje.estado),
      },
      {
        key: "total_reservaciones",
        titulo: "Reservaciones",
        render: (viaje) => viaje.total_reservaciones ?? 0,
      },
    ],
  },
};

const obtenerEstado = (viaje) =>
  String(viaje?.estado ?? viaje?.status ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const esViajeProgramado = (viaje) =>
  obtenerEstado(viaje) === "programado";

export default function ListadoAdministrativo({ tipo }) {
  const config = configuraciones[tipo];

  const [consulta, setConsulta] = useState({});
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [aviso, setAviso] = useState("");
  const [revision, setRevision] = useState([]);
  const [reintento, setReintento] = useState(0);

  const [usuarioDetalle, setUsuarioDetalle] = useState(null);
  const [viajeDetalle, setViajeDetalle] = useState(null);

  // Estado para cancelar viajes desde la vista administrativa.
  const [viajeCancelacion, setViajeCancelacion] = useState(null);
  const [cancelandoViaje, setCancelandoViaje] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState("");

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError("");

      try {
        const params = new URLSearchParams({
          ...consulta,
          page: String(pagina),
          limit: String(LIMIT),
        });

        const respuesta = await apiRequest(
          `${config.ruta}?${params.toString()}`
        );

        if (!activo) return;

        setDatos(
          Array.isArray(respuesta[config.key])
            ? respuesta[config.key]
            : []
        );

        setTotal(
          Number(respuesta.paginacion?.total ?? respuesta.total ?? 0)
        );
      } catch (e) {
        if (activo) {
          setDatos([]);
          setTotal(0);
          setError(e.message || "Error al consultar los datos.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, [config, consulta, pagina, reintento]);

  const cambiarConsulta = useCallback((parametros) => {
    setConsulta(parametros);
    setPagina(1);
  }, []);

  const abrirCancelacion = (viaje) => {
    setViajeCancelacion(viaje);
    setErrorCancelacion("");
  };

  const cerrarCancelacion = () => {
    if (cancelandoViaje) return;

    setViajeCancelacion(null);
    setErrorCancelacion("");
  };

  const cancelarViaje = async (motivo) => {
    if (!viajeCancelacion || cancelandoViaje) return;

    const idViaje = viajeCancelacion.id;

    if (!idViaje) {
      setErrorCancelacion(
        "No se pudo identificar el viaje seleccionado."
      );
      return;
    }

    if (!esViajeProgramado(viajeCancelacion)) {
      setErrorCancelacion(
        "Solo se pueden cancelar viajes programados."
      );
      return;
    }

    setCancelandoViaje(true);
    setErrorCancelacion("");

    try {
      const respuesta = await apiRequest(
        `/api/trips/${idViaje}/cancel`,
        {
          method: "PATCH",
          body: {
            motivo_cancelacion: motivo,
          },
        }
      );

      const viajeActualizado = respuesta?.trip ?? {};

      setDatos((datosActuales) =>
        datosActuales.map((viaje) =>
          String(viaje.id) === String(idViaje)
            ? {
                ...viaje,
                ...viajeActualizado,
                estado:
                  viajeActualizado.estado ??
                  viajeActualizado.status ??
                  "Cancelado",
                motivo_cancelacion:
                  viajeActualizado.motivo_cancelacion ?? motivo,
              }
            : viaje
        )
      );

      setAviso(`El viaje #${idViaje} fue cancelado correctamente.`);
      setViajeCancelacion(null);
    } catch (requestError) {
      console.error("Error al cancelar viaje:", requestError);

      setErrorCancelacion(
        requestError?.message ||
          "No se pudo cancelar el viaje. Inténtalo nuevamente."
      );
    } finally {
      setCancelandoViaje(false);
    }
  };

  const columnas = [
    ...config.columnas,
    {
      key: "accion",
      titulo: "Acción",
      render: (fila) => (
        <div className="flex flex-wrap gap-3">
          {tipo === "usuarios" && (
            <button
              type="button"
              className="text-emerald-700 underline"
              onClick={() => setUsuarioDetalle(fila)}
            >
              Ver detalle
            </button>
          )}

          {tipo === "viajes" && (
            <button
              type="button"
              className="text-emerald-700 underline"
              onClick={() => setViajeDetalle(fila)}
            >
              Ver detalle
            </button>
          )}

          {tipo === "viajes" && esViajeProgramado(fila) && (
            <button
              type="button"
              className="text-emerald-700 underline"
              onClick={() => abrirCancelacion(fila)}
            >
              Cancelar viaje
            </button>
          )}

          <button
            type="button"
            className="text-emerald-700 underline"
            onClick={() => setSeleccion(fila)}
          >
            Seleccionar para revisión
          </button>
        </div>
      ),
    },
  ];

  if (tipo === "usuarios" && usuarioDetalle) {
    return (
      <VistaDetalleUsuario
        usuario={usuarioDetalle}
        onVolver={() => setUsuarioDetalle(null)}
      />
    );
  }

  if (tipo === "viajes" && viajeDetalle) {
    return (
      <VistaDetalleViaje
        viaje={viajeDetalle}
        onVolver={() => setViajeDetalle(null)}
      />
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <BarraBusquedaFiltros
        key={tipo}
        filtros={config.filtros}
        placeholder={config.placeholder}
        etiquetaBusqueda={config.etiquetaBusqueda}
        campoBusqueda={config.campoBusqueda}
        cargando={cargando}
        onConsultar={cambiarConsulta}
      />

      <TablaPaginada
        columnas={columnas}
        datos={datos}
        pagina={pagina}
        porPagina={LIMIT}
        total={total}
        onPaginaChange={setPagina}
        cargando={cargando}
        error={error}
        onReintentar={() => setReintento((n) => n + 1)}
        mensajeVacio={`No se encontraron ${tipo}.`}
      />

      <p className="text-xs text-slate-500">
        La selección para revisión es local; no modifica registros del servidor.
      </p>

      {aviso && (
        <p role="status" className="text-sm text-emerald-800">
          {aviso} ({revision.length} seleccionados)
        </p>
      )}

      <ModalConfirmacion
        abierto={Boolean(seleccion)}
        titulo="Seleccionar para revisión"
        mensaje={`¿Agregar este registro de ${tipo} a la revisión local?`}
        requiereMotivo
        onCerrar={() => setSeleccion(null)}
        onConfirmar={(motivo) => {
          setRevision((r) => [
            ...r,
            {
              id: seleccion.id,
              motivo,
            },
          ]);

          setAviso(
            `Registro #${seleccion.id} seleccionado para revisión local.`
          );

          setSeleccion(null);
        }}
      />

      <ModalConfirmacion
        abierto={Boolean(viajeCancelacion)}
        titulo="Cancelar viaje"
        mensaje={
          viajeCancelacion
            ? `¿Confirmas la cancelación del viaje #${viajeCancelacion.id}? Esta acción actualizará su estado.`
            : ""
        }
        requiereMotivo
        onCerrar={cerrarCancelacion}
        onConfirmar={cancelarViaje}
        cargando={cancelandoViaje}
        error={errorCancelacion}
      />
    </div>
  );
}