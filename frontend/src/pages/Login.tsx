import { useState } from "react";

type LoginProps = {
  onLogin: () => void;
};

export default function Login({
  onLogin,
}: LoginProps) {

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {

      setError("");

      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (data.isAdmin) {
        onLogin();
      } else {
        setError("Email is not authorized.");
      }

    } catch (err) {
      setError("Unable to validate email.");
      console.error(err);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f4f6",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          alignItems: "center",
        }}
      >

        <input
          id="email"
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "300px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />

        {error && (
          <div
            style={{
              color: "red",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          style={{
            background: "#8B0022",
            color: "white",
            border: "none",
            padding: "14px 30px",
            borderRadius: "10px",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          Login with Azure
        </button>

      </div>
    </div>
  );
}
