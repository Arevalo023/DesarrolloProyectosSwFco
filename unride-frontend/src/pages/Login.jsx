import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, ArrowRight } from "lucide-react";

const API_URL = "http://localhost:3000";

export default function Login({ onRegister, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidInstitutionalEmail = (value) => {
    const normalized = value.trim().toLowerCase();
    return /@.+\.edu\.mx$/.test(normalized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValidInstitutionalEmail(email)) {
      setError("Usa tu correo institucional con dominio .edu.mx");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Credenciales incorrectas");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.user));
      onLogin(data);
    } catch (err) {
      setError(err.message);
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
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Car className="text-emerald-600" size={48} />
            <h1 className="text-xl font-bold text-black!" style={{ margin: 0 }}>
              Uni<span className="text-emerald-600">Ride</span>
            </h1>
          </div>
          <p
            className="text-center text-sm text-slate-500"
            style={{ marginBottom: "1.5rem" }}
          >
            Inicia sesión con tu correo universitario
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-slate-500 tracking-wide"
              >
                CORREO INSTITUCIONAL
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="estudiante@uadec.edu.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-slate-500 tracking-wide"
              >
                CONTRASEÑA
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <Checkbox
                  checked={remember}
                  onCheckedChange={setRemember}
                />
                Recordarme
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium mb-5"
            >
              {loading ? (
                "Ingresando..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Iniciar Sesión <ArrowRight size={16} />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿No tienes cuenta?{" "}
            <button
              type="button"
              onClick={onRegister}
              className="text-emerald-600 font-medium hover:underline"
            >
              Regístrate aquí
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}