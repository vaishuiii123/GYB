export const msalConfig = {
  auth: {
    clientId: "e14af128-d6f9-463f-9275-e1cdfea7728a",

    authority:
      "https://login.microsoftonline.com/8e108e06-7848-48cf-8623-e6b06c27f2db",

    redirectUri:
      "https://gentle-sea-0636fbe10.7.azurestaticapps.net",
  },

  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};
