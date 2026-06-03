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
      position: "fixed",
      top: 0,
      left: "260px", // same as sidebar width
      right: 0,
      height: "70px",
      background: "#2f56d4",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 35px",
      boxSizing: "border-box",
      zIndex: 1000,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    {/* LEFT */}
    <div
      style={{
        width: "46px",
        height: "46px",
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.25)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontSize: "22px",
        cursor: "pointer",
      }}
    >
      ☰
    </div>

    {/* RIGHT */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "25px",
        color: "white",
      }}
    >
      {/* USER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "20px",
          }}
        >
          👤
        </div>

        <span
          style={{
            fontWeight: "600",
            fontSize: "18px",
          }}
        >
          {user?.name || "User"}
        </span>

        <span style={{ fontSize: "12px" }}>▼</span>
      </div>

      {/* DIVIDER */}
      <div
        style={{
          width: "1px",
          height: "35px",
          background: "rgba(255,255,255,0.25)",
        }}
      />

      {/* LOGOUT */}
      <div
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "18px",
        }}
      >
        <span style={{ fontSize: "24px" }}>↪</span>
        Logout
      </div>
    </div>
  </div>
);
}
