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
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #2563eb, #1e40af)",
      fontFamily: "Segoe UI, sans-serif",
    }}
  >
    <div
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        width: "350px",
        textAlign: "center",
      }}
    >
      {/* Header */}
      <h1 style={{ marginBottom: "10px", color: "#1e3a8a" }}>
        Grow Your Business
      </h1>

      <p style={{ marginBottom: "25px", color: "#6b7280" }}>
        Welcome! Please enter your email
      </p>

      {/* Input */}
      <input
        id="email"
        type="email"
        placeholder="Enter Email ID"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "16px",
          marginBottom: "15px",
          outline: "none",
        }}
      />

      {/* Message */}
      {message && (
        <div
          style={{
            color: message.includes("✓") ? "green" : "red",
            fontSize: "14px",
            marginBottom: "10px",
          }}
        >
          {message}
        </div>
      )}

      {/* Button */}
      <button
        onClick={checkEmail}
        style={{
          width: "100%",
          background: "#2563eb",
          color: "white",
          border: "none",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
          transition: "0.3s",
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = "#1e40af")
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.background = "#2563eb")
        }
      >
        Check Email
      </button>
    </div>
  </div>
);
}
