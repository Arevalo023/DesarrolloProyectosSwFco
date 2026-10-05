import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Vehiculos from "./pages/Vehiculos";
import Register from "./pages/Register";
import PublicarViaje from "./pages/PublicarViaje";
import MisViajes from "./pages/MisViajes";
import ResumenReserva from "./pages/ResumenReserva";
import Notificaciones from "./pages/Notificaciones";

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

function App() {
  // ============================================================
  // ESTADOS PRINCIPALES
  // ============================================================

  const [pantalla, setPantalla] = useState(() =>
    obtenerToken() && obtenerUsuario() ? "home" : "login"
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

  const manejarRolAgregado = (sesion, rol) => {
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

    const rol =
      rolesDe(respuesta.user).find(
        (rolDisponible) =>
          mismoRol(
            rolDisponible,
            obtenerRolActivo()
          )
      ) || rolPrincipal(respuesta.user);

    guardarRolActivo(rol);

    setRolActivo(rol);
    setSesionExpirada(false);
    setViajeSeleccionado(null);
    setPantalla("home");
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

        onNotificaciones={() => {
          setPantalla("notificaciones");
        }}

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

  // ============================================================
  // MIS VIAJES
  // ============================================================

  if (pantalla === "mis-viajes") {
    return (
      <MisViajes
        onBackHome={() => {
          setPantalla("home");
        }}
      />
    );
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
          setPantalla("home");
        }}
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
        onRolAgregado={manejarRolAgregado}
        onBackHome={() => {
          setPantalla("home");
        }}
      />
    );
  }

  return null;
}

export default App;