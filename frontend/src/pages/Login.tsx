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
      minHeight: "100vh",
      background: "#f3f4f6",
      fontFamily: "Segoe UI, sans-serif",
    }}
  >
    {/* Top Header */}
    <div
      style={{
        height: "70px",
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
      }}
    >
      <div
        style={{
          width: "45px",
          height: "45px",
          background: "#8B0022",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "700",
          fontSize: "22px",
          marginRight: "15px",
        }}
      >
        K
      </div>

      <div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          KNAV Portal
        </div>

        <div
          style={{
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          Workshop Management System
        </div>
      </div>
    </div>

    {/* Login Area */}
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "calc(100vh - 70px)",
      }}
    >
      <div
        style={{
          width: "420px",
          background: "white",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "10px",
            color: "#111827",
          }}
        >
          Welcome Back
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "30px",
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
            padding: "14px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
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
            }}
          >
            {message}
          </div>
        )}

        <button
          onClick={checkEmail}
          style={{
            width: "100%",
            background: "#8B0022",
            color: "white",
            border: "none",
            padding: "14px",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  </div>
);
}
