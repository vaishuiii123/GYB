import { useState } from "react";

import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Template from "./pages/Template";
import Workshop from "./pages/Workshop";

function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
  const savedUser = localStorage.getItem("user");

  return savedUser ? JSON.parse(savedUser) : null;
});

  const handleLogin = (userData: any) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setCurrentUser(userData);
  };

  return (
    <HashRouter>
      <Routes>

        {/* ✅ Login route */}
        <Route
          path="/"
          element={<Login onLogin={handleLogin} />}
        />

        {/* ✅ Dashboard route */}
        <Route
          path="/dashboard"
          element={<Dashboard user={currentUser} />}
        />

          <Route
          path="/organization"
          element={<Organization user={currentUser} />}
        /> 

        <Route
          path="/template"
          element={<Template />}
        />

        <Route
          path="/workshop"
          element={<Workshop />}
        />

      </Routes>
    </HashRouter>
  );
}

export default App;
