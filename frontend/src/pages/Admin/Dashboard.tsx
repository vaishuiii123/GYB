import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Dashboard() {
  return (
    <div
      style={{
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      
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
            fontSize: "40px",
            fontWeight: "700",
          }}
        >
          Dashboard
        </h1>
      </div>
    </div>
  );
}
