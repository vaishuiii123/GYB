import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Participants({ user }: PageProps) {
  return (
    <>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f3f4f6",
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            marginLeft: "220px",
          }}
        >
          <Header user={user} />

          <div
            style={{
              padding: "25px",
              marginTop: "70px",
            }}
          >
            {/* HEADER */}
            <div style={pageHeader}>
              <h1 style={pageTitle}>Participants</h1>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
              </div>
            </div>

            {/* CONTENT */}
            <div style={card}>
              <h3>Participants Page</h3>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= STYLES ================= */

const card = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const pageTitle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};
