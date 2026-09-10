import { useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (isAuthenticated) {
    return (
      <Home
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          setIsAuthenticated(false);
        }}
      />
    );
  }

  if (showRegister) {
    return (
      <Register
        onBackToLogin={() => setShowRegister(false)}
      />
    );
  }

  return (
    <Login
      onRegister={() => setShowRegister(true)}
      onLogin={() => setIsAuthenticated(true)}
    />
  );
}

export default App;