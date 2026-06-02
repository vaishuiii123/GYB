import { useState } from "react";

import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
//import Organization from "./pages/Organization";
//import Template from "./pages/Template";
//import Workshop from "./pages/Workshop";

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ Only store user (no Azure login)
  const handleLogin = (userData: any) => {
    setCurrentUser(userData);
  };

  // ✅ Show login page if user not set
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // ✅ Application
  return (
    <HashRouter>
      <Routes>

        <Route path="*" element={<Navigate to="/dashboard" />} />

        <Route
          path="/dashboard"
          element={<Dashboard user={currentUser} />}
        />

        {/* For now keep others simple */}
      
      </Routes>
    </HashRouter>
  );
}

export default App;
