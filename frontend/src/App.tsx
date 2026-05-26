import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Template from "./pages/Template";
import Workshop from "./pages/Workshop";

function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          background: "#eef3f7",
          minHeight: "100vh",
        }}
      >
        {/* HEADER */}

        <Header />

        {/* SIDEBAR */}

        <Sidebar />

        {/* MAIN CONTENT */}

        <div
          style={{
            marginLeft: "250px",
            marginTop: "80px",

            padding: "35px",

            minHeight:
              "calc(100vh - 80px)",

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