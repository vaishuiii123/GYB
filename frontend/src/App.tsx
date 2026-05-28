import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import Login from "./pages/Login";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    await instance.loginRedirect({
      ...loginRequest,
      prompt: "select_account",
    });
  };

  if (accounts.length === 0) {
    return <Login onLogin={handleLogin} />;
  }

  return <h1>Dashboard Working</h1>;
}

export default App;
