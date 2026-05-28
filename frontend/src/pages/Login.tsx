import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export default function Login() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "white",
          padding: "50px",
          borderRadius: "28px",
          boxShadow:
            "0 15px 40px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "90px",
            height: "90px",
            margin: "0 auto 20px",
            borderRadius: "22px",
            background:
              "linear-gradient(135deg, #7a0019 0%, #a0002a 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "42px",
            fontWeight: "700",
          }}
        >
          K
        </div>

        <h1
          style={{
            fontSize: "38px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "10px",
          }}
        >
          KNAV Portal
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "16px",
            marginBottom: "30px",
          }}
        >
          Login using Microsoft Azure SSO
        </p>

        <button
          type="button"
          onClick={handleLogin}
          style={{
            width: "100%",
            background:
              "linear-gradient(135deg, #7a0019 0%, #a0002a 100%)",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "14px",
            fontSize: "17px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Login with Azure
        </button>

        <div
          style={{
            marginTop: "30px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          © 2026 KNAV Portal
        </div>
      </div>
    </div>
  );
}
