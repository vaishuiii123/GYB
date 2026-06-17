import { useNavigate } from "react-router-dom";

export default function Header({ user }: any) {

  const navigate = useNavigate();

  const handleLogout = () => {

    const confirmLogout = window.confirm(
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
      .map((word: string) => word[0])
      .join("")
      .toUpperCase() || "U";

  return (

    <div
      style={{
        position: "fixed",
        top: 0,
        left: "260px", // same as sidebar width
        right: 0,
        height: "70px",

        background: "#741D34",

        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",

        padding: "0 30px",

        boxSizing: "border-box",

        zIndex: 1000,

        boxShadow:
          "0 4px 12px rgba(0,0,0,0.12)",
      }}
    >

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >

        {/* User Circle */}

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
            fontSize: "15px",

            border:
              "1px solid rgba(255,255,255,0.25)",
          }}
        >
          {initials}
        </div>

        {/* Divider */}

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
