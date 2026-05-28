type LoginProps = {
  onLogin: () => void;
};

export default function Login({
  onLogin,
}: LoginProps) {
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
          background: "white",
          padding: "60px",
          borderRadius: "20px",
          width: "420px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            width: "90px",
            height: "90px",
            background: "#8B0022",
            borderRadius: "20px",
            margin: "0 auto 30px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "48px",
            fontWeight: "700",
          }}
        >
          K
        </div>

        <h1
          style={{
            fontSize: "32px",
            marginBottom: "16px",
            color: "#111827",
          }}
        >
          KNAV Portal
        </h1>

        <p
          style={{
            color: "#6b7280",
            marginBottom: "36px",
            fontSize: "18px",
          }}
        >
          Login using Microsoft Azure SSO
        </p>

        <button
          onClick={onLogin}
          style={{
            width: "100%",
            padding: "18px",
            background: "#8B0022",
            color: "white",
            border: "none",
            borderRadius: "14px",
            fontSize: "20px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Login with Azure
        </button>

        <p
          style={{
            marginTop: "40px",
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          © 2026 KNAV Portal
        </p>
      </div>
    </div>
  );
}
