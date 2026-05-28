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
        width: "240px",
        background: "white",

        position: "fixed",
        top: "70px",
        left: 0,

        height: "calc(100vh - 70px)",

        borderRight: "1px solid #e5e7eb",

        padding: "25px 18px",
        boxSizing: "border-box",

        overflowY: "auto",

        zIndex: 999,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: "none",

              background: isActive
                ? "#8B0022"
                : "transparent",

              color: isActive
                ? "white"
                : "#111827",

              padding: "16px 20px",

              borderRadius: "12px",

              fontWeight: isActive
                ? "600"
                : "500",

              fontSize: "18px",

              transition:
                "all 0.2s ease",

              display: "block",
            })}
          >
            {item.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
