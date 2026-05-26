import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email === "admin@test.com" && password === "1234") {
      window.location.href = "/GYB/#/dashboard";
    } else {
      alert("Invalid Credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-md">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            Welcome Back
          </h1>
          <p className="text-gray-500 mt-2">
            Login to continue
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-5">
            <label className="block text-gray-700 mb-2">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all text-white py-3 rounded-xl font-semibold"
          >
            Login
          </button>
        </form>

      </div>
    </div>
  );
}
