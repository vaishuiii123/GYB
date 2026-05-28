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
      <button
        onClick={onLogin}
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
  );
}
