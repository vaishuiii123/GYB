import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

import myImage from "../../images/KNAV logo.png";
import { loginRequest } from "../../authConfig";

export default function UserLogin() {

  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const { instance } = useMsal();

  const redirectUser = (role: string) => {
    switch (role) {
      case "Organizer":
        navigate("/dashboard");
        break;

      case "Participant":
        navigate("/userdashboard");
        break;

      default:
        alert("No role has been assigned to this user.");
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      const loginResponse = await instance.loginPopup(loginRequest);

      const email = loginResponse.account?.username;

      if (!email) {
        alert("Unable to retrieve your Microsoft account.");
        return;
      }

      const response = await fetch("/api/sso-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        alert("User not found.");
        return;
      }

      localStorage.setItem(
        "participant",
        JSON.stringify(data.user)
      );

      redirectUser(data.user.role);

    } catch (err) {
      console.error(err);
      alert("Microsoft login failed.");
    }
  };

  const handleLogin = async () => {
    try {

      const response = await fetch("/api/user-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          organization,
          password,
        }),
      });

      const responseText = await response.text();

      console.log("API RESPONSE:", responseText);

      if (!response.ok) {
        alert(responseText);
        return;
      }

      if (!responseText) {
        alert("Empty response from API.");
        return;
      }

      const data = JSON.parse(responseText);

      if (!data.success) {
        alert("Invalid credentials.");
        return;
      }

      localStorage.setItem(
        "participant",
        JSON.stringify(data.user)
      );

      redirectUser(data.user.role);

    } catch (error) {
      console.error(error);
      alert("Login failed.");
    }
  };

  return (
  <div
    style={{
      height: "100vh",
      width: "100%",
      background: "#f5f5f5",
      display: "flex",
      justifyContent: "space-between",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {/* Left Side */}
    <div
      style={{
        width: "45%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={myImage}
        alt="KNAV"
        style={{
          position: "absolute",
          top: "40px",
          left: "40px",
          width: "140px",
        }}
      />

      <div
        style={{
          width: "500px",
          height: "350px",
          background:
            "linear-gradient(90deg,#efefef,#fafafa,#efefef)",
          clipPath:
            "polygon(0 0,60% 0,100% 50%,60% 100%,0 100%,40% 50%)",
          opacity: 0.7,
        }}
      />
    </div>

    {/* Right Side */}
    <div
      style={{
        width: "55%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingRight: "120px",
      }}
    >
      {/* Top Links */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "60px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#7b0f2c",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          About KNAV
        </span>

        <span style={{ fontSize: "24px" }}>🌐</span>
        <span style={{ fontSize: "24px" }}>in</span>
      </div>

      {/* Heading */}
      <h1
        style={{
          color: "#7b0f2c",
          fontSize: "58px",
          fontWeight: 700,
          marginBottom: "10px",
        }}
      >
        GROW YOUR BUSINESS
      </h1>

      <h2
        style={{
          color: "#5f5f5f",
          fontWeight: 400,
          marginBottom: "50px",
        }}
      >
        Organisation Development Workshop
      </h2>

      {/* Login Form */}
      <div
        style={{
          width: "340px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Username"
          style={inputStyle}
        />

        <input
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Organization name"
          style={inputStyle}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={inputStyle}
        />

        <button
          onClick={handleLogin}
          style={{
            background: "#7b0f2c",
            color: "white",
            border: "none",
            padding: "12px",
            cursor: "pointer",
            fontWeight: 600,
            width: "100%",
            borderRadius: "4px",
          }}
        >
          Get Started
        </button>

        {/* OR Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "8px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#d9d9d9",
            }}
          />

          <span
            style={{
              margin: "0 12px",
              color: "#777",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            OR
          </span>

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#d9d9d9",
            }}
          />
        </div>

        {/* Microsoft Login */}
        <button
          onClick={handleMicrosoftLogin}
          style={{
            background: "#fff",
            color: "#7b0f2c",
            border: "1px solid #7b0f2c",
            padding: "12px",
            cursor: "pointer",
            fontWeight: 600,
            width: "100%",
            borderRadius: "4px",
          }}
        >
          Continue with Microsoft
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
            fontSize: "13px",
            color: "#555",
          }}
        >
          <span>Remember me</span>
          <span>Need Help?</span>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          <Link
            to="/adminlogin"
            style={{
              color: "#7b0f2c",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  </div>
);
  
}

const inputStyle = {
  width: "100%",
  height: "42px",
  border: "none",
  background: "white",
  padding: "0 15px",
  fontSize: "14px",
  outline: "none",
} as React.CSSProperties;
