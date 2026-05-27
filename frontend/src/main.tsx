import React from "react";
import ReactDOM from "react-dom/client";

import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Template from "./pages/Template";
import Workshop from "./pages/Workshop";

import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={<Login />}
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
    </HashRouter>
  </React.StrictMode>
);
