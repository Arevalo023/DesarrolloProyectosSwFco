import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

import {
  Car,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| DATOS DE PRUEBA
|--------------------------------------------------------------------------
| Estos datos son temporales mientras el backend no esté conectado.
|--------------------------------------------------------------------------
*/

const vehiculosIniciales = [
  {
    id: 1,
    marca: "Nissan",
    modelo: "Versa",
    año: "2020",
    color: "Blanco",
    placas: "ABC-123",
    asientos: "5",
  },
];

/*
|--------------------------------------------------------------------------
| FORMULARIO INICIAL
|--------------------------------------------------------------------------
*/

const formularioInicial = {
  marca: "",
  modelo: "",
  año: "",
  color: "",
  placas: "",
  asientos: "",
};

export default function Vehiculos({ onBackHome }) {
  /*
  |--------------------------------------------------------------------------
  | ESTADOS
  |--------------------------------------------------------------------------
  */

  const [vehiculos, setVehiculos] = useState(vehiculosIniciales);

  const [modoFormulario, setModoFormulario] = useState(null);

  const [vehiculoEditando, setVehiculoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    ...formularioInicial,
  });

  const [errores, setErrores] = useState({});

  const [mensaje, setMensaje] = useState("");

  /*
  |--------------------------------------------------------------------------
  | ABRIR FORMULARIO PARA AGREGAR
  |--------------------------------------------------------------------------
  */

  const abrirAgregar = () => {
    setModoFormulario("agregar");

    setVehiculoEditando(null);

    setFormulario({
      ...formularioInicial,
    });

    setErrores({});

    setMensaje("");
  };

  /*
  |--------------------------------------------------------------------------
  | ABRIR FORMULARIO PARA EDITAR
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | CANCELAR FORMULARIO
  |--------------------------------------------------------------------------
  */

  const cancelarFormulario = () => {
    setModoFormulario(null);

    setVehiculoEditando(null);

    setFormulario({
      ...formularioInicial,
    });

    setErrores({});

    setMensaje("");
  };

  /*
  |--------------------------------------------------------------------------
  | CAMBIAR VALOR DE LOS CAMPOS
  |--------------------------------------------------------------------------
  */

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    /*
    | Si el usuario corrige un campo,
    | eliminamos su mensaje de error.
    */

    if (errores[name]) {
      setErrores((anteriores) => ({
        ...anteriores,
        [name]: "",
      }));
    }

    setMensaje("");
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDAR FORMULARIO
  |--------------------------------------------------------------------------
  */

  const validarFormulario = () => {
    const nuevosErrores = {};

    /*
    |--------------------------------------------------------------------------
    | MARCA
    |--------------------------------------------------------------------------
    */

    if (!formulario.marca.trim()) {
      nuevosErrores.marca =
        "La marca es obligatoria.";
    } else if (formulario.marca.trim().length < 2) {
      nuevosErrores.marca =
        "La marca debe tener al menos 2 caracteres.";
    }

    /*
    |--------------------------------------------------------------------------
    | MODELO
    |--------------------------------------------------------------------------
    */

    if (!formulario.modelo.trim()) {
      nuevosErrores.modelo =
        "El modelo es obligatorio.";
    } else if (formulario.modelo.trim().length < 2) {
      nuevosErrores.modelo =
        "El modelo debe tener al menos 2 caracteres.";
    }

    /*
    |--------------------------------------------------------------------------
    | AÑO
    |--------------------------------------------------------------------------
    */

    if (!formulario.año) {
      nuevosErrores.año =
        "El año es obligatorio.";
    } else {
      const año = Number(formulario.año);

      const añoActual = new Date().getFullYear();

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

    /*
    |--------------------------------------------------------------------------
    | COLOR
    |--------------------------------------------------------------------------
    */

    if (!formulario.color.trim()) {
      nuevosErrores.color =
        "El color es obligatorio.";
    } else if (formulario.color.trim().length < 3) {
      nuevosErrores.color =
        "El color debe tener al menos 3 caracteres.";
    }

    /*
    |--------------------------------------------------------------------------
    | PLACAS
    |--------------------------------------------------------------------------
    */

    if (!formulario.placas.trim()) {
      nuevosErrores.placas =
        "Las placas son obligatorias.";
    } else if (
      formulario.placas.trim().length < 3
    ) {
      nuevosErrores.placas =
        "Las placas deben tener al menos 3 caracteres.";
    }

    /*
    |--------------------------------------------------------------------------
    | ASIENTOS
    |--------------------------------------------------------------------------
    */

    if (!formulario.asientos) {
      nuevosErrores.asientos =
        "El número de asientos es obligatorio.";
    } else {
      const asientos = Number(
        formulario.asientos
      );

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

    /*
    |--------------------------------------------------------------------------
    | GUARDAR ERRORES
    |--------------------------------------------------------------------------
    */

    setErrores(nuevosErrores);

    return (
      Object.keys(nuevosErrores).length === 0
    );
  };

  /*
  |--------------------------------------------------------------------------
  | GUARDAR VEHÍCULO
  |--------------------------------------------------------------------------
  */

  const guardarVehiculo = (e) => {
    e.preventDefault();

    setMensaje("");

    /*
    | Validamos antes de guardar.
    */

    const formularioValido =
      validarFormulario();

    /*
    | Si hay errores, no continuamos.
    */

    if (!formularioValido) {
      setMensaje(
        "Revisa los campos marcados antes de continuar."
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | AGREGAR
    |--------------------------------------------------------------------------
    */

    if (modoFormulario === "agregar") {
      const nuevoVehiculo = {
        id: Date.now(),

        marca: formulario.marca.trim(),

        modelo: formulario.modelo.trim(),

        año: formulario.año,

        color: formulario.color.trim(),

        placas: formulario.placas
          .trim()
          .toUpperCase(),

        asientos: formulario.asientos,
      };

      setVehiculos((anteriores) => [
        ...anteriores,
        nuevoVehiculo,
      ]);

      setMensaje(
        "Vehículo agregado correctamente."
      );

      setModoFormulario(null);

      setVehiculoEditando(null);

      setFormulario({
        ...formularioInicial,
      });

      setErrores({});

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | EDITAR
    |--------------------------------------------------------------------------
    */

    if (
      modoFormulario === "editar" &&
      vehiculoEditando
    ) {
      const vehiculoActualizado = {
        ...vehiculoEditando,

        marca: formulario.marca.trim(),

        modelo: formulario.modelo.trim(),

        año: formulario.año,

        color: formulario.color.trim(),

        placas: formulario.placas
          .trim()
          .toUpperCase(),

        asientos: formulario.asientos,
      };

      setVehiculos((anteriores) =>
        anteriores.map((vehiculo) =>
          vehiculo.id === vehiculoEditando.id
            ? vehiculoActualizado
            : vehiculo
        )
      );

      setMensaje(
        "Vehículo actualizado correctamente."
      );

      setModoFormulario(null);

      setVehiculoEditando(null);

      setFormulario({
        ...formularioInicial,
      });

      setErrores({});
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ELIMINAR VEHÍCULO
  |--------------------------------------------------------------------------
  */

  const eliminarVehiculo = (id) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar este vehículo?"
    );

    if (!confirmar) {
      return;
    }

    setVehiculos((anteriores) =>
      anteriores.filter(
        (vehiculo) => vehiculo.id !== id
      )
    );

    setMensaje(
      "Vehículo eliminado correctamente."
    );
  };

  /*
  |--------------------------------------------------------------------------
  | CLASE DE LOS INPUTS
  |--------------------------------------------------------------------------
  */

  const claseInput = (campo) => {
    return `mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-sm outline-none transition ${
      errores[campo]
        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    }`;
  };

  /*
  |--------------------------------------------------------------------------
  | MOSTRAR ERROR
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | INTERFAZ
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Logo />

          <Button
            type="button"
            variant="outline"
            onClick={onBackHome}
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ArrowLeft size={18} />

            Volver al menú
          </Button>

        </div>
      </header>

      {/* ================================================================ */}
      {/* CONTENIDO PRINCIPAL                                              */}
      {/* ================================================================ */}

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* ============================================================ */}
        {/* ENCABEZADO                                                     */}
        {/* ============================================================ */}

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
              className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus size={18} />

              Agregar vehículo
            </Button>
          )}

        </div>

        {/* ============================================================ */}
        {/* MENSAJE GENERAL                                               */}
        {/* ============================================================ */}

        {mensaje && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
              mensaje.includes("correctamente")
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >

            {mensaje.includes("correctamente") ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}

            <span>
              {mensaje}
            </span>

          </div>
        )}

        {/* ============================================================ */}
        {/* FORMULARIO                                                    */}
        {/* ============================================================ */}

        {modoFormulario !== null && (
          <Card className="mb-8 overflow-hidden rounded-2xl border-slate-200 shadow-sm">

            <CardContent className="p-0">

              {/* ------------------------------------------------------ */}
              {/* ENCABEZADO                                             */}
              {/* ------------------------------------------------------ */}

              <div className="border-b bg-white px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

                    {modoFormulario === "agregar" ? (
                      <Plus size={22} />
                    ) : (
                      <Pencil size={21} />
                    )}

                  </div>

                  <div>

                    <h2 className="text-xl font-bold text-slate-900">

                      {modoFormulario === "agregar"
                        ? "Agregar Vehículo"
                        : "Editar Vehículo"}

                    </h2>

                    <p className="text-sm text-slate-500">
                      Completa todos los datos del vehículo.
                    </p>

                  </div>

                </div>

              </div>

              {/* ------------------------------------------------------ */}
              {/* FORMULARIO                                             */}
              {/* ------------------------------------------------------ */}

              <form
                onSubmit={guardarVehiculo}
                noValidate
                className="bg-slate-50 px-6 py-6"
              >

                <div className="grid gap-5 md:grid-cols-2">

                  {/* ================================================== */}
                  {/* MARCA                                               */}
                  {/* ================================================== */}

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
                      value={formulario.marca}
                      onChange={manejarCambio}
                      placeholder="Ej. Nissan"
                      className={claseInput("marca")}
                    />

                    {mostrarError("marca")}

                  </div>

                  {/* ================================================== */}
                  {/* MODELO                                              */}
                  {/* ================================================== */}

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
                      value={formulario.modelo}
                      onChange={manejarCambio}
                      placeholder="Ej. Versa"
                      className={claseInput("modelo")}
                    />

                    {mostrarError("modelo")}

                  </div>

                  {/* ================================================== */}
                  {/* AÑO                                                  */}
                  {/* ================================================== */}

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
                      max={new Date().getFullYear() + 1}
                      value={formulario.año}
                      onChange={manejarCambio}
                      placeholder="Ej. 2020"
                      className={claseInput("año")}
                    />

                    {mostrarError("año")}

                  </div>

                  {/* ================================================== */}
                  {/* COLOR                                                */}
                  {/* ================================================== */}

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
                      value={formulario.color}
                      onChange={manejarCambio}
                      placeholder="Ej. Blanco"
                      className={claseInput("color")}
                    />

                    {mostrarError("color")}

                  </div>

                  {/* ================================================== */}
                  {/* PLACAS                                               */}
                  {/* ================================================== */}

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
                      value={formulario.placas}
                      onChange={manejarCambio}
                      placeholder="Ej. ABC-123"
                      maxLength={15}
                      className={claseInput("placas")}
                    />

                    {mostrarError("placas")}

                  </div>

                  {/* ================================================== */}
                  {/* ASIENTOS                                             */}
                  {/* ================================================== */}

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
                        className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400"
                      />

                      <Input
                        id="asientos"
                        name="asientos"
                        type="number"
                        min="1"
                        max="50"
                        value={formulario.asientos}
                        onChange={manejarCambio}
                        placeholder="Ej. 5"
                        className={`mt-2 h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition ${
                          errores.asientos
                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                            : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        }`}
                      />

                    </div>

                    {mostrarError("asientos")}

                  </div>

                </div>

                {/* ==================================================== */}
                {/* NOTA                                                  */}
                {/* ==================================================== */}

                <p className="mt-5 text-sm text-slate-500">
                  <span className="text-red-500">*</span>{" "}
                  Todos los campos son obligatorios.
                </p>

                {/* ==================================================== */}
                {/* BOTONES                                                */}
                {/* ==================================================== */}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelarFormulario}
                    className="flex items-center justify-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <X size={18} />

                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Save size={18} />

                    {modoFormulario === "agregar"
                      ? "Guardar vehículo"
                      : "Guardar cambios"}

                  </Button>

                </div>

              </form>

            </CardContent>

          </Card>
        )}

        {/* ============================================================ */}
        {/* LISTA DE VEHÍCULOS                                            */}
        {/* ============================================================ */}

        {vehiculos.length === 0 ? (

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
                onClick={abrirAgregar}
                className="mt-6 flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus size={18} />

                Agregar vehículo
              </Button>

            </CardContent>

          </Card>

        ) : (

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {vehiculos.map((vehiculo) => (

              <Card
                key={vehiculo.id}
                className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >

                <CardContent className="p-0">

                  {/* -------------------------------------------------- */}
                  {/* ENCABEZADO                                           */}
                  {/* -------------------------------------------------- */}

                  <div className="flex items-center gap-4 border-b bg-emerald-50 px-5 py-5">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

                      <Car size={24} />

                    </div>

                    <div>

                      <h2 className="font-bold text-slate-900">
                        {vehiculo.marca}
                      </h2>

                      <p className="text-sm text-slate-600">
                        {vehiculo.modelo}
                      </p>

                    </div>

                  </div>

                  {/* -------------------------------------------------- */}
                  {/* INFORMACIÓN                                         */}
                  {/* -------------------------------------------------- */}

                  <div className="space-y-4 px-5 py-5">

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

                  {/* -------------------------------------------------- */}
                  {/* BOTONES                                              */}
                  {/* -------------------------------------------------- */}

                  <div className="flex gap-3 border-t bg-slate-50 px-5 py-4">

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        abrirEditar(vehiculo)
                      }
                      className="flex flex-1 items-center justify-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Pencil size={17} />

                      Editar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        eliminarVehiculo(vehiculo.id)
                      }
                      className="flex flex-1 items-center justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={17} />

                      Eliminar
                    </Button>

                  </div>

                </CardContent>

              </Card>

            ))}

          </div>

        )}

      </main>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}

      <Footer />

    </div>
  );
}