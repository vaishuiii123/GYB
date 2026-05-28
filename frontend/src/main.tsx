import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

import { msalConfig } from "./authConfig";

import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().then(() => {
    ReactDOM.createRoot(
      document.getElementById("root") as HTMLElement
    ).render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>
    );
  });
});
