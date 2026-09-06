import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Car } from "lucide-react";

const API_URL = "http://localhost:3000";

export default function Register({ onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.endsWith("@universidad.edu")) {
      setError("Usa tu correo institucional (@universidad.edu)");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
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
        body: JSON.stringify({ name, email, password }),
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm shadow-lg">
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
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-semibold text-slate-500 tracking-wide"
              >
                NOMBRE COMPLETO
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="register-email"
                className="text-xs font-semibold text-slate-500 tracking-wide"
              >
                CORREO INSTITUCIONAL
              </Label>
              <Input
                id="register-email"
                type="email"
                placeholder="estudiante@universidad.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="register-password"
                className="text-xs font-semibold text-slate-500 tracking-wide"
              >
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
              <Label
                htmlFor="confirm-password"
                className="text-xs font-semibold text-slate-500 tracking-wide"
              >
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