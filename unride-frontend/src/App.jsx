import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Vehiculos from "./pages/Vehiculos";
import Register from "./pages/Register";
import PublicarViaje from "./pages/PublicarViaje";
import MisViajes from "./pages/MisViajes";
import ViajesCancelados from "./pages/ViajesCancelados";
import ViajesCompletados from "./pages/ViajesCompletados";
import ResumenReserva from "./pages/ResumenReserva";
import Notificaciones from "./pages/Notificaciones";
import MisSolicitudes from "./pages/MisReservaciones";
import Calificaciones from "./pages/Calificaciones";
import Administracion from "./pages/Administracion";

import {
  cerrarSesion,
  guardarRolActivo,
  iniciarSesion,
  mismoRol,
  obtenerToken,
  obtenerUsuario,
  obtenerRolActivo,
  rolPrincipal,
  rolesDe,
} from "./services/session";

const esAdministrador = (usuario) =>
  rolesDe(usuario).some((rol) => mismoRol(rol, "Administrador"));

function App() {
  // ============================================================
  // ESTADOS PRINCIPALES
  // ============================================================

  const [pantalla, setPantalla] = useState(() =>
    obtenerToken() && obtenerUsuario()
      ? esAdministrador(obtenerUsuario()) || window.location.pathname.replace(/\/$/, "") === "/administracion"
        ? "administracion"
        : "home"
      : "login"
  );
  const [usuario, setUsuario] = useState(() => obtenerUsuario());

  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);

  const [rolActivo, setRolActivo] = useState(() => {
    const usuarioGuardado = obtenerUsuario();
    const rolGuardado = obtenerRolActivo();

    return (
      rolesDe(usuarioGuardado).find((rol) =>
        mismoRol(rol, rolGuardado)
      ) || rolPrincipal(usuarioGuardado)
    );
  });

  const [sesionExpirada, setSesionExpirada] = useState(false);

  // Mantener sincronizada la pantalla con la URL al usar Atrás/Adelante.
  useEffect(() => {
    const sincronizarRuta = () => {
      const rutaAdmin = window.location.pathname.replace(/\/$/, "") === "/administracion";
      const usuarioActual = obtenerUsuario();
      const tieneSesion = Boolean(obtenerToken() && usuarioActual);

      if (tieneSesion && esAdministrador(usuarioActual)) {
        if (!rutaAdmin) window.history.replaceState({}, "", "/administracion");
        setPantalla("administracion");
        return;
      }

      if (rutaAdmin && tieneSesion) {
        window.history.replaceState({}, "", "/");
      }
      setPantalla(tieneSesion ? "home" : "login");
    };
    sincronizarRuta();
    window.addEventListener("popstate", sincronizarRuta);
    return () => window.removeEventListener("popstate", sincronizarRuta);
  }, []);

  const abrirAdministracion = () => {
    if (!rolesDe(usuario).some((rol) => mismoRol(rol, "Administrador"))) return;
    window.history.pushState({}, "", "/administracion");
    setPantalla("administracion");
  };

  const volverDeAdministracion = () => {
    window.history.pushState({}, "", "/");
    setPantalla("home");
  };

  // ============================================================
  // EVENTOS DE SESIÓN
  // ============================================================

  useEffect(() => {
    const alExpirarSesion = () => {
      setUsuario(null);
      setRolActivo(null);
      setViajeSeleccionado(null);
      setSesionExpirada(true);
      setPantalla("login");
    };

    const alReiniciarRol = (event) => {
      const usuarioActual = obtenerUsuario();

      const rolValido = rolesDe(usuarioActual).find((rol) =>
        mismoRol(rol, event.detail)
      );

      const rolPrincipalUsuario = rolPrincipal(usuarioActual);

      const rol = rolValido || rolPrincipalUsuario;

      guardarRolActivo(rol);
      setRolActivo(rol);
    };

    window.addEventListener("auth:logout", alExpirarSesion);
    window.addEventListener("auth:rol-activo", alReiniciarRol);

    return () => {
      window.removeEventListener(
        "auth:logout",
        alExpirarSesion
      );

      window.removeEventListener(
        "auth:rol-activo",
        alReiniciarRol
      );
    };
  }, []);

  // ============================================================
  // CAMBIAR ROL ACTIVO
  // ============================================================

  const cambiarRolActivo = (rol) => {
    const rolValido = rolesDe(usuario).find(
      (rolDisponible) =>
        mismoRol(rolDisponible, rol)
    );

    if (!rolValido) return;

    guardarRolActivo(rolValido);
    setRolActivo(rolValido);
  };

  // ============================================================
  // NUEVO ROL
  // ============================================================

  const manejarSesionActualizada = (sesion, rol) => {
    iniciarSesion(sesion);

    const rolValido =
      rolesDe(sesion.user).find((rolDisponible) =>
        mismoRol(rolDisponible, rol)
      ) || rolPrincipal(sesion.user);

    guardarRolActivo(rolValido);

    setUsuario(sesion.user);
    setRolActivo(rolValido);
  };

  // ============================================================
  // LOGIN
  // ============================================================

  const manejarLogin = (respuesta) => {
    console.log("Login correcto:", respuesta);

    setUsuario(respuesta.user);

    const rolAdministrador = rolesDe(respuesta.user).find((rolDisponible) =>
      mismoRol(rolDisponible, "Administrador")
    );
    const rol =
      rolAdministrador ||
      rolesDe(respuesta.user).find((rolDisponible) =>
        mismoRol(rolDisponible, obtenerRolActivo())
      ) ||
      rolPrincipal(respuesta.user);

    guardarRolActivo(rol);

    setRolActivo(rol);
    setSesionExpirada(false);
    setViajeSeleccionado(null);
    const destino = rolAdministrador ? "/administracion" : "/";
    window.history.replaceState({}, "", destino);
    setPantalla(rolAdministrador ? "administracion" : "home");
  };

  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  const manejarLogout = () => {
    cerrarSesion();

    setUsuario(null);
    setRolActivo(null);
    setViajeSeleccionado(null);
    setSesionExpirada(false);

    window.history.replaceState({}, "", "/");
    setPantalla("login");
  };

  // ============================================================
  // LOGIN
  // ============================================================

  if (pantalla === "login") {
    return (
      <Login
        onLogin={manejarLogin}
        sesionExpirada={sesionExpirada}
        onRegister={() => {
          setSesionExpirada(false);
          setPantalla("registro");
        }}
      />
    );
  }

  // ============================================================
  // REGISTRO
  // ============================================================

  if (pantalla === "registro") {
    return (
      <Register
        onBackToLogin={() => {
          setPantalla("login");
        }}
      />
    );
  }

  if (esAdministrador(usuario) && !["administracion", "perfil"].includes(pantalla)) {
    return (
      <Administracion
        onProfile={() => setPantalla("perfil")}
        onLogout={manejarLogout}
      />
    );
  }

  // ============================================================
  // HOME
  // ============================================================

  if (pantalla === "home") {
    return (
      <Home
        user={usuario}
        rolActivo={rolActivo}

        onLogout={manejarLogout}

        onCambiarRol={cambiarRolActivo}

        onProfile={() => {
          setPantalla("perfil");
        }}

        onVehiculos={() => {
          setPantalla("vehiculos");
        }}

        onPublish={() => {
          setPantalla("publicar");
        }}

        onMisViajes={() => {
          setPantalla("mis-viajes");
        }}

        onMisSolicitudes={() => {
          setPantalla("mis-solicitudes")
        }}

        onNotificaciones={() => {
          setPantalla("notificaciones");
        }}
        onCalificaciones={() => setPantalla("calificaciones")}
        onAdministracion={abrirAdministracion}

        onVerViaje={(viaje) => {
          setViajeSeleccionado(viaje);
          setPantalla("resumen-reserva");
        }}
      />
    );
  }


  // ============================================================
  // RESUMEN DE RESERVA
  // ============================================================

  if (pantalla === "resumen-reserva") {
    return (
      <ResumenReserva
        viaje={viajeSeleccionado}

        onVolver={() => {
          setPantalla("home");

          setTimeout(() => {
            document
              .getElementById("buscar")
              ?.scrollIntoView({
                behavior: "smooth",
              });
          }, 50);
        }}

        onConfirmar={(viaje) => {
          console.log(
            "Reserva confirmada:",
            viaje
          );
        }}

        onIrMisViajes={() => {
          setViajeSeleccionado(null);
          setPantalla("mis-viajes");
        }}
      />
    );
  }

  // ============================================================
  // MIS SOLICITUDES
  // ============================================================
  if (pantalla === "mis-solicitudes") {
  return (
    <MisSolicitudes
      user={usuario}
      onBack={() => setPantalla("home")}
      onVerRechazadas={() => setPantalla("solicitudes-rechazadas")}
      onVerCanceladas={() => setPantalla("solicitudes-canceladas")}
    />
  );
}

  if (pantalla === "solicitudes-rechazadas" || pantalla === "solicitudes-canceladas") {
    return (
      <MisSolicitudes
        user={usuario}
        vista={pantalla === "solicitudes-rechazadas" ? "rechazadas" : "canceladas"}
        onBack={() => setPantalla("mis-solicitudes")}
      />
    );
  }

  // ============================================================
  // NOTIFICACIONES
  // ============================================================

  if (pantalla === "notificaciones") {
    return (
      <Notificaciones
        onVolver={() => {
          setPantalla("home");
        }}
      />
    );
  }

  if (pantalla === "calificaciones") {
    return <Calificaciones user={usuario} onBack={() => setPantalla("home")} />;
  }

  if (pantalla === "administracion") {
    if (!obtenerToken() || !usuario || !esAdministrador(usuario)) {
      // No renderizar información administrativa a usuarios sin permiso.
      return <div className="min-h-screen bg-slate-50 p-8 text-center"><p className="mb-4 text-slate-700">Acceso restringido a Administradores.</p><button type="button" onClick={volverDeAdministracion} className="rounded-lg bg-emerald-700 px-4 py-2 text-white">Volver al inicio</button></div>;
    }
    return (
      <Administracion
        onProfile={() => setPantalla("perfil")}
        onLogout={manejarLogout}
      />
    );
  }

  // ============================================================
  // MIS VIAJES
  // ============================================================

  if (pantalla === "mis-viajes") {
    return (
      <MisViajes
        onBackHome={() => {
          setPantalla("home");
        }}

        onPublicarViaje={() => {
          setPantalla("publicar");
        }}
        onViajesCancelados={() => setPantalla("viajes-cancelados")}
        onViajesCompletados={() => setPantalla("viajes-completados")}
      />
    );
  }

  if (pantalla === "viajes-cancelados") {
    return <ViajesCancelados onBack={() => setPantalla("mis-viajes")} />;
  }

  if (pantalla === "viajes-completados") {
    return <ViajesCompletados onBack={() => setPantalla("mis-viajes")} />;
  }

  // ============================================================
  // PUBLICAR VIAJE
  // ============================================================

  if (pantalla === "publicar") {
    return (
      <PublicarViaje
        onBackHome={() => {
          setPantalla("home");
        }}
        onPublished={() => {
          setPantalla("home");
        }}
      />
    );
  }

  // ============================================================
  // PERFIL
  // ============================================================

  if (pantalla === "perfil") {
    return (
      <Profile
        user={usuario}
        onBackHome={() => {
          setPantalla(esAdministrador(usuario) ? "administracion" : "home");
        }}
        backLabel={esAdministrador(usuario) ? "Volver al panel" : "Regresar al inicio"}
        onUserUpdated={(
          usuarioActualizado
        ) => {
          console.log(
            "Usuario actualizado:",
            usuarioActualizado
          );

          setUsuario(
            usuarioActualizado
          );
        }}
      />
    );
  }

  // ============================================================
  // VEHÍCULOS
  // ============================================================

  if (pantalla === "vehiculos") {
    return (
      <Vehiculos
        onSesionActualizada={manejarSesionActualizada}
        onBackHome={() => {
          setPantalla("home");
        }}
      />
    );
  }

  return null;
}

export default App;