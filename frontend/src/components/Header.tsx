export default function Header() {
  return (
    <div
      style={{
        height: "60px",
        width: "100%",
        background: "white",
        borderBottom: "1px solid #e5e7eb",

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

        padding: "0 30px",
        boxSizing: "border-box",

        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {/* LEFT */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
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
            fontSize: "20px",
            fontWeight: "600",
          }}
        >
          K
        </div>

        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
              lineHeight: 1,
            }}
          >
            KNAV Portal
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginTop: "5px",
            }}
          >
            Workshop Management System
          </div>
        </div>
      </div>

      {/* RIGHT */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Admin
        </span>

        <button
          style={{
            background: "#8B0022",
            color: "white",
            border: "none",
            padding: "8px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}