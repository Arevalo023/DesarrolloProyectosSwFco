import { useEffect } from "react";
import Login from "@/pages/Login";

const normalizarRoles = (roles) => {
  if (Array.isArray(roles)) return roles;
  return roles ? [roles] : [];
};

const hasAllowedRole = (user, allowedRoles) => {
  const userRoles = normalizarRoles(user.roles || user.rol)
    .map((role) => String(role).trim().toLowerCase());
  return allowedRoles.some((role) =>
    userRoles.includes(String(role).trim().toLowerCase())
  );
};

export default function ProtectedRoute({
  children,
  allowedRoles,
  onUnauthorized,
}) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("usuario");
  const user = (() => {
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  })();

  const autorizado = Boolean(
    token &&
      user &&
      (!allowedRoles?.length || hasAllowedRole(user, allowedRoles))
  );

  useEffect(() => {
    if (!autorizado) onUnauthorized?.();
  }, [autorizado, onUnauthorized]);

  if (!token || !user) {
    return <Login onRegister={() => {}} onLogin={() => {}} />;
  }

  if (allowedRoles?.length && !hasAllowedRole(user, allowedRoles)) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Acceso restringido
        </h1>
        <p className="mt-2 text-slate-600">
          No tienes permisos para consultar esta sección.
        </p>
      </main>
    );
  }

  return children;
}