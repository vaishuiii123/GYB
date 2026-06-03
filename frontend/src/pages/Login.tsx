import { useState } from "react";
import { useNavigate } from "react-router-dom";

type LoginProps = {
  onLogin: (user?: any) => void;
};

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();
  
  const checkEmail = async () => {
    try {
      setMessage("");

      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      //console.log("API Response:", data);

      if (data.found) {
        //setIsAuthorized(true);
        setMessage("✓ Email verified");

        // Pass user details to App.tsx
        onLogin({
          name: data.name,
          role: data.role,
          email: email,
        });
        
  navigate("/dashboard");   // ✅ THIS IS KEY

      } else {
        //setIsAuthorized(false);
        setMessage("✗ Email not found");
      }
    } catch (err) {
      console.error(err);
     // setIsAuthorized(false);
      setMessage("Unable to validate email.");
    }
  };

return (
  <div
    style={{
      height: "100vh",
      width: "100%",
      background: "#eef3ff",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      fontFamily: "Segoe UI, sans-serif",
    }}
  >
    <div
      style={{
        width: "380px",
        background: "white",
        borderRadius: "24px",
        padding: "35px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          background: "#edf2ff",
          borderRadius: "50%",
          margin: "0 auto 20px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "34px",
        }}
      >
        📧
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: "24px",
          fontWeight: "700",
          color: "#0f172a",
        }}
      >
        Welcome Back
      </h1>

      <p
        style={{
          color: "#6b7280",
          fontSize: "15px",
          marginTop: "12px",
          marginBottom: "25px",
        }}
      >
        Enter your registered email address
      </p>

      <input
        type="email"
        placeholder="Enter Email ID"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          height: "52px",
          border: "2px solid #d1d5db",
          borderRadius: "12px",
          padding: "0 16px",
          fontSize: "15px",
          boxSizing: "border-box",
          marginBottom: "15px",
        }}
      />

      {message && (
        <div
          style={{
            color: message.includes("✓") ? "green" : "red",
            marginBottom: "15px",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={checkEmail}
        style={{
          width: "100%",
          height: "52px",
          border: "none",
          borderRadius: "12px",
          background: "#2f56d4",
          color: "white",
          fontSize: "18px",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        Continue
      </button>
    </div>
  </div>
);
}
