import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

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

 

  if (accounts.length === 0) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      
      <Dashboard />
    </>
  );
}

export default App;
