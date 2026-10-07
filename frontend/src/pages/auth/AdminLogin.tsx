import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

import myImage from "../../images/KNAV logo.png";
import { BarChart3, Target, Users } from "lucide-react";
import "../../styles/UserLogin.css";
import "../../styles/AdminLogin.css";

import {
  adminLoginRequest,
  MSAL_LOGIN_TARGET_KEY,
} from "../../authConfig";

type LoginProps = {
  onLogin: (user?: any) => void;
};

const ADMIN_ROLES = ["organizer", "admin"];

const getCheckEmailUrl = () => "/api/check-email";

function LinkedInIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function LoginShell({
  children,
  showFeatures = true,
}: {
  children: ReactNode;
  showFeatures?: boolean;
}) {
  return (
    <div className="user-login-page">
      <header className="user-login-topbar">
        <div className="user-login-brand-mark">
          <img src={myImage} alt="KNAV" className="user-login-logo" />
          <p className="user-login-tagline">Partners Beyond Boundaries</p>
        </div>

        <nav className="user-login-toplinks" aria-label="External links">
          <a
            href="https://in.knavcpa.com/"
            className="user-login-about"
            target="_blank"
            rel="noopener noreferrer"
          >
            About KNAV
          </a>
          <span className="user-login-toplinks-divider" aria-hidden />
          <a
            href="https://in.linkedin.com/company/knav-ind/"
            className="user-login-icon-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <LinkedInIcon />
          </a>
        </nav>
      </header>

      <div className="user-login-body">
        <aside className="user-login-brand">
          <div className="user-login-brand-copy">
            <div className="user-login-brand-accent" aria-hidden />
            <h1>Grow Your Business</h1>
            <p className="user-login-brand-subtitle">
              Organisation Development Workshop
            </p>
            <p className="user-login-brand-desc">
              Unlock people potential, strengthen capabilities and build a more
              resilient tomorrow.
            </p>

            {showFeatures ? (
              <ul className="user-login-features">
                <li>
                  <span className="user-login-feature-icon" aria-hidden>
                    <BarChart3 size={28} strokeWidth={2} />
                  </span>
                  <strong>Strategic Growth</strong>
                </li>
                <li>
                  <span className="user-login-feature-icon" aria-hidden>
                    <Users size={28} strokeWidth={2} />
                  </span>
                  <strong>Organisational Excellence</strong>
                </li>
                <li>
                  <span className="user-login-feature-icon" aria-hidden>
                    <Target size={28} strokeWidth={2} />
                  </span>
                  <strong>Business Impact</strong>
                </li>
              </ul>
            ) : null}
          </div>

          <div className="user-login-brand-footer">
            <div className="user-login-brand-footer-line" aria-hidden />
            <p>Partners Beyond Boundaries</p>
          </div>
        </aside>

        <section className="user-login-panel">{children}</section>
      </div>
    </div>
  );
}

export default function AdminLogin({ onLogin }: LoginProps) {
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
      if (response.status >= 500) {
        throw new Error(
          `API_SERVER_${response.status}: The login service is temporarily unavailable.`
        );
      }
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

    setLoading(true);
    setMessage("Verifying admin access...");

    verifyAdminEmail(microsoftEmail)
      .catch((err) => {
        console.error("Admin verification failed:", err);
        if (err?.name === "AbortError") {
          setMessage("Admin verification is taking too long. Please try again.");
        } else if (
          err instanceof Error &&
          /API_SERVER_/i.test(err.message)
        ) {
          setMessage(
            "Login service is down (API error). The Function App behind production needs to be fixed or redeployed."
          );
        } else if (
          err instanceof TypeError ||
          (err instanceof Error && /failed to fetch|networkerror/i.test(err.message))
        ) {
          setMessage(
            "Unable to reach the login service. Make sure the API is running, then try again."
          );
        } else {
          setMessage("Unable to validate email. Please try again.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accounts, inProgress]);

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

  const isSuccessMessage = message.toLowerCase().includes("verified");
  const isRedirecting =
    inProgress === InteractionStatus.HandleRedirect ||
    inProgress === InteractionStatus.Startup;

  if (isRedirecting) {
    return (
      <LoginShell showFeatures={false}>
        <div className="user-login-card">
          <p className="user-login-label" style={{ textAlign: "center" }}>
            Signing in with Microsoft...
          </p>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <div className="user-login-card">
        <div className="user-login-card-header">
          <h2>Welcome Back</h2>
          <p>Sign in with Microsoft or your registered admin email</p>
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

        <Link to="/" className="user-login-link-btn">
          Back to participant login
        </Link>
      </div>

      <p className="user-login-footer">© 2026 KNAV. All rights reserved.</p>
    </LoginShell>
  );
}
