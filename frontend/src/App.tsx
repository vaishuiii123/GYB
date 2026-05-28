import { useMsal } from "@azure/msal-react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const { accounts } = useMsal();

  if (accounts.length === 0) {
    return <Login />;
  }

  return <Dashboard />;
}

export default App;
