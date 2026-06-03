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
      minHeight: "80vh",
      background: "#eef3ff",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Segoe UI, sans-serif",
    }}
  >
    <div
      style={{
        width: "300px",
        background: "white",
        borderRadius: "25px",
        padding: "50px",
        boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "100px",
          height: "100px",
          background: "#edf2ff",
          borderRadius: "50%",
          margin: "0 auto 25px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "45px",
        }}
      >
        📧
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: "40px",
          fontWeight: "700",
          color: "#0f172a",
        }}
      >
        Grow Your Business
      </h1>

      <p
        style={{
          color: "#6b7280",
          fontSize: "18px",
          marginTop: "15px",
          marginBottom: "35px",
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
          width: "90%",
          height: "50px",
          border: "2px solid #d1d5db",
          borderRadius: "14px",
          paddingLeft: "20px",
          fontSize: "15px",
          boxSizing: "border-box",
          marginBottom: "20px",
        }}
      />

      {message && (
        <div
          style={{
            color: message.includes("✓") ? "green" : "red",
            marginBottom: "15px",
            fontWeight: "600",
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={checkEmail}
        style={{
          width: "90%",
          height: "50px",
          border: "none",
          borderRadius: "14px",
          background: "#2f56d4",
          color: "white",
          fontSize: "20px",
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
