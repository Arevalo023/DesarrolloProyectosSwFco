import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

function Home({ onLogout, onProfile }) {

  // ============================================================
  // BAJAR A LA SECCIÓN DE BÚSQUEDA
  // ============================================================
  const handleBuscar = () => {
    document
      .getElementById("buscar")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">

      {/* ========================================================
          NAVBAR
      ======================================================== */}

      <nav className="w-full border-b bg-white">

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

          <div className="flex items-center gap-2">

            <Car
              className="text-emerald-600"
              size={32}
            />

            <h1 className="text-xl font-bold !text-black m-0">
              Uni{" "}

              <span className="text-emerald-600">
                Ride
              </span>
            </h1>

          </div>


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

            <Button
              type="button"
              variant="ghost"
              onClick={onProfile}
              className="
                flex
                items-center
                gap-2
                text-slate-700
                hover:bg-emerald-50
                hover:text-emerald-700
              "
            >
              <UserRound size={18} />

              <span className="hidden sm:inline">
                Mi perfil
              </span>
            </Button>


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
        className="border-b bg-white"
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
        className="px-6 py-20"
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

              <div className="grid gap-5 md:grid-cols-4">

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
                    type="text"
                    placeholder="¿Desde dónde sales?"
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
                    type="text"
                    placeholder="¿A dónde quieres llegar?"
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
                    type="date"
                  />

                </div>


                {/* BOTÓN */}

                <div className="flex items-end">

                  <Button
                    className="
                      w-full
                      bg-emerald-600
                      text-white
                      hover:bg-emerald-700
                    "
                  >
                    <Search size={18} />

                    Buscar viaje
                  </Button>

                </div>

              </div>

            </CardContent>

          </Card>

        </div>

      </section>


      {/* ========================================================
          ACCIONES PRINCIPALES
      ======================================================== */}

      <section
        className="
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

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Comparte tu ruta y permite que otros
                  estudiantes se unan.
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
                  Publicar viaje →
                </Button>

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
        className="border-t px-6 py-20"
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

      <footer className="border-t bg-white px-6 py-6">

        <div
          className="
            mx-auto
            flex
            max-w-7xl
            flex-col
            items-center
            justify-between
            gap-3
            md:flex-row
          "
        >

          <div className="flex items-center gap-2">

            <Car
              className="text-emerald-600"
              size={24}
            />

            <p className="m-0 font-bold text-slate-800">
              Uni{" "}

              <span className="text-emerald-600">
                Ride
              </span>
            </p>

          </div>


          <p className="m-0 text-sm text-slate-500">
            © 2026 UniRide · Movilidad universitaria
          </p>

        </div>

      </footer>

    </div>
  );
}

export default Home;