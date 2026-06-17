import { useNavigate } from "react-router-dom";
import logo from "../images/KNAV logo.png";

export default function Header({ user }: any) {

  const navigate = useNavigate();

  const handleLogout = () => {

    const confirmLogout =
      window.confirm(
        "Do you really want to logout?"
      );

    if (confirmLogout) {

      localStorage.clear();
      sessionStorage.clear();

      navigate("/");
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map(
        (word: string) => word[0]
      )
      .join("")
      .toUpperCase() || "U";

  return (

    <div
      style={{
        position: "fixed",
        top: 0,
        left: "220px",
        right: 0,
        height: "70px",
        background: "#741D34",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        boxSizing: "border-box",
        zIndex: 1000,

        boxShadow:
          "0 4px 12px rgba(0,0,0,0.12)",
      }}
    >

      {/* Logo */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src={logo}
          alt="KNAV Logo"
          style={{
            height: "40px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Right Section */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >

        {/* User Avatar */}

        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "#FCECEF",
            color: "#741D34",
            border:
              "1px solid rgba(255,255,255,0.25)",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          {initials}
        </div>

        {/* Separator */}

        <div
          style={{
            width: "1px",
            height: "32px",
            background:
              "rgba(255,255,255,0.30)",
          }}
        />

        {/* Logout */}

        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",

            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: "15px",
            userSelect: "none",
          }}
        >
          ⮕ Logout
        </div>

      </div>

    </div>
  );
}
