import { useState } from "react";

import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import AdminLogin from "./pages/auth/AdminLogin";
import Dashboard from "./pages/Admin/Dashboard";
import Organization from "./pages/Admin/Organization";
import Template from "./pages/Admin/Template";
import Workshop from "./pages/Admin/Workshop";

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
          element={<AdminLogin onLogin={handleLogin} />}
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
          element={<Template user={currentUser} />}
        />

        <Route
          path="/workshop"
          element={<Workshop user={currentUser} />}
        />

      </Routes>
    </HashRouter>
  );
}

export default App;
