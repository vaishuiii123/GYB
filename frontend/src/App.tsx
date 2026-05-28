import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

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

  const handleLogout = () => {
    instance.logoutRedirect();
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
