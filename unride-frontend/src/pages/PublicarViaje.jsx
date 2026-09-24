import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

const API_URL = "http://localhost:3000";

const formularioInicial = {
  vehiculo_id: "",
  origen: "",
  destino: "",
  fecha: "",
  hora: "",
  precio: "",
  asientos: "",
};

export default function PublicarViaje({ onBackHome, onPublished }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const cargarVehiculos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/vehicles/user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "No se pudieron cargar los vehículos.");
        }

        const vehiculosActivos = (data.vehicles || []).filter(
          (vehiculo) => vehiculo.activo === true || vehiculo.activo === 1 || vehiculo.activo === undefined
        );

        setVehiculos(vehiculosActivos);
        setFormulario((actual) => ({
          ...actual,
          vehiculo_id: vehiculosActivos[0]?.id?.toString() || "",
        }));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setCargandoVehiculos(false);
      }
    };

    cargarVehiculos();
  }, []);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setError("");
    setMensaje("");
  };

  const publicarViaje = async (event) => {
    event.preventDefault();
    setEnviando(true);
    setError("");
    setMensaje("");

    try {
      const response = await fetch(`${API_URL}/api/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          vehiculo_id: Number(formulario.vehiculo_id),
          origen: formulario.origen.trim(),
          destino: formulario.destino.trim(),
          fecha_salida: `${formulario.fecha}T${formulario.hora}`,
          costo_por_pasajero: Number(formulario.precio),
          cupo_disponible: Number(formulario.asientos),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo publicar el viaje.");
      }

      setMensaje("Viaje publicado correctamente.");
      window.setTimeout(onPublished, 700);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-slate-900">
      <nav className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <Button type="button" variant="outline" onClick={onBackHome}>
            <ArrowLeft size={16} />
            Volver al inicio
          </Button>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12 md:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold tracking-widest text-emerald-600">
              PUBLICAR VIAJE
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Comparte tu próxima ruta
            </h1>
            <p className="mt-3 text-slate-500">
              Completa los datos del trayecto para que otros estudiantes puedan encontrarlo.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={publicarViaje} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="vehiculo_id" className="flex items-center gap-2">
                    <Car size={16} className="text-emerald-600" />
                    Vehículo
                  </Label>
                  <select
                    id="vehiculo_id"
                    name="vehiculo_id"
                    value={formulario.vehiculo_id}
                    onChange={actualizarCampo}
                    required
                    disabled={cargandoVehiculos || vehiculos.length === 0}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">
                      {cargandoVehiculos ? "Cargando vehículos..." : "Selecciona un vehículo activo"}
                    </option>
                    {vehiculos.map((vehiculo) => (
                      <option key={vehiculo.id} value={vehiculo.id}>
                        {vehiculo.marca} {vehiculo.modelo} · {vehiculo.placa}
                      </option>
                    ))}
                  </select>
                  {!cargandoVehiculos && vehiculos.length === 0 && (
                    <p className="text-sm text-amber-700">
                      No tienes vehículos activos disponibles para publicar.
                    </p>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="origen" className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-600" />
                      Origen
                    </Label>
                    <Input id="origen" name="origen" value={formulario.origen} onChange={actualizarCampo} placeholder="¿Desde dónde sales?" required minLength={2} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destino" className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-600" />
                      Destino
                    </Label>
                    <Input id="destino" name="destino" value={formulario.destino} onChange={actualizarCampo} placeholder="¿A dónde llegas?" required minLength={2} />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fecha" className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-emerald-600" />
                      Fecha
                    </Label>
                    <Input id="fecha" name="fecha" type="date" value={formulario.fecha} onChange={actualizarCampo} required min={new Date().toISOString().split("T")[0]} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora" className="flex items-center gap-2">
                      <Clock3 size={16} className="text-emerald-600" />
                      Hora de salida
                    </Label>
                    <Input id="hora" name="hora" type="time" value={formulario.hora} onChange={actualizarCampo} required />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="precio" className="flex items-center gap-2">
                      <DollarSign size={16} className="text-emerald-600" />
                      Precio por pasajero
                    </Label>
                    <Input id="precio" name="precio" type="number" min="0" step="0.01" value={formulario.precio} onChange={actualizarCampo} placeholder="0.00" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asientos" className="flex items-center gap-2">
                      <Users size={16} className="text-emerald-600" />
                      Asientos disponibles
                    </Label>
                    <Input id="asientos" name="asientos" type="number" min="1" step="1" value={formulario.asientos} onChange={actualizarCampo} placeholder="1" required />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {mensaje && (
                  <div className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <span>{mensaje}</span>
                  </div>
                )}

                <Button type="submit" disabled={enviando || cargandoVehiculos || vehiculos.length === 0} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                  {enviando ? "Publicando..." : "Publicar viaje"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}