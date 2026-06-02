import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
    },
    {
      name: "Organization",
      path: "/organization",
    },
    {
      name: "Template",
      path: "/template",
    },
    {
      name: "Workshop",
      path: "/workshop",
    },
  ];

  import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Organization", path: "/organization", icon: "🏢" },
    { name: "Template", path: "/template", icon: "📄" },
    { name: "Workshop", path: "/workshop", icon: "🧑‍🏫" },
  ];

  return (
    <div
      style={{
        width: "230px",
        background: "#1e3a8a",
        position: "fixed",
        top: "0",
        left: 0,
        height: "100vh",
        padding: "25px 15px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Section */}
      <div>
        {/* Logo / Header */}
        <div
          style={{
            color: "white",
            fontSize: "20px",
            fontWeight: "bold",
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          Grow Your Business
        </div>

        {/* Menu */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                textDecoration: "none",
                background: isActive ? "white" : "transparent",
                color: isActive ? "#1e3a8a" : "white",
                padding: "12px 15px",
                borderRadius: "10px",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: isActive ? "600" : "400",
                transition: "0.3s",
              })}
            >
              <span>{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom Section (Optional) */}
      <div
        style={{
          color: "#cbd5f5",
          fontSize: "12px",
          textAlign: "center",
          marginBottom: "10px",
        }}
      >
        © GYB System
      </div>
    </div>
  );

}
