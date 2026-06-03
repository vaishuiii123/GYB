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
    {/* LOGIN SECTION */}
    <div
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "white",
          borderRadius: "25px",
          padding: "50px",
          boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        {/* EMAIL ICON */}
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
            fontSize: "48px",
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
            width: "100%",
            height: "60px",
            border: "2px solid #d1d5db",
            borderRadius: "14px",
            paddingLeft: "20px",
            fontSize: "18px",
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
            width: "100%",
            height: "60px",
            border: "none",
            borderRadius: "14px",
            background: "#2f56d4",
            color: "white",
            fontSize: "22px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>

    {/* FOOTER */}
    <div
      style={{
        textAlign: "center",
        paddingBottom: "25px",
        color: "#6b7280",
        fontSize: "14px",
      }}
    >
      © 2026 KNAV Portal. All rights reserved.
    </div>
  </div>
);
}
