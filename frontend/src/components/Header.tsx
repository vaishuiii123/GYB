import { useMsal } from "@azure/msal-react";

export default function Header() {
  const { instance } = useMsal();

  const handleLogout = async () => {
  localStorage.clear();

  await instance.logoutPopup();

  window.location.href =
    "https://gentle-sea-0636fbe10.7.azurestaticapps.net";
};

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

      <button
        onClick={handleLogout}
        style={{
          background: "#8B0022",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        Logout
      </button>
    </div>
  );
}
