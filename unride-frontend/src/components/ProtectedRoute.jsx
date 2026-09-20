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

    useEffect(() => {
      if (!token || !user || (allowedRoles?.length && !hasAllowedRole(user, allowedRoles))) {
        onUnauthorized?.();
      }
    }, [allowedRoles, onUnauthorized, token, user]);

  if (!token || !user) {
    return <Login onRegister={() => {}} onLogin={() => {}} />;
  }

    if (allowedRoles?.length && !hasAllowedRole(user, allowedRoles)) {
      return null;
  }

  return children;
}