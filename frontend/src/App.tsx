import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Template from "./pages/Template";
import Workshop from "./pages/Workshop";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginRedirect({
        ...loginRequest,
        prompt: "select_account",
      });
    } catch (error) {
      console.error(error);
    }
  };

  // SHOW LOGIN PAGE

  if (accounts.length === 0) {
    return <Login onLogin={handleLogin} />;
  }

  // SHOW APPLICATION

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate to="/dashboard" />
          }
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/organization"
          element={<Organization />}
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
    <Dashboard />
  );
}

export default App;
