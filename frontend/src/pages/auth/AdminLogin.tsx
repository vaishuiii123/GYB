import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import {
  adminLoginRequest,
  MSAL_LOGIN_TARGET_KEY,
} from "../../authConfig";
import "../../styles/AdminLogin.css";

type LoginProps = {
  onLogin: (user?: any) => void;
};

const ADMIN_ROLES = ["organizer", "admin"];

export default function AdminLogin({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { instance, accounts, inProgress } = useMsal();
  const handledRedirect = useRef(false);

  const completeAdminLogin = (user: {
    name: string;
    role: string;
    email: string;
  }) => {
    onLogin(user);
    navigate("/dashboard");
  };

  const verifyAdminEmail = async (emailToCheck: string) => {
    const response = await fetch("/api/check-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: emailToCheck }),
    });

    const data = await response.json();

    if (!data.found) {
      setMessage("Email not registered for admin access.");
      return false;
    }

    const role = String(data.role || "").toLowerCase();

    if (!ADMIN_ROLES.includes(role)) {
      setMessage("This account does not have admin access.");
      return false;
    }

    setMessage("Email verified.");
    completeAdminLogin({
      name: data.name,
      role: data.role,
      email: emailToCheck,
    });
    return true;
  };

  useEffect(() => {
    if (handledRedirect.current) {
      return;
    }

    if (inProgress !== InteractionStatus.None) {
      return;
    }

    if (sessionStorage.getItem(MSAL_LOGIN_TARGET_KEY) !== "admin") {
      return;
    }

    if (accounts.length === 0) {
      sessionStorage.removeItem(MSAL_LOGIN_TARGET_KEY);
      setMessage("Microsoft sign-in failed.");
      setLoading(false);
      return;
    }

    handledRedirect.current = true;
    sessionStorage.removeItem(MSAL_LOGIN_TARGET_KEY);

    const microsoftEmail = accounts[0].username;

    if (!microsoftEmail) {
      setMessage("Unable to retrieve your Microsoft account.");
      setLoading(false);
      return;
    }

    setEmail(microsoftEmail);
    setLoading(true);

    verifyAdminEmail(microsoftEmail)
      .catch((err) => {
        console.error(err);
        setMessage("Unable to validate email.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accounts, inProgress]);

  const checkEmail = async () => {
    if (!email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      await verifyAdminEmail(email.trim());
    } catch (err) {
      console.error(err);
      setMessage("Unable to validate email.");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setMessage("");
      sessionStorage.setItem(MSAL_LOGIN_TARGET_KEY, "admin");
      await instance.loginRedirect(adminLoginRequest);
    } catch (err) {
      console.error(err);
      sessionStorage.removeItem(MSAL_LOGIN_TARGET_KEY);
      setMessage("Microsoft sign-in failed.");
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !loading) {
      checkEmail();
    }
  };

  const isSuccessMessage = message.toLowerCase().includes("verified");
  const isRedirecting =
    inProgress === InteractionStatus.HandleRedirect ||
    inProgress === InteractionStatus.Startup;

  if (isRedirecting) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <p className="admin-login-subtitle">Signing in with Microsoft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-icon">📧</div>

        <h1 className="admin-login-title">Welcome Back</h1>

        <p className="admin-login-subtitle">
          Sign in with Microsoft or use your registered admin email
        </p>

        <input
          type="email"
          placeholder="Enter Email ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className="admin-login-input"
          disabled={loading}
        />

        {message && (
          <div
            className={`admin-login-message ${
              isSuccessMessage ? "success" : "error"
            }`}
          >
            {message}
          </div>
        )}

        <button
          onClick={checkEmail}
          className="admin-login-primary-btn"
          disabled={loading}
        >
          {loading ? "Please wait..." : "Continue"}
        </button>

        <div className="admin-login-divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <button
          onClick={handleMicrosoftLogin}
          className="admin-login-microsoft-btn"
          disabled={loading}
          type="button"
        >
          Continue with Microsoft
        </button>

        <Link to="/" className="admin-login-back-link">
          Back to participant login
        </Link>
      </div>
    </div>
  );
}
