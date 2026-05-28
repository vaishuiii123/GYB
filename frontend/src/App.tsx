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

  if (accounts.length === 0) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <h1>Dashboard Working</h1>
    </div>
  );
}

export default App;
