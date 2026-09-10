import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Car,
  User,
  Mail,
  GraduationCap,
  MapPin,
  Phone,
  CreditCard,
  Pencil,
  Save,
  X,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export default function Profile({
  user,
  onBackHome,
  onUserUpdated,
}) {

  // ============================================================
  // CONVERTIR LOS DATOS QUE LLEGUEN DEL BACKEND
  //
  // Permite recibir:
  //
  // nombre / name
  // correo / email
  //
  // También une nombre + apellido si vienen separados.
  // ============================================================

  const normalizarUsuario = (usuario) => {

    if (!usuario) {
      return {
        name: "",
        email: "",
        matricula: "",
        telefono: "",
        universidad: "",
        carrera: "",
        campus: "",
        semestre: "",
        rol: "Estudiante universitario",
      };
    }


    // ----------------------------------------------------------
    // NOMBRE
    // ----------------------------------------------------------

    let nombreCompleto = "";

    if (usuario.name) {

      nombreCompleto = usuario.name;

    } else {

      nombreCompleto = [
        usuario.nombre,
        usuario.apellido,
      ]
        .filter(Boolean)
        .join(" ");

    }


    // ----------------------------------------------------------
    // UNIVERSIDAD
    // Puede venir como texto o como objeto.
    // ----------------------------------------------------------

    let universidad = "";

    if (typeof usuario.universidad === "string") {

      universidad = usuario.universidad;

    } else if (usuario.universidad?.nombre) {

      universidad = usuario.universidad.nombre;

    } else if (usuario.universidad_nombre) {

      universidad = usuario.universidad_nombre;

    }


    // ----------------------------------------------------------
    // CAMPUS
    // Puede venir como texto o como objeto.
    // ----------------------------------------------------------

    let campus = "";

    if (typeof usuario.campus === "string") {

      campus = usuario.campus;

    } else if (usuario.campus?.nombre) {

      campus = usuario.campus.nombre;

    } else if (usuario.campus_nombre) {

      campus = usuario.campus_nombre;

    }


    // ----------------------------------------------------------
    // ROL
    // ----------------------------------------------------------

    let rol = "Estudiante universitario";

    if (typeof usuario.rol === "string") {

      rol = usuario.rol;

    } else if (usuario.rol?.nombre) {

      rol = usuario.rol.nombre;

    } else if (usuario.rol_nombre) {

      rol = usuario.rol_nombre;

    }


    return {

      // Nombre
      name:
        nombreCompleto ||
        "",

      // Correo
      email:
        usuario.email ||
        usuario.correo ||
        "",

      // Matrícula
      matricula:
        usuario.matricula ||
        usuario.numero_matricula ||
        "",

      // Teléfono
      telefono:
        usuario.telefono ||
        usuario.phone ||
        "",

      // Universidad
      universidad,

      // Carrera
      carrera:
        usuario.carrera ||
        usuario.carrera_nombre ||
        "",

      // Campus
      campus,

      // Semestre
      semestre:
        usuario.semestre ||
        "",

      // Rol
      rol,
    };
  };


  // ============================================================
  // DATOS INICIALES
  // ============================================================

  const [datos, setDatos] = useState(
    () => normalizarUsuario(user)
  );

  const [datosGuardados, setDatosGuardados] = useState(
    () => normalizarUsuario(user)
  );

  const [editando, setEditando] = useState(false);

  const [mensaje, setMensaje] = useState("");


  // ============================================================
  // SI CAMBIA EL USUARIO QUE VIENE DE APP.JSX
  //
  // Actualizamos automáticamente el perfil.
  // ============================================================

  useEffect(() => {

    const usuarioNormalizado =
      normalizarUsuario(user);

    setDatos(usuarioNormalizado);

    setDatosGuardados(usuarioNormalizado);

  }, [user]);


  // ============================================================
  // OBTENER INICIALES
  //
  // Erika Jasmin -> EJ
  // Pedro Pérez  -> PP
  // ============================================================

  const obtenerIniciales = (nombre = "") => {

    const partes = nombre
      .trim()
      .split(" ")
      .filter(Boolean);

    if (partes.length === 0) {
      return "U";
    }

    if (partes.length === 1) {
      return partes[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      partes[0].charAt(0) +
      partes[1].charAt(0)
    ).toUpperCase();
  };


  // ============================================================
  // CAMBIAR DATOS DE LOS INPUTS
  // ============================================================

  const handleChange = (event) => {

    const { name, value } = event.target;

    setDatos((datosAnteriores) => ({
      ...datosAnteriores,
      [name]: value,
    }));
  };


  // ============================================================
  // ACTIVAR EDICIÓN
  // ============================================================

  const activarEdicion = () => {

    setMensaje("");

    setEditando(true);
  };


  // ============================================================
  // CANCELAR EDICIÓN
  // ============================================================

  const cancelarEdicion = () => {

    setDatos(datosGuardados);

    setMensaje("");

    setEditando(false);
  };


  // ============================================================
  // GUARDAR CAMBIOS
  //
  // Por ahora guarda en React/localStorage mediante App.jsx.
  //
  // Cuando conecten la base de datos, aquí se podrá agregar
  // un PUT/PATCH al backend.
  // ============================================================

  const guardarCambios = async () => {

    setDatosGuardados(datos);

    setEditando(false);


    // ----------------------------------------------------------
    // AVISAR A APP.JSX QUE EL USUARIO CAMBIÓ
    // ----------------------------------------------------------

    if (onUserUpdated) {
      onUserUpdated(datos);
    }


    // ----------------------------------------------------------
    // FUTURA CONEXIÓN CON EL BACKEND
    //
    // Ejemplo:
    //
    // const token = localStorage.getItem("token");
    //
    // const response = await fetch(
    //   "http://localhost:3000/users/me",
    //   {
    //     method: "PUT",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${token}`,
    //     },
    //     body: JSON.stringify(datos),
    //   }
    // );
    //
    // const respuesta = await response.json();
    //
    // ----------------------------------------------------------


    setMensaje(
      "Perfil actualizado correctamente."
    );


    setTimeout(() => {
      setMensaje("");
    }, 3000);
  };


  // ============================================================
  // ESTILO GENERAL DE INPUTS
  // ============================================================

  const estiloInput = `
    pl-10
    h-11
    rounded-xl
    border-slate-200
    bg-slate-50
    text-slate-900
    font-medium
    placeholder:text-slate-400
    focus-visible:ring-emerald-500
    focus-visible:border-emerald-500
    read-only:cursor-default
  `;


  // ============================================================
  // INTERFAZ
  // ============================================================

  return (

    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#f8fafc",
        color: "#0f172a",
      }}
    >

      {/* ========================================================
          BARRA SUPERIOR
      ======================================================== */}

      <header
        className="
          bg-white
          border-b
          border-slate-200
        "
      >

        <div
          className="
            max-w-6xl
            mx-auto
            px-4
            sm:px-6
            py-4
            flex
            items-center
            justify-between
            gap-4
          "
        >

          {/* LOGO */}

          <div className="flex items-center gap-2">

            <Car
              size={34}
              strokeWidth={2.2}
              style={{
                color: "#059669",
              }}
            />

            <h1
              className="text-2xl font-bold"
              style={{
                margin: 0,
                color: "#000000",
              }}
            >
              Uni{" "}

              <span
                style={{
                  color: "#059669",
                }}
              >
                Ride
              </span>

            </h1>

          </div>


          {/* PARTE DERECHA */}

          <div className="flex items-center gap-3">

            <span
              className="
                hidden
                md:block
                text-sm
                font-medium
              "
              style={{
                color: "#64748b",
              }}
            >
              Mi perfil
            </span>


            {/* BOTÓN REGRESAR AL HOME */}

            {onBackHome && (

              <Button
                type="button"
                variant="outline"
                onClick={onBackHome}
                className="
                  flex
                  items-center
                  gap-2
                  hover:bg-emerald-50
                  hover:text-emerald-700
                  hover:border-emerald-200
                "
              >

                <ArrowLeft size={17} />

                <span>
                  Regresar al inicio
                </span>

              </Button>

            )}

          </div>

        </div>

      </header>


      {/* ========================================================
          CONTENIDO PRINCIPAL
      ======================================================== */}

      <main
        className="
          max-w-5xl
          mx-auto
          px-4
          sm:px-6
          py-8
        "
      >

        <Card
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            shadow-sm
            overflow-hidden
          "
        >

          <CardContent className="p-0">


            {/* ==================================================
                CABECERA DEL PERFIL
            ================================================== */}

            <div
              className="
                px-6
                sm:px-11
                pt-10
                pb-8
                border-b
                border-slate-200
              "
            >

              <div
                className="
                  flex
                  flex-col
                  sm:flex-row
                  items-center
                  sm:items-start
                  gap-6
                "
              >

                {/* AVATAR */}

                <div
                  className="
                    w-28
                    h-28
                    rounded-full
                    flex
                    items-center
                    justify-center
                    text-3xl
                    font-bold
                    border-4
                    border-white
                    shadow-md
                    flex-shrink-0
                  "
                  style={{
                    backgroundColor: "#ecfdf5",
                    color: "#047857",
                  }}
                >

                  {obtenerIniciales(datos.name)}

                </div>


                {/* DATOS PRINCIPALES */}

                <div
                  className="
                    flex-1
                    text-center
                    sm:text-left
                    sm:pt-2
                  "
                >

                  <h2
                    className="text-2xl font-bold mb-1"
                    style={{
                      color: "#0f172a",
                    }}
                  >
                    {datos.name || "Usuario"}
                  </h2>


                  <p
                    className="text-base"
                    style={{
                      color: "#475569",
                    }}
                  >
                    {datos.rol || "Estudiante universitario"}
                  </p>


                  <div
                    className="
                      inline-flex
                      items-center
                      gap-2
                      mt-4
                      px-4
                      py-2
                      rounded-full
                      text-sm
                      font-semibold
                    "
                    style={{
                      backgroundColor: "#ecfdf5",
                      color: "#047857",
                    }}
                  >

                    <CheckCircle2 size={16} />

                    Cuenta universitaria verificada

                  </div>

                </div>

              </div>

            </div>


            {/* ==================================================
                INFORMACIÓN PERSONAL
            ================================================== */}

            <div
              className="
                px-6
                sm:px-11
                py-8
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                  mb-7
                "
              >

                <User
                  size={21}
                  style={{
                    color: "#059669",
                  }}
                />

                <h3
                  className="text-base font-bold"
                  style={{
                    color: "#0f172a",
                  }}
                >
                  Información personal
                </h3>

              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-x-6
                  gap-y-6
                "
              >


                {/* =================================================
                    NOMBRE
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="name"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    NOMBRE COMPLETO
                  </Label>


                  <div className="relative">

                    <User
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="name"
                      name="name"
                      value={datos.name}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Nombre del usuario"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>


                {/* =================================================
                    CORREO
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="email"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    CORREO INSTITUCIONAL
                  </Label>


                  <div className="relative">

                    <Mail
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={datos.email}
                      readOnly
                      placeholder="Correo institucional"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>


                  <p
                    className="
                      text-xs
                      text-center
                      md:text-left
                    "
                    style={{
                      color: "#64748b",
                    }}
                  >
                    El correo institucional no puede modificarse.
                  </p>

                </div>


                {/* =================================================
                    MATRÍCULA
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="matricula"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    MATRÍCULA
                  </Label>


                  <div className="relative">

                    <CreditCard
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="matricula"
                      name="matricula"
                      value={datos.matricula}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Matrícula"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>


                {/* =================================================
                    TELÉFONO
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="telefono"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    TELÉFONO
                  </Label>


                  <div className="relative">

                    <Phone
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      value={datos.telefono}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Teléfono"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* ==================================================
                INFORMACIÓN UNIVERSITARIA
            ================================================== */}

            <div
              className="
                px-6
                sm:px-11
                py-8
                border-t
                border-slate-200
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                  mb-7
                "
              >

                <GraduationCap
                  size={22}
                  style={{
                    color: "#059669",
                  }}
                />

                <h3
                  className="text-base font-bold"
                  style={{
                    color: "#0f172a",
                  }}
                >
                  Información universitaria
                </h3>

              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-x-6
                  gap-y-6
                "
              >


                {/* =================================================
                    UNIVERSIDAD
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="universidad"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    UNIVERSIDAD
                  </Label>


                  <div className="relative">

                    <GraduationCap
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="universidad"
                      name="universidad"
                      value={datos.universidad}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Universidad"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>


                {/* =================================================
                    CARRERA
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="carrera"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    CARRERA
                  </Label>


                  <div className="relative">

                    <GraduationCap
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="carrera"
                      name="carrera"
                      value={datos.carrera}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Carrera"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>


                {/* =================================================
                    CAMPUS
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="campus"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    CAMPUS
                  </Label>


                  <div className="relative">

                    <MapPin
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="campus"
                      name="campus"
                      value={datos.campus}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Campus"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>


                {/* =================================================
                    SEMESTRE
                ================================================= */}

                <div className="space-y-2">

                  <Label
                    htmlFor="semestre"
                    className="
                      text-xs
                      font-bold
                      tracking-wide
                    "
                    style={{
                      color: "#475569",
                    }}
                  >
                    SEMESTRE
                  </Label>


                  <div className="relative">

                    <GraduationCap
                      size={17}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        z-10
                      "
                      style={{
                        color: "#64748b",
                      }}
                    />


                    <Input
                      id="semestre"
                      name="semestre"
                      value={datos.semestre}
                      onChange={handleChange}
                      readOnly={!editando}
                      placeholder="Semestre"
                      className={estiloInput}
                      style={{
                        color: "#1e293b",
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* ==================================================
                MENSAJE DE ÉXITO
            ================================================== */}

            {mensaje && (

              <div
                className="
                  px-6
                  sm:px-11
                  pb-3
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-medium
                    rounded-xl
                    px-4
                    py-3
                    border
                  "
                  style={{
                    color: "#047857",
                    backgroundColor: "#ecfdf5",
                    borderColor: "#a7f3d0",
                  }}
                >

                  <CheckCircle2 size={18} />

                  {mensaje}

                </div>

              </div>

            )}


            {/* ==================================================
                BOTONES EDITAR / GUARDAR
            ================================================== */}

            <div
              className="
                px-6
                sm:px-11
                pt-5
                pb-9
                flex
                flex-col
                sm:flex-row
                sm:justify-end
                gap-3
              "
            >

              {!editando ? (

                // ==================================================
                // EDITAR
                // ==================================================

                <Button
                  type="button"
                  onClick={activarEdicion}
                  className="
                    h-11
                    gap-2
                    rounded-xl
                    px-7
                    font-semibold
                    sm:min-w-48
                  "
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                  }}
                >

                  <Pencil size={17} />

                  Editar perfil

                </Button>

              ) : (

                <>

                  {/* =================================================
                      CANCELAR
                  ================================================= */}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelarEdicion}
                    className="
                      h-11
                      gap-2
                      rounded-xl
                      px-6
                    "
                  >

                    <X size={17} />

                    Cancelar

                  </Button>


                  {/* =================================================
                      GUARDAR
                  ================================================= */}

                  <Button
                    type="button"
                    onClick={guardarCambios}
                    className="
                      h-11
                      gap-2
                      rounded-xl
                      px-7
                      font-semibold
                    "
                    style={{
                      backgroundColor: "#059669",
                      color: "#ffffff",
                    }}
                  >

                    <Save size={17} />

                    Guardar cambios

                  </Button>

                </>

              )}

            </div>

          </CardContent>

        </Card>


        {/* ======================================================
            PIE DE PÁGINA
        ====================================================== */}

        <p
          className="
            text-center
            text-xs
            mt-5
          "
          style={{
            color: "#64748b",
          }}
        >
          Uni Ride · Tu comunidad universitaria en movimiento
        </p>

      </main>

    </div>
  );
}