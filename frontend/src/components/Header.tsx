import { useNavigate } from "react-router-dom";
import logo from "../images/knav_white.png";

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
        left: 0,
        right: 0,

        height: "60px",

        background: "#741D34",

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

        padding: "0 30px",

        boxSizing: "border-box",

        zIndex: 1000,

        boxShadow:
          "0 2px 10px rgba(0,0,0,0.15)",
      }}
    >

      {/* Logo */}

      <img
        src={logo}
        alt="KNAV Logo"
        style={{
          height: "38px",
          objectFit: "contain",
        }}
      />

      {/* Right Section */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >

        {/* User Initials */}

        <div
          style={{
            width: "42px",
            height: "42px",

            borderRadius: "50%",

            background: "#FCECEF",

            color: "#741D34",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          {initials}
        </div>

        {/* Divider */}

        <div
          style={{
            width: "1px",
            height: "30px",

            background:
              "rgba(255,255,255,0.3)",
          }}
        />

        {/* Logout */}

        <div
          onClick={handleLogout}
          style={{
            cursor: "pointer",

            color: "#FFFFFF",

            fontWeight: 600,
            fontSize: "15px",

            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⮕ Logout
        </div>

      </div>

    </div>
  );
}
