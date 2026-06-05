import UserHeader from "./pages/User/UserHeader";

export default function UserDashboard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "30px 50px",
        paddingTop: "90px", // Space for fixed header
        fontFamily: "Segoe UI",
      }}
    >
      <UserHeader />

      {/* Main Card */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "40px 60px",
          minHeight: "350px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        {[
          "Vision And Mission Statement",
          "Questionnaire",
          "List of Actionables",
          "Workshop Feedback",
        ].map((item, index) => (
          <div key={index}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                color: "#555",
                marginBottom: "20px",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              <span
                style={{
                  color: "#7b0f2c",
                  fontSize: "18px",
                }}
              >
                ❖
              </span>

              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                {item}
              </span>
            </div>

            {index !== 3 && (
              <div
                style={{
                  width: "300px",
                  height: "1px",
                  background: "#d6d6d6",
                  marginLeft: "35px",
                  marginBottom: "25px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "60px",
          color: "#555",
          fontSize: "13px",
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        Grow Your Business: Organization Development Workshop
      </div>
    </div>
  );
}
