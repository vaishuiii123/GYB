import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export default function Login() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup({
        ...loginRequest,
        prompt: "select_account",
      });

      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

 return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f1f5f9",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "50px",
          borderRadius: "20px",
          width: "400px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            background: "#8B0022",
            margin: "0 auto 30px",
            borderRadius: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "60px",
            fontWeight: "700",
          }}
        >
          K
        </div>

        <h1
          style={{
            marginBottom: "12px",
            color: "#0f172a",
          }}
        >
          KNAV Portal
        </h1>

        <p
          style={{
            color: "#64748b",
            marginBottom: "40px",
          }}
        >
          Login using Microsoft Azure SSO
        </p>

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            background: "#8B0022",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontSize: "20px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Login with Azure
        </button>
      </div>
    </div>
  );
}
