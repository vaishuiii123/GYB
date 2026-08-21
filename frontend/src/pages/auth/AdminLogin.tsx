import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

import myImage from "../../images/KNAV logo.png";
import { Lock, Target, TrendingUp, Users } from "lucide-react";
import "../../styles/UserLogin.css";
import "../../styles/AdminLogin.css";

import {
  adminLoginRequest,
  MSAL_LOGIN_TARGET_KEY,
} from "../../authConfig";
import "../../styles/AdminLogin.css";

type LoginProps = {
  onLogin: (user?: any) => void;
};

const ADMIN_ROLES = ["organizer", "admin"];

const getCheckEmailUrl = () => {
  // Bypass Vite proxy locally — it can return intermittent 502s after MSAL redirect.
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:7071/api/check-email";
  }
  return "/api/check-email";
};

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
  const payload = JSON.stringify({
    email: emailToCheck.trim().toLowerCase(),
  });

  let response: Response | null = null;
  let lastError: unknown = null;

  // Retry briefly: Vite proxy can return transient 502s right after MSAL redirect.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      response = await fetch(getCheckEmailUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        signal: controller.signal,
      });

      if (response.ok || (response.status !== 502 && response.status !== 503)) {
        break;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      response = null;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to reach email validation API.");
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

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
    email: emailToCheck.trim().toLowerCase(),
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

  const loginTarget = sessionStorage.getItem(MSAL_LOGIN_TARGET_KEY);

  if (loginTarget !== "admin") {
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

  const account = accounts[0];
  const microsoftEmail = account.username?.trim().toLowerCase();

  if (!microsoftEmail) {
    setMessage("Unable to retrieve your Microsoft account.");
    setLoading(false);
    return;
  }

  setEmail(microsoftEmail);
  setLoading(true);
  setMessage("Verifying admin access...");

  verifyAdminEmail(microsoftEmail)
    .catch((err) => {
      console.error("Admin verification failed:", err);
      if (err?.name === "AbortError") {
        setMessage("Admin verification is taking too long. Please try again.");
      } else {
        const detail =
          err instanceof Error && err.message
            ? ` (${err.message})`
            : "";
        setMessage(`Unable to validate email.${detail}`);
      }
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
        <div className="user-login-page">
          <aside className="user-login-brand">
            <img src={myImage} alt="KNAV" className="user-login-logo" />
            <div className="user-login-brand-copy">
              <h1>GROW YOUR BUSINESS</h1>
              <p className="user-login-brand-subtitle">
                Organisation Development Workshop
              </p>
            </div>
            <div className="user-login-brand-art" aria-hidden />
          </aside>
          <section className="user-login-panel">
            <div className="user-login-card">
              <p className="user-login-label" style={{ textAlign: "center" }}>
                Signing in with Microsoft...
              </p>
            </div>
          </section>
        </div>
      );
    }
  
    return (
      <div className="user-login-page">
        <aside className="user-login-brand">
          <img src={myImage} alt="KNAV" className="user-login-logo" />
  
          <div className="user-login-brand-copy">
            <h1>GROW YOUR BUSINESS</h1>
            <p className="user-login-brand-subtitle">
              Organisation Development Workshop
            </p>
  
            <ul className="user-login-features">
              <li>
                <span className="user-login-feature-icon" aria-hidden>
                  <TrendingUp size={20} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>Strategic Growth</strong>
                  <span>Unlock your potential and drive sustainable growth</span>
                </div>
              </li>
              <li>
                <span className="user-login-feature-icon" aria-hidden>
                  <Users size={20} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>Organisational Excellence</strong>
                  <span>
                    Strengthen capabilities, optimise execution and build for scale
                  </span>
                </div>
              </li>
              <li>
                <span className="user-login-feature-icon" aria-hidden>
                  <Target size={20} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>Business Impact</strong>
                  <span>Deliver measurable results and long-term value</span>
                </div>
              </li>
            </ul>
          </div>
  
          <div className="user-login-brand-art" aria-hidden />
        </aside>
  
        <section className="user-login-panel">
          <div className="user-login-card">
            <div className="user-login-card-header" style={{ marginBottom: 18 }}>
              <span className="user-login-card-avatar" aria-hidden>
                <Lock size={22} strokeWidth={2} />
              </span>
              <div>
                <h2>Welcome Back</h2>
                <p>Sign in with Microsoft or your registered admin email</p>
              </div>
            </div>
  
            {message ? (
              <div
                className={
                  isSuccessMessage ? "user-login-info" : "user-login-error"
                }
              >
                {message}
              </div>
            ) : null}

            <button
              type="button"
              className="user-login-btn user-login-btn-outline"
              onClick={handleMicrosoftLogin}
              disabled={loading}
            >
              Continue with Microsoft
            </button>

            
          <br></br>
          <br></br>
  
            <Link to="/" className="user-login-link-btn">
              Back to participant login
            </Link>
          </div>
  
          <p className="user-login-footer">© 2026 KNAV. All rights reserved.</p>
        </section>
      </div>
    );
}
