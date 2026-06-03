import { useMsal } from "@azure/msal-react";

type HeaderProps = {
  user?: {
    name?: string;
    role?: string;
    email?: string;
  } | null;
};

export default function Header({ user }: any) {
  const { instance } = useMsal();

  const handleLogout = async () => {
    const currentAccount = instance.getActiveAccount();

    await instance.logoutRedirect({
      account: currentAccount || undefined,
      postLogoutRedirectUri:
        "https://gentle-sea-0636fbe10.7.azurestaticapps.net",
    });
  };

 return (
  <div
    style={{
      height: "70px",
      background: "white",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 25px",
      boxSizing: "border-box",
      position: "fixed",
      top: 0,
      left: "220px", // same as sidebar width
      right: 0,
      zIndex: 1000,
    }}
  >
    {/* LEFT SECTION */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
      }}
    >
      {/* Menu Icon */}
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          background: "#3b5bcc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "20px",
          cursor: "pointer",
        }}
      >
        ☰
      </div>

      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "16px",
        }}
      >
        <span style={{ color: "#6b7280" }}>Dashboard</span>

        <span style={{ color: "#9ca3af" }}>/</span>

        <span
          style={{
            color: "#3b5bcc",
            fontWeight: "600",
          }}
        >
          Organization
        </span>
      </div>
    </div>

    {/* RIGHT SECTION */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
      }}
    >
      {/* Search */}
      <input
        placeholder="Search..."
        style={{
          width: "260px",
          height: "42px",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "0 15px",
          fontSize: "14px",
          outline: "none",
          background: "#f9fafb",
        }}
      />

      {/* Notification */}
      <div
        style={{
          fontSize: "22px",
          cursor: "pointer",
        }}
      >
        🔔
      </div>

      {/* User */}
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
            background: "#3b5bcc",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600",
          }}
        >
          U
        </div>

        <div
          style={{
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {user?.name || "User"}
        </div>

        <span
          style={{
            color: "#6b7280",
            cursor: "pointer",
          }}
        >
          ▼
        </span>
      </div>
    </div>
  </div>
);
}
