import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { HashRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

import { msalConfig } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <HashRouter>
        <App />
      </HashRouter>
    </MsalProvider>
  </React.StrictMode>
);
