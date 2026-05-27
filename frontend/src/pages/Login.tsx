import { useState } from "react";

export default function Login() {
  const [email, setEmail] =
    useState("");

  const handleLogin = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      email === "admin@test.com"
    ) {
      window.location.href =
        "/GYB/#/dashboard";
    } else {
      alert("Invalid Email");
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
        fontFamily:
          "Arial, sans-serif",
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
        }}
      >
        {/* LOGO */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
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
            }}
          >
            Login to continue
          </p>
        </div>

        {/* FORM */}

        <form onSubmit={handleLogin}>
          <div
            style={{
              marginBottom: "30px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontWeight: "600",
                color: "#374151",
                fontSize: "15px",
              }}
            >
              Email Address
            </label>

            <input
              type="email"
              placeholder="admin@test.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "14px",
                border:
                  "1px solid #d1d5db",
                fontSize: "16px",
                outline: "none",
                boxSizing:
                  "border-box",
                background:
                  "#f9fafb",
              }}
            />
          </div>

          <button
            type="submit"
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
            Login
          </button>
        </form>

        {/* FOOTER */}

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
