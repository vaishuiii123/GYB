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

  return (
    <div
      style={{
        width: "200px",
        background: "linear-gradient(135deg, #2563eb, #1e40af)",
        position: "fixed",
        top: "50px",
        left: 0,
        height: "calc(100vh - 70px)",
        boxSizing: "border-box",
        padding: "25px 20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: "none",
              background: isActive ? "white" : "transparent",
              color: isActive ? "#1e40af" : "white",
              padding: "10px 20px",
              borderRadius: "12px",
              fontWeight: isActive ? "600" : "500",
              fontSize: "15px",
              display: "block",
              transition: "0.3s",
            })}
          >
            {item.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
