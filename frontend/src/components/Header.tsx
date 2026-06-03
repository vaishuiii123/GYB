import { useMsal } from "@azure/msal-react";

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

  const initials =
  user?.name
    ?.split(" ")
    .map((word: string) => word[0])
    .join("")
    .toUpperCase() || "U";
  
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "220px",
        right: 0,
        height: "60px",
        background: "#264ECF",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
        boxSizing: "border-box",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "45px",
          height: "45px",
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "25px",
          color: "white",
        }}
      >
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
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: "600",
            }}
          >
            {initials}
          </div>
         </div>
        <div
          style={{
            width: "1px",
            height: "35px",
            background: "rgba(255,255,255,0.3)",
          }}
        />

        <div
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "18px",
          }}
        >
          ↪ Logout
        </div>
      </div>
    </div>
  );
}
