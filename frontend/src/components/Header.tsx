import { useNavigate } from "react-router-dom";
import logo from "../images/knav_logo.png"; // ✅ rename file to avoid space issue

export default function Header({ user }: any) {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmLogout = window.confirm("Do you really want to logout?");

    if (confirmLogout) {
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((word: string) => word[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "60px",
        background: "#F5F5F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", // ✅ better spacing
        padding: "0 30px",
        boxSizing: "border-box",
        zIndex: 1000,

        // ✅ shadow added (matches KNAV UI)
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* ✅ LEFT SIDE (LOGO) */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src={logo}
          alt="KNAV Logo"
          style={{
            height: "35px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* ✅ RIGHT SIDE (USER + LOGOUT) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "25px",
          color: "#2C2C2C",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "#741D34",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: "600",
            }}
          >
            {initials}
          </div>
        </div>

        <div
          style={{
            width: "1px",
            height: "35px",
            background: "#D0D0D0",
          }}
        />

        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "16px",
            color: "#741D34",
          }}
        >
          ⮕ Logout
        </div>
      </div>
    </div>
  );
}
