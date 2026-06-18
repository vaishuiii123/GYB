import { NavLink } from "react-router-dom";

export default function Sidebar() {

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Organization", path: "/organization", icon: "🏢" },
    { name: "Participants", path: "/participants", icon: "👥" },
    { name: "Category Management", path: "/category", icon: "📂" },
    { name: "Questions", path: "/questions", icon: "❓" },
    { name: "Template", path: "/template", icon: "📄" },
    { name: "Workshop", path: "/workshop", icon: "🎓" },
  ];

  return (

    <div
      style={{
        width: "220px",
        background: "white",

        position: "fixed",
        top: "60px",
        left: 0,

        height: "calc(100vh - 60px)",

        overflowY: "auto",

        borderRight:
          "1px solid rgba(255,255,255,0.08)",

        zIndex: 999,

        fontFamily:
          '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      }}
    >

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >

        {menuItems.map((item) => (

          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: "none",

              color: "black",

              background: isActive
                ? "#9B304A"
                : "transparent",

              padding: "14px 18px",

              borderRadius: "10px",

              display: "flex",
              alignItems: "center",

              gap: "12px",

              fontSize: "15px",

              fontWeight: isActive
                ? 600
                : 500,

              transition:
                "all 0.2s ease",
            })}
          >

            <span
              style={{
                width: "22px",
                textAlign: "center",
                fontSize: "18px",
              }}
            >
              {item.icon}
            </span>

            <span>
              {item.name}
            </span>

          </NavLink>

        ))}

      </div>

    </div>
  );
}
