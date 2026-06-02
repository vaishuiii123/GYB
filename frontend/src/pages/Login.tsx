import { useState } from "react";

type LoginProps = {
  onLogin: (user: any) => void;
};

export default function Login({
  onLogin,
}: LoginProps) {

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

 const checkEmail = async () => {
  try {
    setMessage("");

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

    console.log("API Response:", data);

      if (data.found) {

  onLogin({
    name: data.name,
    role: data.role,
    email: email
  });

} else {

      setMessage("✗ Email not found");

    }

  } catch (err) {

    console.error(err);

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
          placeholder="Enter Email ID"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={{
            width: "300px",
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            fontSize: "16px",
          }}
        />

        {message && (
          <div
            style={{
              color: message.includes("✓")
                ? "green"
                : "red",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        <button
          onClick={checkEmail}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "14px 30px",
            borderRadius: "10px",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          Check Email
        </button>

        <button
          onClick={onLogin}
          disabled={!isAuthorized}
          style={{
            background: "#8B0022",
            color: "white",
            border: "none",
            padding: "14px 30px",
            borderRadius: "10px",
            fontSize: "18px",
            cursor: isAuthorized
              ? "pointer"
              : "not-allowed",
            opacity: isAuthorized ? 1 : 0.5,
          }}
        >
          Login with Azure
        </button>

      </div>
    </div>
  );
}
