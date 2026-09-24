import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Vehiculos from "./pages/Vehiculos";

function App() {
  const [pantalla, setPantalla] = useState("login");

  const [usuario, setUsuario] = useState(null);

  // ============================================================
  // SESIÓN EXPIRADA (evento lanzado por services/api.js en 401)
  // ============================================================

  useEffect(() => {
    const alExpirarSesion = () => {
      setUsuario(null);
      setPantalla("login");
    };

    window.addEventListener("auth:logout", alExpirarSesion);

    return () => {
      window.removeEventListener("auth:logout", alExpirarSesion);
    };
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================

  const manejarLogin = (respuesta) => {
    console.log("Login correcto:", respuesta);

    setUsuario(respuesta.user);
    setPantalla("home");
  };

  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  const manejarLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setUsuario(null);
    setPantalla("login");
  };

  // ============================================================
  // LOGIN
  // ============================================================

  if (pantalla === "login") {
    return (
      <Login
        onLogin={manejarLogin}
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

        onProfile={() => {
          setPantalla("perfil");
        }}

        onVehiculos={() => {
          setPantalla("vehiculos");
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
    onBackHome={() => {
      setPantalla("home");
    }}
    />
  );
}

  return null;
}

export default App;

