import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  return (
    <div
      style={{
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      {/* Header */}


      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        style={{
          marginLeft: "250px",
          marginTop: "60px",
          padding: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "52px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "40px",
          }}
        >
          Dashboard
        </h1>

        <div
          style={{
            display: "flex",
            gap: "30px",
            flexWrap: "wrap",
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: "white",
              width: "320px",
              padding: "40px",
              borderRadius: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                marginBottom: "20px",
                color: "#111827",
              }}
            >
              Total Users
            </h2>

            <p
              style={{
                fontSize: "48px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              120
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: "white",
              width: "320px",
              padding: "40px",
              borderRadius: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                marginBottom: "20px",
                color: "#111827",
              }}
            >
              Active Projects
            </h2>

            <p
              style={{
                fontSize: "48px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              18
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: "white",
              width: "320px",
              padding: "40px",
              borderRadius: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                marginBottom: "20px",
                color: "#111827",
              }}
            >
              Pending Tasks
            </h2>

            <p
              style={{
                fontSize: "48px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              42
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
