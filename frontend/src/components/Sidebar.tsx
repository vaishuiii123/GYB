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
        top: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 1001,
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', // ✅ font updated
      }}
    >
      <div>
        {/* Logo/Header */}
        <div
          style={{
            padding: "25px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "#8A2D45", // ✅ lighter maroon
                borderRadius: "12px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                fontSize: "24px",
              }}
            >
              🏢
            </div>

            <div>
              <div
                style={{
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                KNAV Portal
              </div>

              <div
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "12px",
                }}
              >
                Workshop Management System
              </div>
            </div>
          </div>
        </div>

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
