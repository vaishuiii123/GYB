
import { Link, useNavigate } from "react-router-dom";

export default function UserLogin() {

  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {

  const response = await fetch("/api/user-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      organization,
      password,
    }),
  });

  const data = await response.json();
      if (data.success) {
        localStorage.setItem(
          "participant",
          JSON.stringify(data.user)
        );
        navigate("/dashboard");
      } else {
        alert("Invalid credentials");
      }
  };
  
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Left Side */}
      <div
        style={{
          width: "45%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo */}
        <img
          src="/knav-logo.png"
          alt="KNAV"
          style={{
            position: "absolute",
            top: "40px",
            left: "40px",
            width: "140px",
          }}
        />

        {/* Background Shape */}
        <div
          style={{
            width: "500px",
            height: "350px",
            background:
              "linear-gradient(90deg,#efefef,#fafafa,#efefef)",
            clipPath:
              "polygon(0 0,60% 0,100% 50%,60% 100%,0 100%,40% 50%)",
            opacity: 0.7,
          }}
        />
      </div>

      {/* Right Side */}
      <div
        style={{
          width: "55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: "120px",
        }}
      >
        {/* Top Links */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "60px",
            display: "flex",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#7b0f2c",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            About KNAV
          </span>

          <span style={{ fontSize: "24px" }}>🌐</span>
          <span style={{ fontSize: "24px" }}>in</span>
        </div>

        {/* Heading */}
        <h1
          style={{
            color: "#7b0f2c",
            fontSize: "58px",
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          GROW YOUR BUSINESS
        </h1>

        <h2
          style={{
            color: "#5f5f5f",
            fontWeight: 400,
            marginBottom: "50px",
          }}
        >
          Organisation Development Workshop
        </h2>

        {/* Form */}
        <div
          style={{
            width: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Username"
            style={inputStyle}
          />

         <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Organization name"
            style={inputStyle}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={inputStyle}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={handleLogin}
              style={{
                background: "#7b0f2c",
                color: "white",
                border: "none",
                padding: "12px 24px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Get Started
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
              fontSize: "13px",
              color: "#555",
            }}
          >
            <span>Remember me</span>
            <span>Need Help?</span>
          </div>

          {/* Admin Login Link */}
          <div
            style={{
              textAlign: "center",
              marginTop: "30px",
            }}
          >
           <Link
            to="/adminlogin"
            style={{
              color: "#7b0f2c",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Admin Login
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: "42px",
  border: "none",
  background: "white",
  padding: "0 15px",
  fontSize: "14px",
  outline: "none",
} as React.CSSProperties;
