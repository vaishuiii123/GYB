import { useNavigate } from "react-router-dom";
import logo from "../images/KNAV_logo.png";

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
        left: 0, // ✅ full width header
        right: 0,
        height: "60px",
        background: "#F5F5F5", // ✅ KNAV header color
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        boxSizing: "border-box",
        zIndex: 1000,
        borderBottom: "1px solid #E0E0E0",
      }}
    >

      
          <img
              src={logo}
              alt="KNAV Logo"
              style={{
                height: "35px",
                objectFit: "contain",
              }}
            />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "25px",
          color: "#2C2C2C", // ✅ dark text
          marginLeft: "auto",
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
              background: "#741D34", // ✅ KNAV maroon
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
            color: "#741D34", // ✅ KNAV maroon logout
          }}
        >
          ⮕ Logout
        </div>
      </div>
    </div>
  );
}
