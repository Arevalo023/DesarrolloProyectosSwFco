import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

import heroImage from "@/assets/hero.png";

import { apiRequest } from "@/services/api";
import { mismoRol, rolesDe } from "@/services/session";

function Home({
  onLogout,
  onProfile,
  onVehiculos,
  onPublish,
  user,
  rolActivo,
  onCambiarRol,
}) {
  const [menuPerfil, setMenuPerfil] = useState(false);

  const [filters, setFilters] = useState({
    origen: "",
    destino: "",
    fecha: "",
  });

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // ROLES
  // ============================================================

  const userRoles = rolesDe(user);

  const tieneRol = (rol) =>
    userRoles.some((r) => mismoRol(r, rol));

  // Si aún no hay rol activo guardado, se usa el principal
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
  // BUSCAR VIAJES
  // ============================================================

  const buscarViajes = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value)
      );

      const data = await apiRequest(`/api/trips?${query}`);

      setTrips(data.trips || []);
    } catch (requestError) {
      setError(requestError.message);
      setTrips([]);
    } finally {
      setLoading(false);
    }
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
        { method: "POST" }
      );

      setTrips((current) =>
        current
          .map((trip) =>
            trip.id === tripId
              ? {
                  ...trip,
                  cupo_disponible: trip.cupo_disponible - 1,
                }
              : trip
          )
          .filter((trip) => trip.cupo_disponible > 0)
      );

      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBookingId(null);
    }
  };

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

            {/* ==================================================
                MODO (ROL ACTIVO)
                Con varios roles se puede cambiar; con uno solo
                se muestra como etiqueta fija.
            ================================================== */}

            {userRoles.length > 1 ? (
              <div
                role="group"
                aria-label="Modo de uso"
                className="flex rounded-full border border-slate-200 bg-slate-100 p-1"
              >
                {userRoles.map((rol) => {
                  const activo = mismoRol(rol, rolEnUso);

                  return (
                    <button
                      key={rol}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => cambiarModo(rol)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        activo
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-emerald-700"
                      }`}
                    >
                      {rol}
                    </button>
                  );
                })}
              </div>
            ) : rolEnUso ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {rolEnUso}
              </span>
            ) : null}

            {/* ==================================================
                BOTÓN DEL PERFIL + MENÚ
            ================================================== */}

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


              {/* =================================================
                  MENÚ DEL PERFIL
              ================================================= */}

              <div
                className={`absolute right-0 top-12 z-50 w-56 origin-top-right rounded-xl border bg-white p-2 shadow-lg transition-all duration-200 ease-out ${
                  menuPerfil
                    ? "pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none scale-95 opacity-0"
                }`}
                aria-hidden={!menuPerfil}
              >
                  {/* VER MI PERFIL */}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuPerfil(false);
                      onProfile();
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
                      onVehiculos();
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


                  {/* SEPARADOR */}

                  <div className="my-1 border-t" />


                  {/* CERRAR SESIÓN */}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuPerfil(false);
                      onLogout();
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
              onClick={onLogout}
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
                className="grid gap-5 md:grid-cols-4"
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


                {/* FECHA */}

                <div className="space-y-2">

                  <label
                    htmlFor="fecha"
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

                    Fecha
                  </label>

                  <Input
                    id="fecha"
                    name="fecha"
                    type="date"
                    value={filters.fecha}
                    onChange={actualizarFiltro}
                  />

                </div>


                {/* BOTÓN */}

                <div className="flex items-end">

                  <Button
                    type="submit"
                    className="
                      w-full
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

                </div>

              </form>


              {error && (
                <p
                  className="
                    mt-4
                    rounded-md
                    bg-red-50
                    px-3
                    py-2
                    text-sm
                    text-red-700
                  "
                >
                  {error}
                </p>
              )}


              {message && (
                <p
                  className="
                    mt-4
                    rounded-md
                    bg-emerald-50
                    px-3
                    py-2
                    text-sm
                    text-emerald-700
                  "
                >
                  {message}
                </p>
              )}

            </CardContent>

          </Card>


          {/* RESULTADOS */}

          {trips.length > 0 && (
            <div className="mt-8 grid gap-4 md:grid-cols-2">

              {trips.map((trip) => (

                <Card key={trip.id}>

                  <CardContent
                    className="
                      flex
                      flex-col
                      gap-3
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
                          {trip.origen} → {trip.destino}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {new Date(
                            trip.fecha_salida
                          ).toLocaleString()}
                        </p>

                      </div>

                      <span className="font-semibold text-emerald-700">
                        ${trip.costo_por_pasajero}
                      </span>

                    </div>


                    <p className="text-sm text-slate-600">
                      Conduce {trip.conductor} · {trip.marca}{" "}
                      {trip.modelo}
                    </p>


                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >

                      <span className="text-sm text-slate-500">
                        {trip.cupo_disponible} asientos disponibles
                      </span>

                      {modoPasajero ? (
                        <Button
                          type="button"
                          onClick={() =>
                            reservarViaje(trip.id)
                          }
                          disabled={
                            bookingId === trip.id
                          }
                          className="
                            bg-emerald-600
                            text-white
                            hover:bg-emerald-700
                          "
                        >
                          {bookingId === trip.id
                            ? "Reservando..."
                            : "Tomar viaje"}
                        </Button>
                      ) : tieneRol("Pasajero") ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cambiarModo("Pasajero")}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          Cambiar a modo Pasajero para reservar
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
          )}

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
                  tu origen y destino.
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
                        onClick={() => cambiarModo("Conductor")}
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


      {/* FOOTER */}

      <div className="order-5">
        <Footer />
      </div>

    </div>
  );
}

export default Home;
