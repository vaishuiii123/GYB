import { useMsal } from "@azure/msal-react";
import { useState } from "react";
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
  const [currentUser, setCurrentUser] =
  useState<any>(null);
  
  const handleLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error(error);
    }
  };

  // LOGIN PAGE
  if (accounts.length === 0) {
  return <Login onLogin={handleLogin} />;
}
  

  // APPLICATION
  return (
    <HashRouter>
      <Routes>

        <Route 
          path="*" 
          element={<Navigate to="/dashboard" />} 
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
  );
}

export default App;
