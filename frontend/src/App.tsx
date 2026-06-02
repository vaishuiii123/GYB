import { useState } from "react";

import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleLogin = (userData: any) => {
    setCurrentUser(userData);
  };

  return (
    <HashRouter>
      <Routes>

        {/* ✅ Login route */}
        <Route
          path="/"
          element={<Login onLogin={handleLogin} />}
        />

        {/* ✅ Dashboard route */}
        <Route
          path="/dashboard"
          element={<Dashboard user={currentUser} />}
        />

      </Routes>
    </HashRouter>
  );
}

export default App;
