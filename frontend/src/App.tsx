import { useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";
import Dashboard from "./pages/Admin/Dashboard";
import AdminLogin from "./pages/auth/AdminLogin";

function App() {

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData: any) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setCurrentUser(userData);
  };


  return (
    <HashRouter>
     <Routes>
        <Route
          path="/"
          element={<AdminLogin onLogin={handleLogin} />}
        />
      
        <Route
          path="/dashboard"
          element={<Dashboard user={currentUser} />}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
