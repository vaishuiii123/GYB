import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Organization", path: "/organization", icon: "🏢" },
    { name: "Participants", path: "/participants", icon: "🏢" },
    { name: "Category Management", path: "/category", icon: "📂" },
    { name: "Questions", path: "/questions", icon: "❓" },
    { name: "Template", path: "/template", icon: "📄" },
    { name: "Workshop", path: "/workshop", icon: "🎓" },
  ];

  return (
    <div
      style={{
        width: "220px",
        background: "#741D34", // ✅ KNAV primary
        position: "fixed",
        left: 0,
        top: "60px",
        height: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 1001,
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', // ✅ font updated
      }}
    >
      <div>
        {/* Logo/Header */}
            {/* Menu */}
        <div
          style={{
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                textDecoration: "none",
                color: "white",
                background: isActive ? "#8A2D45" : "transparent", // ✅ active color
                padding: "12px 16px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "14px",
                fontWeight: isActive ? "600" : "500",
                transition: "all 0.2s ease",
              })}
            >
              <span>{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
