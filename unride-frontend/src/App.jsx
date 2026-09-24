import { useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Vehiculos from "./pages/Vehiculos";
import PublicarViaje from "./pages/PublicarViaje";
import Register from "./pages/Register";

function App() {
  const [pantalla, setPantalla] = useState("login");

  const [usuario, setUsuario] = useState(null);

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
        onRegister={() => {
          setPantalla("registro");
        }}
      />
    );
  }

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

  return null;
}

export default App;

