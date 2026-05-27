import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest);
  };

  const handleLogout = () => {
    instance.logoutPopup();
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Azure SSO Login</h1>

      {accounts.length > 0 ? (
        <>
          <p>Welcome {accounts[0].username}</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login with Azure</button>
      )}
    </div>
  );
}

export default App;
``
