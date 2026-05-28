import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import Login from "./pages/Login";

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

  return <Login onLogin={handleLogin} />;
}

export default App;
