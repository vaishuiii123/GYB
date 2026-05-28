import { useMsal } from "@azure/msal-react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Template from "./pages/Template";
import Workshop from "./pages/Workshop";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogout = () => {
    instance.logoutPopup();
  };

  if (accounts.length === 0) {
    return <Login />;
  }

return (
    <HashRouter>
      <div
        style={{
          minHeight: "100vh",
          background: "#f1f5f9",
        }}
      >

        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "80px",
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 30px",
            zIndex: 1000,
          }}
        >

          <div>
            <h2
              style={{
                margin: 0,
                color: "#8B0022",
              }}
            >
              KNAV Portal
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}

            >
              Workshop Management System
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "#8B0022",
              color: "white",
              border: "none",
              padding: "12px 22px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >

            Logout
          </button>
        </div>

        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/organization"
            element={<Organization />}
          />

          <Route
            path="/template"
            element={<Template />}
          />

          <Route
            path="/workshop"
            element={<Workshop />}
          />
        </Routes>
      </div>
    </HashRouter>
  );

}

export default App;
