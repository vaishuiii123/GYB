export const MSAL_LOGIN_TARGET_KEY = "gyb-msal-login-target";

export const getRedirectUri = () => window.location.origin;

export const getAdminRedirectUri = () =>
  `${window.location.origin}/adminlogin`;

export const getUserRedirectUri = () => `${window.location.origin}/`;

export const msalConfig = {
  auth: {
    clientId: "e14af128-d6f9-463f-9275-e1cdfea7728a",
    authority:
      "https://login.microsoftonline.com/8e108e06-7848-48cf-8623-e6b06c27f2db",
    redirectUri: getRedirectUri(),
    navigateToLoginRequestUrl: false,
  },

  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const adminLoginRequest = {
  scopes: ["User.Read"],
  redirectUri: getAdminRedirectUri(),
};

export const userLoginRequest = {
  scopes: ["User.Read"],
  redirectUri: getUserRedirectUri(),
};
