import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { BrowserRouter } from "react-router-dom";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(async () => {
  const response =
    await msalInstance.handleRedirectPromise();

  if (response) {
    msalInstance.setActiveAccount(response.account);
  }

  ReactDOM.createRoot(
    document.getElementById("root")!
  ).render(
    <React.StrictMode>
      <BrowserRouter>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
});
