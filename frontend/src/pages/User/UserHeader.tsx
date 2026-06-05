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
    `${user?.First_Name?.[0] || ""}${user?.Last_Name?.[0] || ""}`.toUpperCase() ||
    "U";

  const handleLogout = () => {
    if (window.confirm("Do you really want to logout?")) {
      localStorage.removeItem("participant");
      navigate("/");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "70px",
        background: "#264ECF",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 40px",
        boxSizing: "border-box",
        zIndex: 1000,
      }}
    >
      {/* Left Side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "50px",
          color: "white",
          fontWeight: "600",
          fontSize: "20px",
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
        <span
          style={{
            fontWeight: "600",
            fontSize: "18px",
          }}
        >
          {fullName || "Participant"}
        </span>

        <div
          style={{
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "16px",
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

        <span
          onClick={handleLogout}
          style={{
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "18px",
          }}
        >
          ↪ Logout
        </span>
      </div>
    </div>
  );
}
