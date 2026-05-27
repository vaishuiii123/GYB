import { useMsal } from "@azure/msal-react";

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginRedirect({
        scopes: ["User.Read"],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    instance.logoutRedirect();
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
        <button onClick={handleLogin}>
          Login with Azure
        </button>
      )}
    </div>
  );
}

export default App;
