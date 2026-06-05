import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("participant") || "{}"
  );

  const handleLogout = () => {
    localStorage.removeItem("participant");
    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "30px 50px",
        fontFamily: "Segoe UI",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              color: "#7b0f2c",
              fontWeight: "700",
              fontSize: "24px",
            }}
          >
            ☰
            <span>
              [{user.First_Name || user.firstName || "Name"}]
            </span>
          </div>

          <div
            style={{
              marginTop: "30px",
              marginLeft: "40px",
              display: "flex",
              gap: "80px",
              color: "#7b0f2c",
              fontWeight: "600",
            }}
          >
            <span>
              [{user.Organization || user.organization || "Organization Name"}]
            </span>

            <span>KNAV BAS OD</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            color: "#7b0f2c",
            fontWeight: "600",
          }}
        >
          <span
            onClick={handleLogout}
            style={{
              cursor: "pointer",
            }}
          >
            Logout
          </span>

          <span>Home</span>
          <span style={{ fontSize: "24px" }}>🌐</span>
          <span style={{ fontSize: "24px" }}>in</span>
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          marginTop: "50px",
          padding: "40px 60px",
          minHeight: "350px",
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
                fontSize: "28px",
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
                  width: "270px",
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
          color: "#333",
          fontSize: "13px",
          fontStyle: "italic",
        }}
      >
        Grow Your Business: organization Development Workshop
      </div>
    </div>
  );
}
