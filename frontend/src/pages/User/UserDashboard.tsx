import UserHeader from "./UserHeader";

export default function UserDashboard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        fontFamily: "Segoe UI",
      }}
    >
      <UserHeader />

      {/* Content Area */}
      <div
        style={{
          paddingTop: "110px",
          paddingLeft: "50px",
          paddingRight: "50px",
        }}
      >
        {/* Main Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "40px 60px",
            minHeight: "450px",
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
                    fontSize: "22px",
                    fontWeight: "600",
                  }}
                >
                  {item}
                </span>
              </div>

              {index !== 3 && (
                <div
                  style={{
                    width: "350px",
                    height: "1px",
                    background: "#d6d6d6",
                    marginLeft: "35px",
                    marginBottom: "30px",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "50px",
            textAlign: "center",
            color: "#555",
            fontSize: "13px",
            fontStyle: "italic",
          }}
        >
          Grow Your Business: Organization Development Workshop
        </div>
      </div>
    </div>
  );
}
