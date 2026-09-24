import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Vehiculos from "./pages/Vehiculos";
import Register from "./pages/Register";
import PublicarViaje from "./pages/PublicarViaje";
import {
  cerrarSesion,
  guardarRolActivo,
  iniciarSesion,
  obtenerRolActivo,
} from "./services/session";

function App() {
  const [pantalla, setPantalla] = useState("login");

  const [usuario, setUsuario] = useState(null);

  // Rol con el que el usuario está operando (Pasajero / Conductor)
  const [rolActivo, setRolActivo] = useState(() => obtenerRolActivo());

  // true cuando se regresó al login porque la sesión expiró
  const [sesionExpirada, setSesionExpirada] = useState(false);

  // ============================================================
  // EVENTOS DE SESIÓN (lanzados por services/api.js)
  // ============================================================

  useEffect(() => {
    // 401: token expirado o inválido
    const alExpirarSesion = () => {
      setUsuario(null);
      setRolActivo(null);
      setSesionExpirada(true);
      setPantalla("login");
    };

    // 403 INVALID_ACTIVE_ROLE: api.js ya regresó al rol principal
    const alReiniciarRol = (event) => {
      setRolActivo(event.detail);
    };

    window.addEventListener("auth:logout", alExpirarSesion);
    window.addEventListener("auth:rol-activo", alReiniciarRol);

    return () => {
      window.removeEventListener("auth:logout", alExpirarSesion);
      window.removeEventListener("auth:rol-activo", alReiniciarRol);
    };
  }, []);

  // ============================================================
  // CAMBIAR ROL ACTIVO
  // ============================================================

  const cambiarRolActivo = (rol) => {
    guardarRolActivo(rol);
    setRolActivo(rol);
  };

  // ============================================================
  // NUEVO ROL (ej. primer vehículo -> Conductor)
  // Guarda el token nuevo y cambia al rol recién obtenido
  // ============================================================

  const manejarRolAgregado = (sesion, rol) => {
    iniciarSesion(sesion);
    guardarRolActivo(rol);

    setUsuario(sesion.user);
    setRolActivo(rol);
  };

  // ============================================================
  // LOGIN
  // ============================================================

  const manejarLogin = (respuesta) => {
    console.log("Login correcto:", respuesta);

    setUsuario(respuesta.user);
    setRolActivo(obtenerRolActivo());
    setSesionExpirada(false);
    setPantalla("home");
  };

  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  const manejarLogout = () => {
    cerrarSesion();

    setUsuario(null);
    setRolActivo(null);
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
        user={usuario || usuarioPrueba}

        onLogout={manejarLogout}

        rolActivo={rolActivo}

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
        user={usuario || usuarioPrueba}
        onBackHome={() => {
          setPantalla("home");
        }}
        onUserUpdated={(usuarioActualizado) => {
          console.log("Usuario actualizado:", usuarioActualizado);
          setUsuario(usuarioActualizado);
        }}
      />
    );
  }

  // ============================================================
  // MIS VEHÍCULOS
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

