
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/services/api";
import BarraBusquedaFiltros from "./BarraBusquedaFiltros";
import TablaPaginada from "./TablaPaginada";
import ModalConfirmacion from "./ModalConfirmacion";
import VistaDetalleUsuario from "./VistaDetalleUsuario";

const LIMIT = 20;

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
            return u.roles_detalle
              .map((r) => r.nombre)
              .join(", ");
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
    placeholder: "Nombre del conductor",
    etiquetaBusqueda: "Conductor",
    filtros: [
      {
        key: "estado",
        titulo: "Estado",
        opciones: [
          "Pendiente",
          "Programado",
          "En curso",
          "Completado",
          "Cancelado",
        ].map((valor) => ({
          valor,
          etiqueta: valor,
        })),
      },
      {
        key: "fecha",
        titulo: "Fecha",
        tipo: "fecha",
      },
    ],
    columnas: [
      { key: "id", titulo: "ID" },
      { key: "origen", titulo: "Origen" },
      { key: "destino", titulo: "Destino" },
      {
        key: "fecha_salida",
        titulo: "Salida",
        render: (v) =>
          v.fecha_salida
            ? new Date(v.fecha_salida).toLocaleString("es-MX")
            : "—",
      },
      { key: "estado", titulo: "Estado" },
    ],
  },
};

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

        setTotal(Number(respuesta.paginacion?.total ?? 0));
      } catch (e) {
        if (activo) {
          setDatos([]);
          setTotal(0);
          setError(
            e.message || "Error al consultar los datos."
          );
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
        onReintentar={() =>
          setReintento((n) => n + 1)
        }
        mensajeVacio={`No se encontraron ${tipo}.`}
      />

      <p className="text-xs text-slate-500">
        La selección para revisión es local; no modifica
        registros del servidor.
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
    </div>
  );
}
