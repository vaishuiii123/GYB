import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
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
      <div
        style={{
          position: "fixed",
          top: "15px",
          right: "20px",
          zIndex: 9999,
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            background: "#7a0019",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>

      <Dashboard />
    </>
  );
}

export default App;
