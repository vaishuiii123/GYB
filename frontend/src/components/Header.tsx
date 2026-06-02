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
    height: "60px",
    width: "100%",
    background: "linear-gradient(90deg, #93c5fd, #60a5fa)", // ✅ light blue
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    boxSizing: "border-box",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
  }}
>
      {/* LEFT */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <div
          style={{
            width: "45px",
            height: "45px",
            background: "#2563eb",
            color: "white",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "20px",
            fontWeight: "600",
          }}
        >
          K
        </div>

        <div>
          <div
  style={{
    fontSize: "20px",
    fontWeight: "600",
    color: "white", // ✅ changed
  }}
>
  KNAV Portal
</div>

<div
  style={{
    fontSize: "13px",
    color: "#e0f2fe", // ✅ light text for contrast
    marginTop: "5px",
  }}
>
  Workshop Management System
</div>
        </div>
      </div>

      {/* RIGHT */}
     
<div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
  
  <div style={{ fontWeight: "600", color: "white" }}>
  {user?.name || "User"}
</div>

  </div>

  <button
          onClick={handleLogout}
          style={{
            background: "white",
            color: "#2563eb",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
