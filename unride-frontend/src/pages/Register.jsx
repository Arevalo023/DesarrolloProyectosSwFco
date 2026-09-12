import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Car } from "lucide-react";

const API_URL = "http://localhost:3000";

const campusOptions = [
  { value: 1, label: "Campus Arteaga" },
  { value: 2, label: "Campus Poniente" },
  { value: 3, label: "Campus Central" },
];

export default function Register({ onBackToLogin }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [campus_id, setCampusId] = useState(1);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEducationalEmail = (value) => /@.+\.edu\.mx$/i.test(value.trim());
  const isValidPhone = (value) => /^\d{3}-\d{3}-\d{4}$/.test(value.trim());
  const isValidPassword = (value) => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!nombre.trim() || nombre.trim().length < 2) {
      setError("El nombre es obligatorio y debe tener al menos 2 caracteres");
      return;
    }

    if (!apellido.trim() || apellido.trim().length < 2) {
      setError("El apellido es obligatorio y debe tener al menos 2 caracteres");
      return;
    }

    if (!isValidEducationalEmail(correo)) {
      setError("Usa un correo con dominio educativo .edu.mx");
      return;
    }

    if (telefono && !isValidPhone(telefono)) {
      setError("El teléfono debe tener el formato xxx-xxx-xxxx");
      return;
    }

    if (!isValidPassword(password)) {
      setError("La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          correo,
          password,
          telefono: telefono || null,
          campus_id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "No se pudo crear la cuenta");
      }

      onBackToLogin();
    } catch (registrationError) {
      setError(registrationError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 p-4"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(15, 23, 42, 0.74), rgba(6, 78, 59, 0.42)), url('/uniride-carpooling.jpg')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Car className="text-emerald-600" size={48} />
            <h1 className="text-xl font-bold !text-black" style={{ margin: 0 }}>
              Uni <span className="text-emerald-600">Ride</span>
            </h1>
          </div>
          <p
            className="text-center text-sm text-slate-500"
            style={{ marginBottom: "1.5rem" }}
          >
            Crea tu cuenta universitaria
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-slate-500 tracking-wide">
                  NOMBRE
                </Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apellido" className="text-xs font-semibold text-slate-500 tracking-wide">
                  APELLIDO
                </Label>
                <Input
                  id="apellido"
                  type="text"
                  placeholder="Tu apellido"
                  value={apellido}
                  onChange={(event) => setApellido(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-xs font-semibold text-slate-500 tracking-wide">
                CORREO INSTITUCIONAL
              </Label>
              <Input
                id="register-email"
                type="email"
                placeholder="estudiante@universidad.edu.mx"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefono" className="text-xs font-semibold text-slate-500 tracking-wide">
                TELÉFONO (OPCIONAL)
              </Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="844-123-4567"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
              />
            </div>

            <div>
              <div className="space-y-1.5">
                <Label htmlFor="campus_id" className="text-xs font-semibold text-slate-500 tracking-wide">
                  CAMPUS
                </Label>
                <select
                  id="campus_id"
                  value={campus_id}
                  onChange={(event) => setCampusId(Number(event.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {campusOptions.map((campus) => (
                    <option key={campus.value} value={campus.value}>
                      {campus.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-xs font-semibold text-slate-500 tracking-wide">
                CONTRASEÑA
              </Label>
              <Input
                id="register-password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-500 tracking-wide">
                CONFIRMAR CONTRASEÑA
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {loading ? (
                "Creando cuenta..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Registrarme <ArrowRight size={16} />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1 text-emerald-600 font-medium hover:underline"
            >
              <ArrowLeft size={14} /> Inicia sesión
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}