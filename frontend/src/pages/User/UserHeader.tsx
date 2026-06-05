import { useNavigate } from "react-router-dom";

export default function UserHeader() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("participant") || "{}"
  );

  const fullName = `${user?.First_Name || ""} ${
    user?.Last_Name || ""
  }`.trim();

  const initials =
    `${user?.First_Name?.[0] || ""}${user?.Last_Name?.[0] || ""}`.toUpperCase() || "User";

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      "Do you really want to logout?"
    );

    if (confirmLogout) {
      localStorage.removeItem("participant");
      navigate("/");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "220px",
        right: 0,
        height: "60px",
        background: "#264ECF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        boxSizing: "border-box",
        zIndex: 1000,
      }}
    >
      {/* Left Side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "40px",
          color: "white",
          fontWeight: "600",
        }}
      >
        <span>
          {user.Organization ||
            user.organization ||
            user.Organisation ||
            "Organization Name"}
        </span>

        <span>KNAV BAS OD</span>
      </div>

      {/* Right Side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {fullName || "Participant"}
          </span>
        </div>

        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "700",
            fontSize: "14px",
          }}
        >
          {initials}
        </div>

        <div
          style={{
            width: "1px",
            height: "35px",
            background: "rgba(255,255,255,0.3)",
          }}
        />

        <div
          onClick={handleLogout}
          style={{
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "16px",
          }}
        >
          ↪ Logout
        </div>
      </div>
    </div>
  );
}
