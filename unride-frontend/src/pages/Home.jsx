import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AlertBanner from "@/components/ui/alert-banner";
import { useState } from "react";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

import {
  Search,
  Car,
  ClipboardList,
  LogOut,
  MapPin,
  CalendarDays,
  UserRound,
  Clock3,
  Users,
  X,
  ChevronDown,
} from "lucide-react";

import heroImage from "@/assets/hero.png";

import { apiRequest } from "@/services/api";
import { mismoRol, rolesDe } from "@/services/session";

function Home({
  onLogout,
  onProfile,
  onVehiculos,
  onPublish,
  onMisViajes,
  onMisReservaciones,
  user,
  rolActivo,
  onCambiarRol,
}) {
  const [menuPerfil, setMenuPerfil] = useState(false);
  const [confirmarCierreSesion, setConfirmarCierreSesion] = useState(false);

  // ============================================================
  // FILTROS
  // ============================================================

  const [filters, setFilters] = useState({
    origen: "",
    destino: "",
    fechaInicio: "",
    fechaFin: "",
    horaDesde: "",
    horaHasta: "",
    cupoMinimo: "",
  });

  // ============================================================
  // VIAJES
  // ============================================================

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Cantidad de resultados mostrados inicialmente.
  const [visibleCount, setVisibleCount] = useState(6);

  // Permite saber si el usuario ya realizó una búsqueda.
  const [hasSearched, setHasSearched] = useState(false);

  // ============================================================
  // MENSAJES
  // ============================================================

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // ROLES
  // ============================================================

  const userRoles = rolesDe(user);

  const tieneRol = (rol) =>
    userRoles.some((r) => mismoRol(r, rol));

  // Si aún no hay rol activo guardado, se usa el principal.
  const rolEnUso = rolActivo || user?.rol || userRoles[0] || "";

  const modoConductor = mismoRol(rolEnUso, "Conductor");

  const modoPasajero = mismoRol(rolEnUso, "Pasajero");

  const canPublish = modoConductor;

  const cambiarModo = (rol) => {
    setError("");
    setMessage("");
    onCambiarRol?.(rol);
  };

  // ============================================================
  // BAJAR A LA SECCIÓN DE BÚSQUEDA
  // ============================================================

  const handleBuscar = () => {
    document.getElementById("buscar")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // ============================================================
  // ACTUALIZAR FILTROS
  // ============================================================

  const actualizarFiltro = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ============================================================
  // CONVERTIR HORA HH:MM A MINUTOS
  // ============================================================

  const horaEnMinutos = (hora) => {
    if (!hora) return null;

    const [horas, minutos] = hora.split(":").map(Number);

    if (
      Number.isNaN(horas) ||
      Number.isNaN(minutos)
    ) {
      return null;
    }

    return horas * 60 + minutos;
  };

  // ============================================================
  // BUSCAR VIAJES
  // ============================================================

  const buscarViajes = async (
    event,
    filtrosActuales = filters
  ) => {
    event?.preventDefault();

    const desde = horaEnMinutos(
      filtrosActuales.horaDesde
    );

    const hasta = horaEnMinutos(
      filtrosActuales.horaHasta
    );

    if (
      filtrosActuales.fechaInicio &&
      filtrosActuales.fechaFin &&
      filtrosActuales.fechaInicio > filtrosActuales.fechaFin
    ) {
      setError(
        "La fecha inicial no puede ser posterior a la fecha final."
      );
      setMessage("");
      return;
    }

    if (
      desde !== null &&
      hasta !== null &&
      desde > hasta
    ) {
      setError(
        "La hora inicial no puede ser posterior a la hora final."
      );
      setMessage("");
      return;
    }

    if (
      filtrosActuales.cupoMinimo &&
      (!Number.isInteger(Number(filtrosActuales.cupoMinimo)) || Number(filtrosActuales.cupoMinimo) < 1)
    ) {
      setError("El cupo mínimo debe ser un número entero mayor que cero.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setVisibleCount(6);

    try {
      const queryParams = new URLSearchParams();

      if (filtrosActuales.origen) {
        queryParams.set(
          "origen",
          filtrosActuales.origen
        );
      }

      if (filtrosActuales.destino) {
        queryParams.set(
          "destino",
          filtrosActuales.destino
        );
      }

      if (filtrosActuales.fechaInicio) {
        queryParams.set(
          "fecha_inicio",
          filtrosActuales.fechaInicio
        );
      }

      if (filtrosActuales.fechaFin) {
        queryParams.set(
          "fecha_fin",
          filtrosActuales.fechaFin
        );
      }

      if (filtrosActuales.horaDesde) {
        queryParams.set(
          "hora_desde",
          filtrosActuales.horaDesde
        );
      }

      if (filtrosActuales.horaHasta) {
        queryParams.set(
          "hora_hasta",
          filtrosActuales.horaHasta
        );
      }

      if (filtrosActuales.cupoMinimo) {
        queryParams.set(
          "cupo_minimo",
          filtrosActuales.cupoMinimo
        );
      }

      const query = queryParams.toString();

      const data = await apiRequest(
        query
          ? `/api/trips?${query}`
          : "/api/trips"
      );

      setTrips(data.trips || []);
      setHasSearched(true);
    } catch (requestError) {
      setError(
        requestError.message ||
          "No se pudieron cargar los viajes."
      );

      setTrips([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LIMPIAR FILTROS
  // ============================================================

  const limpiarFiltros = async () => {
    const filtrosVacios = {
      origen: "",
      destino: "",
      fechaInicio: "",
      fechaFin: "",
      horaDesde: "",
      horaHasta: "",
      cupoMinimo: "",
    };

    setFilters(filtrosVacios);
    setVisibleCount(6);
    setError("");
    setMessage("");

    /*
     * Volvemos a consultar todos los viajes disponibles
     * después de limpiar.
     */
    await buscarViajes(
      undefined,
      filtrosVacios
    );
  };

  const tripsFiltrados = trips;

  // ============================================================
  // PAGINACIÓN / CARGAR MÁS
  // ============================================================

  const tripsVisibles = tripsFiltrados.slice(
    0,
    visibleCount
  );

  const hayMasViajes =
    visibleCount < tripsFiltrados.length;

  const cargarMas = () => {
    setVisibleCount((current) => current + 6);
  };

  // ============================================================
  // RESERVAR VIAJE
  // ============================================================

  const reservarViaje = async (tripId) => {
    setBookingId(tripId);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(
        `/api/trips/${tripId}/book`,
        {
          method: "POST",
        }
      );

      /*
       * IMPORTANTE:
       *
       * La reserva se crea como "pendiente".
       * El backend NO descuenta el cupo en este momento.
       *
       * El cupo se descuenta cuando el conductor
       * acepta la reservación.
       *
       * Por eso NO modificamos cupo_disponible aquí.
       */

      setMessage(
        data.message ||
          "Solicitud de viaje enviada correctamente. Queda pendiente de aprobación."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "No se pudo reservar el viaje."
      );
    } finally {
      setBookingId(null);
    }
  };

  // ============================================================
  // FORMATEAR FECHA
  // ============================================================

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "Fecha no disponible";
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return fecha;
    }

    return new Intl.DateTimeFormat(
      "es-MX",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  };

  // ============================================================
  // FORMATEAR HORA
  // ============================================================

  const formatearHora = (fecha) => {
    if (!fecha) {
      return "Hora no disponible";
    }

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "es-MX",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).format(date);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-slate-900">

      {/* ========================================================
          NAVBAR
      ======================================================== */}

      <nav className="sticky top-0 z-40 order-0 w-full border-b bg-white">
        <div
          className="
            mx-auto
            flex
            max-w-7xl
            items-center
            justify-between
            gap-4
            px-6
            py-4
          "
        >

          {/* LOGO */}

          <Logo />

          {/* NAVEGACIÓN CENTRAL */}

          <div className="hidden items-center gap-8 md:flex">

            <a
              href="#inicio"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-emerald-600
              "
            >
              Inicio
            </a>

            <a
              href="#buscar"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-emerald-600
              "
            >
              Buscar viaje
            </a>

            <a
              href="#uniride"
              className="
                text-sm
                font-medium
                text-slate-600
                transition
                hover:text-emerald-600
              "
            >
              UniRide
            </a>

          </div>

          {/* PERFIL Y CERRAR SESIÓN */}

          <div className="flex items-center gap-2">

            {/* MODO */}

            {userRoles.length > 1 ? (
              <div
                role="group"
                aria-label="Modo de uso"
                className="
                  flex
                  rounded-full
                  border
                  border-slate-200
                  bg-slate-100
                  p-1
                "
              >
                {userRoles.map((rol) => {
                  const activo = mismoRol(
                    rol,
                    rolEnUso
                  );

                  return (
                    <button
                      key={rol}
                      type="button"
                      aria-pressed={activo}
                      onClick={() =>
                        cambiarModo(rol)
                      }
                      className={`
                        rounded-full
                        px-3
                        py-1
                        text-xs
                        font-semibold
                        transition
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-emerald-500
                        ${
                          activo
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-600 hover:text-emerald-700"
                        }
                      `}
                    >
                      {rol}
                    </button>
                  );
                })}
              </div>
            ) : rolEnUso ? (
              <span
                className="
                  rounded-full
                  bg-emerald-50
                  px-3
                  py-1
                  text-xs
                  font-semibold
                  text-emerald-700
                "
              >
                {rolEnUso}
              </span>
            ) : null}

            {/* PERFIL */}

            <div className="relative">

              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setMenuPerfil(!menuPerfil)
                }
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-100
                  p-0
                  text-emerald-700
                  hover:bg-emerald-200
                  hover:text-emerald-800
                "
                title="Mi cuenta"
              >
                <UserRound size={20} />
              </Button>

              {/* MENÚ DEL PERFIL */}

              <div
                className={`
                  absolute
                  right-0
                  top-12
                  z-50
                  w-56
                  origin-top-right
                  rounded-xl
                  border
                  bg-white
                  p-2
                  shadow-lg
                  transition-all
                  duration-200
                  ease-out
                  ${
                    menuPerfil
                      ? "pointer-events-auto scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0"
                  }
                `}
                aria-hidden={!menuPerfil}
              >

                {/* VER MI PERFIL */}

                <button
                  type="button"
                  onClick={() => {
                    setMenuPerfil(false);
                    onProfile?.();
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-lg
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-slate-700
                    hover:bg-emerald-50
                    hover:text-emerald-700
                  "
                >
                  <UserRound size={18} />

                  <span>
                    Ver mi perfil
                  </span>
                </button>

                {/* VER MIS VEHÍCULOS */}

                <button
                  type="button"
                  onClick={() => {
                    setMenuPerfil(false);
                    onVehiculos?.();
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-lg
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-slate-700
                    hover:bg-emerald-50
                    hover:text-emerald-700
                  "
                >
                  <Car size={18} />

                  <span>
                    Ver mis vehículos
                  </span>
                </button>

                {/* MIS VIAJES */}

                <button
                  type="button"
                  onClick={() => {
                    setMenuPerfil(false);
                    onMisViajes?.();
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-lg
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-slate-700
                    hover:bg-emerald-50
                    hover:text-emerald-700
                  "
                >
                  <ClipboardList size={18} />

                  <span>
                    Mis viajes
                  </span>
                </button>

                {/* MIS RESERVACIONES */}

                {modoPasajero &&
                  onMisReservaciones && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuPerfil(false);
                        onMisReservaciones();
                      }}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-lg
                        px-4
                        py-3
                        text-left
                        text-sm
                        text-slate-700
                        hover:bg-emerald-50
                        hover:text-emerald-700
                      "
                    >
                      <ClipboardList size={18} />

                      <span>
                        Mis reservaciones
                      </span>
                    </button>
                  )}

                {/* SEPARADOR */}

                <div className="my-1 border-t" />

                {/* CERRAR SESIÓN */}

                <button
                  type="button"
                  onClick={() => {
                    setMenuPerfil(false);
                    setConfirmarCierreSesion(true);
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-lg
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-red-600
                    hover:bg-red-50
                  "
                >
                  <LogOut size={18} />

                  <span>
                    Cerrar sesión
                  </span>
                </button>

              </div>

            </div>

            {/* BOTÓN CERRAR SESIÓN */}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setConfirmarCierreSesion(true)
              }
              className="flex items-center gap-2"
            >
              <LogOut size={16} />

              <span className="hidden lg:inline">
                Cerrar sesión
              </span>
            </Button>

          </div>

        </div>
      </nav>

      {/* ========================================================
          BIENVENIDA
      ======================================================== */}

      <section
        id="inicio"
        className="order-1 border-b bg-white"
      >
        <div
          className="
            mx-auto
            grid
            max-w-7xl
            items-center
            gap-12
            px-6
            py-16
            md:grid-cols-2
            md:py-24
          "
        >

          {/* TEXTO */}

          <div>

            <p
              className="
                mb-3
                text-sm
                font-semibold
                tracking-widest
                text-emerald-600
              "
            >
              MOVILIDAD UNIVERSITARIA
            </p>

            <h2
              className="
                text-4xl
                font-bold
                leading-tight
                tracking-tight
                md:text-6xl
              "
              style={{
                color: "#0f172a",
              }}
            >
              Viaja fácil,
              <br />

              <span className="text-emerald-600">
                viaja con UniRide.
              </span>
            </h2>

            <p
              className="
                mt-6
                max-w-xl
                text-base
                leading-7
                text-slate-500
                md:text-lg
              "
            >
              Encuentra viajes compartidos con otros
              estudiantes de manera sencilla, económica y
              segura.
            </p>

            <Button
              onClick={handleBuscar}
              className="
                mt-8
                flex
                items-center
                gap-2
                bg-emerald-600
                text-white
                hover:bg-emerald-700
              "
            >
              <Search size={18} />

              Buscar un viaje
            </Button>

          </div>

          {/* IMAGEN */}

          <div className="flex justify-center">

            <img
              src={heroImage}
              alt="UniRide"
              className="
                w-full
                max-w-lg
                object-contain
              "
            />

          </div>

        </div>
      </section>

      {/* ========================================================
          BUSCAR VIAJE
      ======================================================== */}

      <section
        id="buscar"
        className="order-3 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">

          {/* TÍTULO */}

          <div className="mb-10 text-center">

            <p
              className="
                mb-2
                text-sm
                font-semibold
                tracking-widest
                text-emerald-600
              "
            >
              ENCUENTRA TU RUTA
            </p>

            <h2
              className="text-3xl font-bold"
              style={{
                color: "#0f172a",
              }}
            >
              ¿A dónde quieres ir?
            </h2>

            <p className="mt-3 text-slate-500">
              Busca un viaje que se adapte a tu ruta y horario.
            </p>

          </div>

          {/* FORMULARIO */}

          <Card className="shadow-lg">

            <CardContent className="p-6">

              <form
                onSubmit={buscarViajes}
                className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
              >

                {/* ORIGEN */}

                <div className="space-y-2">

                  <label
                    htmlFor="origen"
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-slate-600
                    "
                  >
                    <MapPin
                      size={16}
                      className="text-emerald-600"
                    />

                    Origen
                  </label>

                  <Input
                    id="origen"
                    name="origen"
                    type="text"
                    placeholder="¿Desde dónde sales?"
                    value={filters.origen}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* DESTINO */}

                <div className="space-y-2">

                  <label
                    htmlFor="destino"
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-slate-600
                    "
                  >
                    <MapPin
                      size={16}
                      className="text-emerald-600"
                    />

                    Destino
                  </label>

                  <Input
                    id="destino"
                    name="destino"
                    type="text"
                    placeholder="¿A dónde quieres llegar?"
                    value={filters.destino}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* FECHA DESDE */}

                <div className="space-y-2">

                  <label
                    htmlFor="fechaInicio"
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-slate-600
                    "
                  >
                    <CalendarDays
                      size={16}
                      className="text-emerald-600"
                    />

                    Fecha desde
                  </label>

                  <Input
                    id="fechaInicio"
                    name="fechaInicio"
                    type="date"
                    max={filters.fechaFin || undefined}
                    value={filters.fechaInicio}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* FECHA HASTA */}

                <div className="space-y-2">

                  <label
                    htmlFor="fechaFin"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600"
                  >
                    <CalendarDays size={16} className="text-emerald-600" />
                    Fecha hasta
                  </label>

                  <Input
                    id="fechaFin"
                    name="fechaFin"
                    type="date"
                    min={filters.fechaInicio || undefined}
                    value={filters.fechaFin}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* HORA DESDE */}

                <div className="space-y-2">

                  <label
                    htmlFor="horaDesde"
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-slate-600
                    "
                  >
                    <Clock3
                      size={16}
                      className="text-emerald-600"
                    />

                    Hora desde
                  </label>

                  <Input
                    id="horaDesde"
                    name="horaDesde"
                    type="time"
                    value={filters.horaDesde}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* HORA HASTA */}

                <div className="space-y-2">

                  <label
                    htmlFor="horaHasta"
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-slate-600
                    "
                  >
                    <Clock3
                      size={16}
                      className="text-emerald-600"
                    />

                    Hora hasta
                  </label>

                  <Input
                    id="horaHasta"
                    name="horaHasta"
                    type="time"
                    value={filters.horaHasta}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* CUPO MÍNIMO */}

                <div className="space-y-2">

                  <label
                    htmlFor="cupoMinimo"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600"
                  >
                    <Users size={16} className="text-emerald-600" />
                    Cupo mínimo
                  </label>

                  <Input
                    id="cupoMinimo"
                    name="cupoMinimo"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="Cualquier cupo"
                    value={filters.cupoMinimo}
                    onChange={actualizarFiltro}
                  />

                </div>

                {/* BOTONES */}

                <div className="flex items-end gap-3 lg:col-span-3">

                  <Button
                    type="submit"
                    disabled={loading}
                    className="
                      flex-1
                      bg-emerald-600
                      text-white
                      hover:bg-emerald-700
                    "
                  >
                    <Search size={18} />

                    {loading
                      ? "Buscando..."
                      : "Buscar viaje"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={limpiarFiltros}
                    disabled={loading}
                    className="
                      flex
                      items-center
                      gap-2
                      border-slate-300
                      text-slate-600
                      hover:bg-slate-50
                    "
                  >
                    <X size={17} />

                    Limpiar
                  </Button>

                </div>

              </form>

              {/* AYUDA DEL FILTRO DE HORARIO */}

              {(filters.horaDesde ||
                filters.horaHasta) && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <Clock3 size={16} />

                  <span>
                    Mostrando viajes dentro del horario seleccionado.
                  </span>
                </div>
              )}

              {error && (
                <div className="mt-4">
                  <AlertBanner
                    type="error"
                    message={error}
                  />
                </div>
              )}

              {message && (
                <div className="mt-4">
                  <AlertBanner
                    type="success"
                    message={message}
                  />
                </div>
              )}

            </CardContent>

          </Card>

          {/* ====================================================
              RESULTADOS
          ==================================================== */}

          {loading ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

              <p className="text-sm text-slate-500">
                Buscando viajes disponibles...
              </p>

            </div>
          ) : hasSearched &&
            tripsFiltrados.length === 0 ? (

            /* ==================================================
               ESTADO SIN RESULTADOS
            ================================================== */

            <Card className="mt-8">

              <CardContent className="p-10 text-center">

                <div
                  className="
                    mx-auto
                    mb-5
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-slate-100
                    text-slate-500
                  "
                >
                  <Search size={25} />
                </div>

                <h3 className="text-lg font-semibold text-slate-900">
                  No encontramos viajes
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  No hay viajes que coincidan con los filtros seleccionados.
                  Intenta cambiar la ruta, las fechas, el horario o el cupo mínimo.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  onClick={limpiarFiltros}
                  className="mt-5"
                >
                  <X size={17} />

                  Limpiar filtros
                </Button>

              </CardContent>

            </Card>

          ) : tripsFiltrados.length > 0 ? (

            <div className="mt-8">

              {/* CONTADOR */}

              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-slate-500">
                  {tripsFiltrados.length === 1
                    ? "1 viaje encontrado"
                    : `${tripsFiltrados.length} viajes encontrados`}
                </p>

                {(filters.horaDesde ||
                  filters.horaHasta) && (
                  <p className="text-sm text-slate-500">
                    Horario:
                    {" "}
                    {filters.horaDesde || "00:00"}
                    {" - "}
                    {filters.horaHasta || "23:59"}
                  </p>
                )}

              </div>

              {/* TARJETAS */}

              <div className="grid gap-4 md:grid-cols-2">

                {tripsVisibles.map((trip) => (

                  <Card
                    key={trip.id}
                    className="transition-shadow hover:shadow-md"
                  >

                    <CardContent
                      className="
                        flex
                        flex-col
                        gap-4
                        p-5
                      "
                    >

                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-4
                        "
                      >

                        <div>

                          <h3 className="font-semibold text-slate-900">
                            {trip.origen}
                            {" → "}
                            {trip.destino}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">

                            <span className="flex items-center gap-1.5">
                              <CalendarDays
                                size={15}
                                className="text-emerald-600"
                              />

                              {formatearFecha(
                                trip.fecha_salida
                              )}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Clock3
                                size={15}
                                className="text-emerald-600"
                              />

                              {formatearHora(
                                trip.fecha_salida
                              )}
                            </span>

                          </div>

                        </div>

                        <span className="whitespace-nowrap font-semibold text-emerald-700">
                          $
                          {Number(
                            trip.costo_por_pasajero ?? 0
                          ).toFixed(2)}
                        </span>

                      </div>

                      {/* CONDUCTOR */}

                      <p className="text-sm text-slate-600">
                        Conduce{" "}
                        {trip.conductor ||
                          trip.conductor_nombre ||
                          "Conductor"}{" "}
                        ·{" "}
                        {trip.marca ||
                          trip.vehiculo_marca ||
                          "Vehículo"}{" "}
                        {trip.modelo ||
                          trip.vehiculo_modelo ||
                          ""}
                      </p>

                      {/* ASIENTOS + ACCIÓN */}

                      <div
                        className="
                          flex
                          flex-col
                          gap-3
                          border-t
                          pt-4
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >

                        <span className="text-sm text-slate-500">
                          {Number(
                            trip.cupo_disponible ??
                              trip.asientos_disponibles ??
                              0
                          )}{" "}
                          {Number(
                            trip.cupo_disponible ??
                              trip.asientos_disponibles ??
                              0
                          ) === 1
                            ? "asiento disponible"
                            : "asientos disponibles"}
                        </span>

                        {modoPasajero ? (

                          <Button
                            type="button"
                            onClick={() =>
                              reservarViaje(
                                trip.id
                              )
                            }
                            disabled={
                              bookingId ===
                              trip.id ||
                              Number(
                                trip.cupo_disponible ??
                                  trip.asientos_disponibles ??
                                  0
                              ) <= 0
                            }
                            className="
                              bg-emerald-600
                              text-white
                              hover:bg-emerald-700
                            "
                          >
                            {bookingId === trip.id
                              ? "Solicitando..."
                              : "Tomar viaje"}
                          </Button>

                        ) : tieneRol("Pasajero") ? (

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              cambiarModo(
                                "Pasajero"
                              )
                            }
                            className="
                              border-emerald-200
                              text-emerald-700
                              hover:bg-emerald-50
                            "
                          >
                            Cambiar a modo Pasajero
                          </Button>

                        ) : (

                          <span className="text-sm text-slate-500">
                            Solo pasajeros pueden reservar
                          </span>

                        )}

                      </div>

                    </CardContent>

                  </Card>

                ))}

              </div>

              {/* CARGAR MÁS */}

              {hayMasViajes && (

                <div className="mt-8 flex justify-center">

                  <Button
                    type="button"
                    variant="outline"
                    onClick={cargarMas}
                    className="
                      min-w-44
                      border-emerald-200
                      text-emerald-700
                      hover:bg-emerald-50
                    "
                  >
                    <ChevronDown size={18} />

                    Cargar más
                  </Button>

                </div>

              )}

              {/* FIN DE RESULTADOS */}

              {!hayMasViajes &&
                tripsFiltrados.length > 6 && (
                  <p className="mt-6 text-center text-sm text-slate-400">
                    Has llegado al final de los resultados.
                  </p>
                )}

            </div>

          ) : null}

        </div>
      </section>

      {/* ========================================================
          ACCIONES PRINCIPALES
      ======================================================== */}

      <section
        className="
          order-2
          border-t
          bg-white
          px-6
          py-20
        "
      >

        <div className="mx-auto max-w-6xl">

          <div className="mb-10 text-center">

            <p
              className="
                mb-2
                text-sm
                font-semibold
                tracking-widest
                text-emerald-600
              "
            >
              TUS OPCIONES
            </p>

            <h2
              className="text-3xl font-bold"
              style={{
                color: "#0f172a",
              }}
            >
              ¿Qué quieres hacer?
            </h2>

          </div>

          <div className="grid gap-6 md:grid-cols-3">

            {/* BUSCAR VIAJE */}

            <Card className="transition-shadow hover:shadow-lg">

              <CardContent className="p-6">

                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-lg
                    bg-emerald-50
                    text-emerald-600
                  "
                >
                  <Search size={23} />
                </div>

                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "#0f172a",
                  }}
                >
                  Buscar un viaje
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Encuentra viajes disponibles de acuerdo con
                  tu origen, destino y horario.
                </p>

                <Button
                  variant="ghost"
                  onClick={handleBuscar}
                  className="
                    mt-5
                    px-0
                    text-emerald-600
                    hover:bg-transparent
                    hover:text-emerald-700
                  "
                >
                  Buscar viaje →
                </Button>

              </CardContent>

            </Card>

            {/* PUBLICAR VIAJE */}

            <Card className="transition-shadow hover:shadow-lg">

              <CardContent className="p-6">

                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-lg
                    bg-emerald-50
                    text-emerald-600
                  "
                >
                  <Car size={23} />
                </div>

                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "#0f172a",
                  }}
                >
                  Publicar un viaje
                </h3>

                {canPublish ? (

                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Comparte tu ruta y permite que otros
                      estudiantes se unan.
                    </p>

                    <Button
                      variant="ghost"
                      onClick={onPublish}
                      className="
                        mt-5
                        px-0
                        text-emerald-600
                        hover:bg-transparent
                        hover:text-emerald-700
                      "
                    >
                      Publicar viaje →
                    </Button>
                  </>

                ) : tieneRol("Conductor") ? (

                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Estás en modo Pasajero. Cambia a modo Conductor
                      para publicar viajes.
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        cambiarModo("Conductor")
                      }
                      className="
                        mt-5
                        px-0
                        text-emerald-600
                        hover:bg-transparent
                        hover:text-emerald-700
                      "
                    >
                      Cambiar a modo Conductor →
                    </Button>
                  </>

                ) : (

                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Añade un vehículo para poder publicar viajes...
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onVehiculos}
                      className="
                        mt-5
                        px-0
                        text-emerald-600
                        hover:bg-transparent
                        hover:text-emerald-700
                      "
                    >
                      Ir a mis vehículos →
                    </Button>
                  </>

                )}

              </CardContent>

            </Card>

            {/* MIS VIAJES */}

            <Card className="transition-shadow hover:shadow-lg">

              <CardContent className="p-6">

                <div
                  className="
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-lg
                    bg-emerald-50
                    text-emerald-600
                  "
                >
                  <ClipboardList size={23} />
                </div>

                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "#0f172a",
                  }}
                >
                  Mis viajes
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Consulta y administra los viajes que tienes
                  programados.
                </p>

                <Button
                  variant="ghost"
                  onClick={onMisViajes}
                  className="
                    mt-5
                    px-0
                    text-emerald-600
                    hover:bg-transparent
                    hover:text-emerald-700
                  "
                >
                  Ver mis viajes →
                </Button>

              </CardContent>

            </Card>

          </div>

        </div>

      </section>

      {/* ========================================================
          MODAL CERRAR SESIÓN
      ======================================================== */}

      {confirmarCierreSesion && (

        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            bg-slate-900/40
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-6
              shadow-2xl
            "
          >

            <div
              className="
                mb-4
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-full
                bg-red-100
                text-red-600
              "
            >
              <LogOut size={22} />
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              Cerrar sesión
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              ¿Seguro que deseas salir de tu sesión actual?
              Tendrás que iniciar sesión de nuevo para continuar.
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setConfirmarCierreSesion(false)
                }
              >
                Cancelar
              </Button>

              <Button
                type="button"
                className="
                  bg-red-600
                  text-white
                  hover:bg-red-700
                "
                onClick={() => {
                  setConfirmarCierreSesion(false);
                  onLogout();
                }}
              >
                Cerrar sesión
              </Button>

            </div>

          </div>

        </div>

      )}

      {/* ========================================================
          INFORMACIÓN UNIRIDE
      ======================================================== */}

      <section
        id="uniride"
        className="order-4 border-t px-6 py-20"
      >

        <div
          className="
            mx-auto
            grid
            max-w-6xl
            gap-12
            md:grid-cols-2
            md:items-center
          "
        >

          <div>

            <p
              className="
                mb-3
                text-sm
                font-semibold
                tracking-widest
                text-emerald-600
              "
            >
              SOBRE UNIRIDE
            </p>

            <h2
              className="
                text-3xl
                font-bold
                leading-tight
                md:text-4xl
              "
              style={{
                color: "#0f172a",
              }}
            >
              Una forma más sencilla
              <br />
              de moverte por la universidad.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-slate-500">
              UniRide conecta estudiantes que comparten rutas
              para facilitar sus traslados. Nuestra plataforma
              busca ofrecer una alternativa práctica,
              económica y colaborativa para la comunidad
              universitaria.
            </p>

          </div>

          <div className="space-y-4">

            <div
              className="
                flex
                items-center
                gap-5
                rounded-lg
                border
                bg-white
                p-5
              "
            >
              <strong className="text-2xl text-emerald-600">
                01
              </strong>

              <span className="text-sm font-medium text-slate-600">
                Busca tu ruta
              </span>
            </div>

            <div
              className="
                flex
                items-center
                gap-5
                rounded-lg
                border
                bg-white
                p-5
              "
            >
              <strong className="text-2xl text-emerald-600">
                02
              </strong>

              <span className="text-sm font-medium text-slate-600">
                Encuentra compañeros
              </span>
            </div>

            <div
              className="
                flex
                items-center
                gap-5
                rounded-lg
                border
                bg-white
                p-5
              "
            >
              <strong className="text-2xl text-emerald-600">
                03
              </strong>

              <span className="text-sm font-medium text-slate-600">
                Comparte el viaje
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <div className="order-5">
        <Footer />
      </div>

    </div>
  );
}

export default Home;