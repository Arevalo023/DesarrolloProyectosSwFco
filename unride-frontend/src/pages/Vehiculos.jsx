import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AlertBanner from "@/components/ui/alert-banner";

import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

import {
  listarMisVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  cambiarEstadoVehiculo,
  eliminarVehiculo,
} from "@/services/vehicleService";

import {
  Car,
  Plus,
  Pencil,
  Power,
  PowerOff,
  LoaderCircle,
  RefreshCw,
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Users,
  Trash2,
} from "lucide-react";


// ============================================================
// UTILIDADES
// ============================================================

const ordenarVehiculos = (lista) =>
  [...lista].sort((a, b) => {
    if (a.activo !== b.activo) {
      return a.activo ? -1 : 1;
    }

    return a.id - b.id;
  });


// ============================================================
// FORMULARIO INICIAL
// ============================================================

const formularioInicial = {
  marca: "",
  modelo: "",
  año: "",
  color: "",
  placas: "",
  asientos: "",
};


export default function Vehiculos({
  onBackHome,
  onSesionActualizada,
}) {

  // ============================================================
  // ESTADOS
  // ============================================================

  const [vehiculos, setVehiculos] = useState([]);

  const [estadoCarga, setEstadoCarga] =
    useState("cargando");

  const [errorCarga, setErrorCarga] =
    useState("");

  const [intentoCarga, setIntentoCarga] =
    useState(0);

  const [guardando, setGuardando] =
    useState(false);

  const [
    cambiandoEstadoId,
    setCambiandoEstadoId,
  ] = useState(null);

  const [modoFormulario, setModoFormulario] =
    useState(null);

  const [
    vehiculoEditando,
    setVehiculoEditando,
  ] = useState(null);

  const [formulario, setFormulario] = useState({
    ...formularioInicial,
  });

  const [errores, setErrores] = useState({});


  // ============================================================
  // MENSAJES GENERALES
  // ============================================================

  const [mensaje, setMensaje] =
    useState("");

  const [tipoMensaje, setTipoMensaje] =
    useState("exito");


  // ============================================================
  // MODAL ACTIVAR / DESACTIVAR
  // ============================================================

  const [
    vehiculoPendienteEstado,
    setVehiculoPendienteEstado,
  ] = useState(null);

  const [
    modalEstadoAbierto,
    setModalEstadoAbierto,
  ] = useState(false);


  // ============================================================
  // MODAL DE ÉXITO
  // ============================================================

  const [
    modalExitoAbierto,
    setModalExitoAbierto,
  ] = useState(false);

  const [tituloExito, setTituloExito] =
    useState("");

  const [
    descripcionExito,
    setDescripcionExito,
  ] = useState("");


  // ============================================================
  // MENSAJES
  // ============================================================

  const mostrarMensaje = (texto, tipo) => {
    setMensaje(texto);
    setTipoMensaje(tipo);
  };


  const mostrarModalExito = (
    titulo,
    descripcion
  ) => {
    setTituloExito(titulo);
    setDescripcionExito(descripcion);
    setModalExitoAbierto(true);
  };


  // ============================================================
  // CARGAR VEHÍCULOS
  // ============================================================

  useEffect(() => {
    let cancelado = false;

    listarMisVehiculos()
      .then((lista) => {
        if (cancelado) {
          return;
        }

        setVehiculos(
          ordenarVehiculos(lista)
        );

        setEstadoCarga("ok");
      })
      .catch((error) => {
        if (cancelado) {
          return;
        }

        setErrorCarga(
          error.message ||
            "No fue posible cargar los vehículos."
        );

        setEstadoCarga("error");
      });

    return () => {
      cancelado = true;
    };
  }, [intentoCarga]);


  const reintentarCarga = () => {
    setErrorCarga("");
    setEstadoCarga("cargando");

    setIntentoCarga((n) => n + 1);
  };


  // ============================================================
  // ABRIR FORMULARIO AGREGAR
  // ============================================================

  const abrirAgregar = () => {
    setModoFormulario("agregar");

    setVehiculoEditando(null);

    setFormulario({
      ...formularioInicial,
    });

    setErrores({});

    setMensaje("");
  };


  // ============================================================
  // ABRIR FORMULARIO EDITAR
  // ============================================================

  const abrirEditar = (vehiculo) => {
    setModoFormulario("editar");

    setVehiculoEditando(vehiculo);

    setFormulario({
      marca: vehiculo.marca || "",
      modelo: vehiculo.modelo || "",
      año: vehiculo.año || "",
      color: vehiculo.color || "",
      placas: vehiculo.placas || "",
      asientos: vehiculo.asientos || "",
    });

    setErrores({});

    setMensaje("");
  };


  // ============================================================
  // CANCELAR FORMULARIO
  // ============================================================

  const cancelarFormulario = () => {
    setModoFormulario(null);

    setVehiculoEditando(null);

    setFormulario({
      ...formularioInicial,
    });

    setErrores({});

    setMensaje("");
  };


  // ============================================================
  // CAMBIO DE INPUTS
  // ============================================================

  const manejarCambio = (event) => {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    if (errores[name]) {
      setErrores((anteriores) => ({
        ...anteriores,
        [name]: "",
      }));
    }

    setMensaje("");
  };


  // ============================================================
  // VALIDAR FORMULARIO
  // ============================================================

  const validarFormulario = () => {
    const nuevosErrores = {};


    // MARCA

    if (!formulario.marca.trim()) {
      nuevosErrores.marca =
        "La marca es obligatoria.";
    } else if (
      formulario.marca.trim().length < 2
    ) {
      nuevosErrores.marca =
        "La marca debe tener al menos 2 caracteres.";
    }


    // MODELO

    if (!formulario.modelo.trim()) {
      nuevosErrores.modelo =
        "El modelo es obligatorio.";
    } else if (
      formulario.modelo.trim().length < 2
    ) {
      nuevosErrores.modelo =
        "El modelo debe tener al menos 2 caracteres.";
    }


    // AÑO

    if (!formulario.año) {
      nuevosErrores.año =
        "El año es obligatorio.";
    } else {
      const año =
        Number(formulario.año);

      const añoActual =
        new Date().getFullYear();

      if (!Number.isInteger(año)) {
        nuevosErrores.año =
          "Ingresa un año válido.";
      } else if (
        año < 1900 ||
        año > añoActual + 1
      ) {
        nuevosErrores.año =
          `El año debe estar entre 1900 y ${
            añoActual + 1
          }.`;
      }
    }


    // COLOR

    if (!formulario.color.trim()) {
      nuevosErrores.color =
        "El color es obligatorio.";
    } else if (
      formulario.color.trim().length < 3
    ) {
      nuevosErrores.color =
        "El color debe tener al menos 3 caracteres.";
    }


    // PLACAS

    if (!formulario.placas.trim()) {
      nuevosErrores.placas =
        "Las placas son obligatorias.";
    } else if (
      formulario.placas.trim().length < 3
    ) {
      nuevosErrores.placas =
        "Las placas deben tener al menos 3 caracteres.";
    }


    // ASIENTOS

    if (!formulario.asientos) {
      nuevosErrores.asientos =
        "El número de asientos es obligatorio.";
    } else {
      const asientos =
        Number(formulario.asientos);

      if (!Number.isInteger(asientos)) {
        nuevosErrores.asientos =
          "Ingresa un número válido de asientos.";
      } else if (asientos < 1) {
        nuevosErrores.asientos =
          "El vehículo debe tener al menos 1 asiento.";
      } else if (asientos > 50) {
        nuevosErrores.asientos =
          "El número de asientos no puede ser mayor a 50.";
      }
    }


    setErrores(nuevosErrores);

    return (
      Object.keys(nuevosErrores).length === 0
    );
  };


  // ============================================================
  // GUARDAR VEHÍCULO
  // ============================================================

  const guardarVehiculo = async (event) => {
    event.preventDefault();

    if (guardando) {
      return;
    }

    setMensaje("");

    const formularioValido =
      validarFormulario();

    if (!formularioValido) {
      mostrarMensaje(
        "Revisa los campos marcados antes de continuar.",
        "error"
      );

      return;
    }

    setGuardando(true);

    try {

      // ========================================================
      // AGREGAR
      // ========================================================

      if (modoFormulario === "agregar") {
        const {
          mensaje: respuesta,
          vehiculo,
          sesion,
          rolAgregado,
        } = await crearVehiculo(formulario);


        setVehiculos((anteriores) =>
          ordenarVehiculos([
            ...anteriores,
            vehiculo,
          ])
        );


        if (sesion && rolAgregado) {
          onSesionActualizada?.(
            sesion,
            rolAgregado
          );

          mostrarModalExito(
            "¡Vehículo registrado!",
            "Tu vehículo fue guardado correctamente. Ahora también puedes utilizar el modo Conductor."
          );
        } else {
          mostrarModalExito(
            "Vehículo registrado",
            respuesta ||
              "El vehículo se registró correctamente y ya aparece en tu lista."
          );
        }
      }


      // ========================================================
      // EDITAR
      // ========================================================

      if (
        modoFormulario === "editar" &&
        vehiculoEditando
      ) {
        const {
          mensaje: respuesta,
          vehiculo,
        } = await actualizarVehiculo(
          vehiculoEditando.id,
          formulario
        );


        setVehiculos((anteriores) =>
          ordenarVehiculos(
            anteriores.map((vehiculoActual) =>
              vehiculoActual.id === vehiculo.id
                ? vehiculo
                : vehiculoActual
            )
          )
        );


        mostrarModalExito(
          "Vehículo actualizado",
          respuesta ||
            "Los cambios del vehículo se guardaron correctamente."
        );
      }


      // Limpiar formulario

      setModoFormulario(null);

      setVehiculoEditando(null);

      setFormulario({
        ...formularioInicial,
      });

      setErrores({});

    } catch (error) {
      mostrarMensaje(
        error.message ||
          "No fue posible guardar el vehículo.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  };


  // ============================================================
  // SOLICITAR CAMBIO DE ESTADO
  // ============================================================

  const solicitarCambioEstado = (
    vehiculo
  ) => {
    setVehiculoPendienteEstado(
      vehiculo
    );

    setModalEstadoAbierto(true);
  };


  // ============================================================
  // CERRAR MODAL ESTADO
  // ============================================================

  const cerrarModalEstado = () => {
    if (
      vehiculoPendienteEstado &&
      cambiandoEstadoId ===
        vehiculoPendienteEstado.id
    ) {
      return;
    }

    setModalEstadoAbierto(false);

    setVehiculoPendienteEstado(null);
  };


  // ============================================================
  // CONFIRMAR CAMBIO DE ESTADO
  // ============================================================

  const confirmarCambioEstado =
    async () => {
      if (!vehiculoPendienteEstado) {
        return;
      }

      const vehiculo =
        vehiculoPendienteEstado;

      const nuevoEstado =
        !vehiculo.activo;


      setMensaje("");

      setCambiandoEstadoId(
        vehiculo.id
      );


      try {
        const {
          vehiculo: actualizado,
          sesion,
        } =
          await cambiarEstadoVehiculo(
            vehiculo.id,
            nuevoEstado
          );

        if (sesion) {
          onSesionActualizada?.(
            sesion,
            nuevoEstado ? "Conductor" : "Pasajero"
          );
        }


        setVehiculos((anteriores) =>
          ordenarVehiculos(
            anteriores.map(
              (vehiculoActual) =>
                vehiculoActual.id ===
                actualizado.id
                  ? actualizado
                  : vehiculoActual
            )
          )
        );


        setModalEstadoAbierto(false);

        setVehiculoPendienteEstado(null);


        mostrarMensaje(
          actualizado.activo
            ? "Vehículo reactivado correctamente."
            : "Vehículo desactivado correctamente.",
          "exito"
        );

      } catch (error) {
        setModalEstadoAbierto(false);

        setVehiculoPendienteEstado(null);


        mostrarMensaje(
          error.message ||
            "No fue posible cambiar el estado del vehículo. Intenta nuevamente.",
          "error"
        );

      } finally {
        setCambiandoEstadoId(null);
      }
    };

  const solicitarEliminar = async (vehiculo) => {
    const confirmado = window.confirm(
      `¿Eliminar ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placas})? Si tiene viajes históricos, se conservará desactivado.`
    );
    if (!confirmado) return;

    setCambiandoEstadoId(vehiculo.id);
    setMensaje("");
    try {
      const resultado = await eliminarVehiculo(vehiculo.id);
      if (resultado.sesion && resultado.rolRetirado) {
        onSesionActualizada?.(resultado.sesion, "Pasajero");
      }
      setVehiculos((anteriores) => ordenarVehiculos(
        resultado.vehiculo
          ? anteriores.map((actual) => actual.id === vehiculo.id ? resultado.vehiculo : actual)
          : anteriores.filter((actual) => actual.id !== vehiculo.id)
      ));
      mostrarMensaje(resultado.mensaje || "Vehículo eliminado correctamente.", "exito");
    } catch (error) {
      mostrarMensaje(error.message || "No fue posible eliminar el vehículo.", "error");
    } finally {
      setCambiandoEstadoId(null);
    }
  };


  // ============================================================
  // CLASE INPUT
  // ============================================================

  const claseInput = (campo) => {
    return `
      mt-2
      h-11
      w-full
      rounded-lg
      border
      bg-white
      px-3
      text-sm
      shadow-sm
      outline-none
      transition
      ${
        errores[campo]
          ? `
            border-red-500
            focus:border-red-500
            focus:ring-2
            focus:ring-red-100
          `
          : `
            border-slate-300
            focus:border-emerald-500
            focus:ring-2
            focus:ring-emerald-100
          `
      }
    `;
  };


  // ============================================================
  // MOSTRAR ERROR
  // ============================================================

  const mostrarError = (campo) => {
    if (!errores[campo]) {
      return null;
    }

    return (
      <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle size={15} />

        {errores[campo]}
      </p>
    );
  };


  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ====================================================== */}
      {/* HEADER                                                 */}
      {/* ====================================================== */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Logo />

          <Button
            type="button"
            variant="outline"
            onClick={onBackHome}
            className="
              flex
              items-center
              gap-2
              border-slate-300
              text-slate-700
              hover:border-emerald-500
              hover:bg-emerald-50
              hover:text-emerald-700
            "
          >
            <ArrowLeft size={18} />

            Volver al menú
          </Button>

        </div>
      </header>


      {/* ====================================================== */}
      {/* CONTENIDO                                              */}
      {/* ====================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* ENCABEZADO */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2 text-emerald-700">
              <Car size={24} />

              <span className="text-sm font-semibold">
                Gestión vehicular
              </span>
            </div>


            <h1 className="text-3xl font-bold text-slate-900">
              Mis Vehículos
            </h1>


            <p className="mt-2 text-slate-600">
              Administra los vehículos que utilizas
              para tus viajes.
            </p>

          </div>


          {modoFormulario === null && (
            <Button
              type="button"
              onClick={abrirAgregar}
              disabled={
                estadoCarga !== "ok"
              }
              className="
                flex
                items-center
                gap-2
                bg-emerald-600
                text-white
                hover:bg-emerald-700
              "
            >
              <Plus size={18} />

              Agregar vehículo
            </Button>
          )}

        </div>


        {/* ====================================================== */}
        {/* MENSAJE GENERAL                                       */}
        {/* ====================================================== */}

        {mensaje && (
          <div className="mb-6">

            <AlertBanner
              type={
                tipoMensaje === "exito"
                  ? "success"
                  : "error"
              }
              message={mensaje}
            />

          </div>
        )}


        {/* ====================================================== */}
        {/* FORMULARIO                                            */}
        {/* ====================================================== */}

        {modoFormulario !== null && (
          <Card className="mb-8 overflow-hidden rounded-2xl border-slate-200 shadow-sm">

            <CardContent className="p-0">

              <div className="border-b bg-white px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

                    {modoFormulario ===
                    "agregar" ? (
                      <Plus size={22} />
                    ) : (
                      <Pencil size={21} />
                    )}

                  </div>


                  <div>

                    <h2 className="text-xl font-bold text-slate-900">
                      {modoFormulario ===
                      "agregar"
                        ? "Agregar Vehículo"
                        : "Editar Vehículo"}
                    </h2>


                    <p className="text-sm text-slate-500">
                      Completa todos los datos del vehículo.
                    </p>

                  </div>

                </div>

              </div>


              <form
                onSubmit={guardarVehiculo}
                noValidate
                className="bg-slate-50 px-6 py-6"
              >

                <div className="grid gap-5 md:grid-cols-2">


                  {/* MARCA */}

                  <div>

                    <Label
                      htmlFor="marca"
                      className="font-medium text-slate-700"
                    >
                      Marca{" "}

                      <span className="text-red-500">
                        *
                      </span>
                    </Label>


                    <Input
                      id="marca"
                      name="marca"
                      type="text"
                      value={
                        formulario.marca
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Ej. Nissan"
                      className={
                        claseInput("marca")
                      }
                    />


                    {mostrarError("marca")}

                  </div>


                  {/* MODELO */}

                  <div>

                    <Label
                      htmlFor="modelo"
                      className="font-medium text-slate-700"
                    >
                      Modelo{" "}

                      <span className="text-red-500">
                        *
                      </span>
                    </Label>


                    <Input
                      id="modelo"
                      name="modelo"
                      type="text"
                      value={
                        formulario.modelo
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Ej. Versa"
                      className={
                        claseInput("modelo")
                      }
                    />


                    {mostrarError("modelo")}

                  </div>


                  {/* AÑO */}

                  <div>

                    <Label
                      htmlFor="año"
                      className="font-medium text-slate-700"
                    >
                      Año{" "}

                      <span className="text-red-500">
                        *
                      </span>
                    </Label>


                    <Input
                      id="año"
                      name="año"
                      type="number"
                      min="1900"
                      max={
                        new Date().getFullYear() +
                        1
                      }
                      value={
                        formulario.año
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Ej. 2020"
                      className={
                        claseInput("año")
                      }
                    />


                    {mostrarError("año")}

                  </div>


                  {/* COLOR */}

                  <div>

                    <Label
                      htmlFor="color"
                      className="font-medium text-slate-700"
                    >
                      Color{" "}

                      <span className="text-red-500">
                        *
                      </span>
                    </Label>


                    <Input
                      id="color"
                      name="color"
                      type="text"
                      value={
                        formulario.color
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Ej. Blanco"
                      className={
                        claseInput("color")
                      }
                    />


                    {mostrarError("color")}

                  </div>


                  {/* PLACAS */}

                  <div>

                    <Label
                      htmlFor="placas"
                      className="font-medium text-slate-700"
                    >
                      Placas{" "}

                      <span className="text-red-500">
                        *
                      </span>
                    </Label>


                    <Input
                      id="placas"
                      name="placas"
                      type="text"
                      value={
                        formulario.placas
                      }
                      onChange={
                        manejarCambio
                      }
                      placeholder="Ej. ABC-123"
                      maxLength={15}
                      className={
                        claseInput("placas")
                      }
                    />


                    {mostrarError("placas")}

                  </div>


                  {/* ASIENTOS */}

                  <div>

                    <Label
                      htmlFor="asientos"
                      className="font-medium text-slate-700"
                    >
                      Número de asientos{" "}

                      <span className="text-red-500">
                        *
                      </span>
                    </Label>


                    <div className="relative">

                      <Users
                        size={18}
                        className="
                          absolute
                          left-3
                          top-1/2
                          mt-1
                          -translate-y-1/2
                          text-slate-400
                        "
                      />


                      <Input
                        id="asientos"
                        name="asientos"
                        type="number"
                        min="1"
                        max="50"
                        value={
                          formulario.asientos
                        }
                        onChange={
                          manejarCambio
                        }
                        placeholder="Ej. 5"
                        className={`
                          mt-2
                          h-11
                          w-full
                          rounded-lg
                          border
                          bg-white
                          pl-10
                          pr-3
                          text-sm
                          shadow-sm
                          outline-none
                          transition

                          ${
                            errores.asientos
                              ? `
                                border-red-500
                                focus:border-red-500
                                focus:ring-2
                                focus:ring-red-100
                              `
                              : `
                                border-slate-300
                                focus:border-emerald-500
                                focus:ring-2
                                focus:ring-emerald-100
                              `
                          }
                        `}
                      />

                    </div>


                    {mostrarError(
                      "asientos"
                    )}

                  </div>

                </div>


                <p className="mt-5 text-sm text-slate-500">

                  <span className="text-red-500">
                    *
                  </span>{" "}

                  Todos los campos son obligatorios.
                </p>


                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      cancelarFormulario
                    }
                    disabled={guardando}
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      border-slate-300
                      text-slate-700
                      hover:bg-slate-100
                    "
                  >
                    <X size={18} />

                    Cancelar
                  </Button>


                  <Button
                    type="submit"
                    disabled={guardando}
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      bg-emerald-600
                      text-white
                      hover:bg-emerald-700
                    "
                  >

                    {guardando ? (
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={18} />
                    )}


                    {guardando
                      ? "Guardando..."
                      : modoFormulario ===
                          "agregar"
                        ? "Guardar vehículo"
                        : "Guardar cambios"}

                  </Button>

                </div>

              </form>

            </CardContent>

          </Card>
        )}


        {/* ====================================================== */}
        {/* LISTA VEHÍCULOS                                       */}
        {/* ====================================================== */}

        {estadoCarga === "cargando" ? (

          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">

            <CardContent
              role="status"
              className="flex flex-col items-center justify-center px-6 py-16 text-center"
            >

              <LoaderCircle
                size={30}
                className="mb-4 animate-spin text-emerald-600"
              />


              <p className="text-sm text-slate-500">
                Cargando vehículos...
              </p>

            </CardContent>

          </Card>

        ) : estadoCarga === "error" ? (

          <Card className="rounded-2xl border-red-200 bg-white shadow-sm">

            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">

                <AlertCircle size={30} />

              </div>


              <h2 className="text-xl font-bold text-slate-900">
                No se pudieron cargar tus vehículos
              </h2>


              <p className="mt-2 max-w-md text-sm text-slate-500">
                {errorCarga}
              </p>


              <Button
                type="button"
                onClick={
                  reintentarCarga
                }
                className="
                  mt-6
                  flex
                  items-center
                  gap-2
                  bg-emerald-600
                  text-white
                  hover:bg-emerald-700
                "
              >
                <RefreshCw size={18} />

                Reintentar
              </Button>

            </CardContent>

          </Card>

        ) : vehiculos.length === 0 ? (

          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">

            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">

                <Car size={30} />

              </div>


              <h2 className="text-xl font-bold text-slate-900">
                No tienes vehículos registrados
              </h2>


              <p className="mt-2 max-w-md text-sm text-slate-500">
                Agrega tu primer vehículo para poder
                utilizarlo en tus viajes.
              </p>


              <Button
                type="button"
                onClick={
                  abrirAgregar
                }
                className="
                  mt-6
                  flex
                  items-center
                  gap-2
                  bg-emerald-600
                  text-white
                  hover:bg-emerald-700
                "
              >
                <Plus size={18} />

                Agregar vehículo
              </Button>

            </CardContent>

          </Card>

        ) : (

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {vehiculos.map(
              (vehiculo) => (

                <Card
                  key={vehiculo.id}
                  className="
                    overflow-hidden
                    rounded-2xl
                    border-slate-200
                    bg-white
                    shadow-sm
                    transition
                    hover:shadow-md
                  "
                >

                  <CardContent className="p-0">


                    {/* CABECERA VEHÍCULO */}

                    <div
                      className={`
                        flex
                        items-center
                        gap-4
                        border-b
                        px-5
                        py-5

                        ${
                          vehiculo.activo
                            ? "bg-emerald-50"
                            : "bg-slate-100 opacity-60"
                        }
                      `}
                    >

                      <div
                        className={`
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-xl

                          ${
                            vehiculo.activo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-500"
                          }
                        `}
                      >

                        <Car size={24} />

                      </div>


                      <div className="flex-1">

                        <h2 className="font-bold text-slate-900">
                          {vehiculo.marca}
                        </h2>


                        <p className="text-sm text-slate-600">
                          {vehiculo.modelo}
                        </p>

                      </div>


                      <span
                        className={`
                          rounded-full
                          px-2.5
                          py-1
                          text-xs
                          font-semibold

                          ${
                            vehiculo.activo
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }
                        `}
                      >
                        {vehiculo.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>

                    </div>


                    {/* INFORMACIÓN */}

                    <div
                      className={`
                        space-y-4
                        px-5
                        py-5

                        ${
                          vehiculo.activo
                            ? ""
                            : "opacity-60"
                        }
                      `}
                    >

                      <div className="flex justify-between gap-4">

                        <span className="text-sm text-slate-500">
                          Año
                        </span>


                        <span className="text-sm font-semibold text-slate-900">
                          {vehiculo.año}
                        </span>

                      </div>


                      <div className="flex justify-between gap-4">

                        <span className="text-sm text-slate-500">
                          Color
                        </span>


                        <span className="text-sm font-semibold text-slate-900">
                          {vehiculo.color}
                        </span>

                      </div>


                      <div className="flex justify-between gap-4">

                        <span className="text-sm text-slate-500">
                          Placas
                        </span>


                        <span className="text-sm font-semibold uppercase text-slate-900">
                          {vehiculo.placas}
                        </span>

                      </div>


                      <div className="flex justify-between gap-4">

                        <span className="text-sm text-slate-500">
                          Asientos
                        </span>


                        <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">

                          <Users size={16} />

                          {vehiculo.asientos}

                        </span>

                      </div>

                    </div>


                    {/* BOTONES */}

                    <div className="flex gap-3 border-t bg-slate-50 px-5 py-4">

                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          cambiandoEstadoId ===
                          vehiculo.id
                        }
                        onClick={() =>
                          abrirEditar(
                            vehiculo
                          )
                        }
                        className="
                          flex
                          flex-1
                          items-center
                          justify-center
                          gap-2
                          border-emerald-200
                          text-emerald-700
                          hover:bg-emerald-50
                        "
                      >

                        <Pencil size={17} />

                        Editar
                      </Button>


                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          cambiandoEstadoId ===
                          vehiculo.id
                        }
                        onClick={() =>
                          solicitarCambioEstado(
                            vehiculo
                          )
                        }
                        className={`
                          flex
                          flex-1
                          items-center
                          justify-center
                          gap-2

                          ${
                            vehiculo.activo
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }
                        `}
                      >

                        {cambiandoEstadoId ===
                        vehiculo.id ? (

                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />

                        ) : vehiculo.activo ? (

                          <PowerOff
                            size={17}
                          />

                        ) : (

                          <Power size={17} />

                        )}


                        {cambiandoEstadoId ===
                        vehiculo.id
                          ? vehiculo.activo
                            ? "Desactivando..."
                            : "Reactivando..."
                          : vehiculo.activo
                            ? "Desactivar"
                            : "Reactivar"}

                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Eliminar ${vehiculo.marca} ${vehiculo.modelo}`}
                        title="Eliminar vehículo"
                        disabled={cambiandoEstadoId === vehiculo.id}
                        onClick={() => solicitarEliminar(vehiculo)}
                        className="flex flex-1 items-center justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {cambiandoEstadoId === vehiculo.id ? (
                          <LoaderCircle size={17} className="animate-spin" />
                        ) : (
                          <Trash2 size={17} />
                        )}
                        Eliminar
                      </Button>

                    </div>

                  </CardContent>

                </Card>

              )
            )}

          </div>

        )}

      </main>


      {/* ====================================================== */}
      {/* MODAL DE ÉXITO                                        */}
      {/* ====================================================== */}

      {modalExitoAbierto && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">

              <Car size={30} />

            </div>


            <div className="mt-5 text-center">

              <p className="text-xs font-bold tracking-widest text-emerald-600">
                OPERACIÓN EXITOSA
              </p>


              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                {tituloExito}
              </h2>


              <p className="mt-3 text-sm leading-6 text-slate-600">
                {descripcionExito}
              </p>

            </div>


            <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">

              <p className="text-center text-sm text-emerald-800">
                La lista de vehículos se actualizó automáticamente.
              </p>

            </div>


            <Button
              type="button"
              onClick={() =>
                setModalExitoAbierto(false)
              }
              className="
                mt-6
                w-full
                bg-emerald-600
                text-white
                hover:bg-emerald-700
              "
            >
              Entendido
            </Button>

          </div>

        </div>

      )}


      {/* ====================================================== */}
      {/* MODAL CAMBIO DE ESTADO                                */}
      {/* ====================================================== */}

      {modalEstadoAbierto &&
        vehiculoPendienteEstado && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">


              <div
                className={`
                  mb-4
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-full

                  ${
                    vehiculoPendienteEstado.activo
                      ? "bg-red-100 text-red-600"
                      : "bg-emerald-100 text-emerald-700"
                  }
                `}
              >

                {vehiculoPendienteEstado.activo ? (

                  <PowerOff size={26} />

                ) : (

                  <Power size={26} />

                )}

              </div>


              <h2 className="text-xl font-bold text-slate-900">

                {vehiculoPendienteEstado.activo
                  ? "Desactivar vehículo"
                  : "Reactivar vehículo"}

              </h2>


              <p className="mt-3 text-sm leading-6 text-slate-600">

                {vehiculoPendienteEstado.activo
                  ? `¿Seguro que deseas desactivar ${vehiculoPendienteEstado.marca} ${vehiculoPendienteEstado.modelo} (${vehiculoPendienteEstado.placas})? No podrás usarlo en nuevos viajes hasta reactivarlo.`
                  : `¿Deseas reactivar ${vehiculoPendienteEstado.marca} ${vehiculoPendienteEstado.modelo} (${vehiculoPendienteEstado.placas})?`}

              </p>


              <div className="mt-6 flex justify-end gap-3">

                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    cerrarModalEstado
                  }
                  disabled={
                    cambiandoEstadoId ===
                    vehiculoPendienteEstado.id
                  }
                >
                  Cancelar
                </Button>


                <Button
                  type="button"
                  onClick={
                    confirmarCambioEstado
                  }
                  disabled={
                    cambiandoEstadoId ===
                    vehiculoPendienteEstado.id
                  }
                  className={
                    vehiculoPendienteEstado.activo
                      ? `
                        flex
                        items-center
                        gap-2
                        bg-red-600
                        text-white
                        hover:bg-red-700
                      `
                      : `
                        flex
                        items-center
                        gap-2
                        bg-emerald-600
                        text-white
                        hover:bg-emerald-700
                      `
                  }
                >

                  {cambiandoEstadoId ===
                  vehiculoPendienteEstado.id ? (

                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />

                      Procesando...
                    </>

                  ) : vehiculoPendienteEstado.activo ? (

                    <>
                      <PowerOff
                        size={18}
                      />

                      Desactivar
                    </>

                  ) : (

                    <>
                      <Power size={18} />

                      Reactivar
                    </>

                  )}

                </Button>

              </div>

            </div>

          </div>

        )}


      {/* ====================================================== */}
      {/* FOOTER                                                 */}
      {/* ====================================================== */}

      <Footer />

    </div>
  );
}