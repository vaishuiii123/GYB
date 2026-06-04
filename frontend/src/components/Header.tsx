
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
    left: "220px",
    right: 0,
    height: "60px",
    background: "#264ECF",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 30px",
    boxSizing: "border-box",
    zIndex: 1000,
  }}
>
  {/* LEFT SIDE */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "25px",
      color: "white",
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
          background: "rgba(255,255,255,0.2)",
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
        background: "rgba(255,255,255,0.3)",
      }}
    />
  </div>

  {/* RIGHT SIDE */}
  <div
    onClick={handleLogout}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "18px",
      color: "white",
    }}
  >
    ↪ Logout
  </div>
</div>  
  );
}
