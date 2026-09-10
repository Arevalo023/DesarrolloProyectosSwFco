import { useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";

function App() {

  // ============================================================
  // OBTENER USUARIO GUARDADO
  // ============================================================

  const obtenerUsuarioGuardado = () => {
    try {
      const usuarioGuardado = localStorage.getItem("usuario");

      if (!usuarioGuardado) {
        return null;
      }

      return JSON.parse(usuarioGuardado);

    } catch (error) {
      console.error(
        "Error al leer el usuario guardado:",
        error
      );

      return null;
    }
  };


  // ============================================================
  // ESTADOS
  // ============================================================

  const [showRegister, setShowRegister] =
    useState(false);

  const [showProfile, setShowProfile] =
    useState(false);

  const [usuario, setUsuario] =
    useState(obtenerUsuarioGuardado);

  const [isAuthenticated, setIsAuthenticated] =
    useState(() => {
      const token = localStorage.getItem("token");
      const usuarioGuardado = localStorage.getItem("usuario");

      return Boolean(token && usuarioGuardado);
    });



  const iniciarSesion = (respuesta) => {

    console.log(
      "Información recibida del login:",
      respuesta
    );


    // ----------------------------------------------------------
    // TOKEN
    // ----------------------------------------------------------

    const token =
      respuesta?.token ||
      respuesta?.accessToken ||
      null;



    const datosUsuario =
      respuesta?.user ||
      respuesta?.usuario ||
      null;


    // ----------------------------------------------------------
    // GUARDAR TOKEN
    // ----------------------------------------------------------

    if (token) {
      localStorage.setItem(
        "token",
        token
      );
    }


    // ----------------------------------------------------------
    // GUARDAR USUARIO
    // ----------------------------------------------------------

    if (datosUsuario) {

      localStorage.setItem(
        "usuario",
        JSON.stringify(datosUsuario)
      );

      setUsuario(datosUsuario);
    }


    // ----------------------------------------------------------
    // ENTRAR AL HOME
    // ----------------------------------------------------------

    setShowRegister(false);
    setShowProfile(false);
    setIsAuthenticated(true);
  };


  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  const cerrarSesion = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setUsuario(null);

    setShowProfile(false);

    setShowRegister(false);

    setIsAuthenticated(false);
  };


  // ============================================================
  // USUARIO AUTENTICADO
  // ============================================================

  if (isAuthenticated) {

    // ----------------------------------------------------------
    // PERFIL
    // ----------------------------------------------------------

    if (showProfile) {

      return (
        <Profile

          // Usuario que inició sesión
          user={usuario}

          // Regresar solamente al Home
          // NO cierra sesión
          onBackHome={() => {
            setShowProfile(false);
          }}

          // Si Profile cambia información,
          // actualizamos App y localStorage
          onUserUpdated={(usuarioActualizado) => {

            setUsuario(usuarioActualizado);

            localStorage.setItem(
              "usuario",
              JSON.stringify(usuarioActualizado)
            );
          }}

        />
      );
    }


    // ----------------------------------------------------------
    // HOME
    // ----------------------------------------------------------

    return (
      <Home

        // Abrir perfil
        onProfile={() => {
          setShowProfile(true);
        }}

        // Cerrar sesión
        onLogout={cerrarSesion}

        // Usuario disponible por si Home
        // lo necesita posteriormente
        user={usuario}

      />
    );
  }


  // ============================================================
  // REGISTRO
  // ============================================================

  if (showRegister) {

    return (
      <Register

        onBackToLogin={() => {
          setShowRegister(false);
        }}

      />
    );
  }


  // ============================================================
  // LOGIN
  // ============================================================

  return (
    <Login

      // Ir al registro
      onRegister={() => {
        setShowRegister(true);
      }}

      // Login exitoso
      onLogin={iniciarSesion}

    />
  );
}

export default App;