export const MSAL_LOGIN_TARGET_KEY = "gyb-msal-login-target";

export const getRedirectUri = () => window.location.origin;

export const getAdminRedirectUri = () =>
  `${window.location.origin}/adminlogin`;

export const getUserRedirectUri = () => `${window.location.origin}/`;

export const msalConfig = {
  auth: {
    clientId: "b33bab61-433f-4077-97e5-8197ae8777da",
    authority:
      "https://login.microsoftonline.com/fe7d772d-3adf-41ce-937b-a6096a00bc07",
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
