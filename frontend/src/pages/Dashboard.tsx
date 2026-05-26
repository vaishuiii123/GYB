import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <Header />

        {/* Content */}
        <main className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Dashboard
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-gray-500 text-sm">
                Total Users
              </h2>

              <p className="text-3xl font-bold mt-2">
                120
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-gray-500 text-sm">
                Active Projects
              </h2>

              <p className="text-3xl font-bold mt-2">
                18
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-gray-500 text-sm">
                Pending Tasks
              </h2>

              <p className="text-3xl font-bold mt-2">
                42
              </p>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
