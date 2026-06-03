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
        width: "220px",
        background: "#081B45",
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 1001,
      }}
    >
      <div>
        <div
          style={{
            padding: "25px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "#2E5BFF",
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
                  fontWeight: "700",
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
                background: isActive ? "#2E5BFF" : "transparent",
                padding: "12px 16px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "15px",
                fontWeight: isActive ? "600" : "500",
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
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        🚪 Logout
      </div>
    </div>
  );
}
