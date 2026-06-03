import { NavLink } from "react-router-dom";

export default function Sidebar() {
 const menuItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: "📊",
  },
  {
    name: "Organization",
    path: "/organization",
    icon: "🏢",
  },
  {
    name: "Template",
    path: "/template",
    icon: "📄",
  },
  {
    name: "Workshop",
    path: "/workshop",
    icon: "🎓",
  },
];

  return (
  <div
    style={{
      width: "240px",
      background: "#081B45",
      position: "fixed",
      left: 0,
      top: 0,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div
        style={{
          padding: "25px",
          color: "white",
          fontSize: "24px",
          fontWeight: "600",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        🏢 Admin Panel
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "15px",
        }}
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: "none",
              background: isActive ? "#2E5BFF" : "transparent",
              color: "white",
              padding: "14px 18px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "16px",
            })}
          >
            <span>{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </div>
    </div>

    <div
      style={{
        padding: "20px",
        color: "white",
        fontSize: "16px",
        cursor: "pointer",
      }}
    >
      🚪 Logout
      </div>
    </div>
  );
}
