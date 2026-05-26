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
      <Header />
      <Sidebar />

      <div
        style={{
          marginLeft: "250px",
          paddingTop: "90px",
          paddingLeft: "30px",
          paddingRight: "30px",
        }}
      >
        <h1
          style={{
            fontSize: "34px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "30px",
          }}
        >
          Dashboard
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "25px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "18px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <h3>Total Users</h3>
            <h1>120</h1>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "18px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <h3>Active Projects</h3>
            <h1>18</h1>
          </div>

          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "18px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <h3>Pending Tasks</h3>
            <h1>42</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
