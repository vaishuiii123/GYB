type SidebarProps = {
  activePage: string;
  setActivePage: (page: string) => void;
};

export default function Sidebar({
  activePage,
  setActivePage,
}: SidebarProps) {
  const menuItems = [
    "Dashboard",
    "Organization",
    "Template",
    "Workshop",
  ];

  return (
    <div
      style={{
        width: "250px",
        background: "white",
        position: "fixed",
        top: "80px",
        left: 0,
        height: "100vh",
        padding: "25px 20px",
        boxSizing: "border-box",
        borderRight: "1px solid #e5e7eb",
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
          <button
            key={item}
            onClick={() => setActivePage(item)}
            style={{
              background:
                activePage === item
                  ? "#8B0022"
                  : "transparent",

              color:
                activePage === item
                  ? "white"
                  : "#111827",

              border: "none",

              padding: "16px 20px",

              borderRadius: "12px",

              fontSize: "18px",

              fontWeight: "600",

              cursor: "pointer",

              textAlign: "left",
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
