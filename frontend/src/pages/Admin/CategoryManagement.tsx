import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function CategoryManagement({ user }: PageProps) {
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
            <h1
              style={{
                fontSize: "32px",
                color: "#111827",
              }}
            >
              Category Management
            </h1>

            <p>Welcome to GYB Category Management</p>
          </div>
        </div>
      </div>
    </>
  );
}
