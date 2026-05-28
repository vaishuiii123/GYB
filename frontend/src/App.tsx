import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Template from "./pages/Template";
import Workshop from "./pages/Workshop";

import Sidebar from "./components/Sidebar";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginRedirect(
        loginRequest
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
  };

  // LOGIN SCREEN

  if (accounts.length === 0) {
  return <Login />;
}

  // MAIN APP

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          background: "#f1f5f9",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            height: "70px",
            background: "white",

            borderBottom:
              "1px solid #e5e7eb",

            display: "flex",

            alignItems: "center",

            justifyContent:
              "space-between",

            padding: "0 30px",

            position: "fixed",

            top: 0,
            left: 0,
            right: 0,

            zIndex: 1000,
          }}
        >
          {/* LEFT */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",

                borderRadius: "12px",

                background: "#8B0022",

                color: "white",

                display: "flex",

                alignItems: "center",

                justifyContent:
                  "center",

                fontWeight: "700",

                fontSize: "28px",
              }}
            >
              K
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#111827",
                }}
              >
                KNAV Portal
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                Workshop Management
                System
              </p>
            </div>
          </div>

          {/* RIGHT */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <span
              style={{
                fontWeight: "500",
              }}
            >
              Admin
            </span>

            <button
              onClick={handleLogout}
              style={{
                background: "#8B0022",
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
        </div>

        {/* SIDEBAR */}

        <Sidebar />

        {/* PAGE CONTENT */}

        <div
          style={{
            marginLeft: "240px",

            marginTop: "70px",

            padding: "35px",

            minHeight:
              "calc(100vh - 70px)",

            boxSizing: "border-box",
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <Navigate to="/dashboard" />
              }
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
      </div>
    </BrowserRouter>
  );
}

export default App;
