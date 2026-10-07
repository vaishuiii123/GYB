import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import {
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Target,
  User,
  Users,
} from "lucide-react";

import myImage from "../../images/KNAV logo.png";
import { MSAL_LOGIN_TARGET_KEY } from "../../authConfig";
import { clearSelectedWorkshop } from "../../utils/selectedWorkshop";
import { clearAllCachedPageData } from "../../utils/workshopCache";
import "../../styles/UserLogin.css";

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

type LoginStep = "phone" | "otp";

export default function UserLogin() {
  const [step, setStep] = useState<LoginStep>("phone");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNo, setPhoneNo] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"password" | "otp" | "">("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const navigate = useNavigate();
  const { accounts, inProgress } = useMsal();
  const handledRedirect = useRef(false);

  const redirectUser = (role: string) => {
    switch (role) {
      case "Organizer":
        navigate("/dashboard");
        break;
      case "Participant":
        clearSelectedWorkshop();
        clearAllCachedPageData();
        navigate("/about-us");
        break;
      default:
        alert("No role has been assigned to this user.");
    }
  };

  const completeMicrosoftLogin = async (microsoftEmail: string) => {
    const response = await fetch("/api/sso-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: microsoftEmail }),
    });

    const data = await response.json();

    if (!data.success) {
      setErrorMessage("User not found.");
      return;
    }

    localStorage.setItem("participant", JSON.stringify(data.user));
    clearAllCachedPageData();
    redirectUser(data.user.role);
  };

  useEffect(() => {
    if (handledRedirect.current) {
      return;
    }

    if (inProgress !== InteractionStatus.None) {
      return;
    }

    if (sessionStorage.getItem(MSAL_LOGIN_TARGET_KEY) !== "participant") {
      return;
    }

    if (accounts.length === 0) {
      sessionStorage.removeItem(MSAL_LOGIN_TARGET_KEY);
      setErrorMessage("Microsoft sign-in failed.");
      setLoading(false);
      return;
    }

    handledRedirect.current = true;
    sessionStorage.removeItem(MSAL_LOGIN_TARGET_KEY);

    const microsoftEmail = accounts[0].username;

    if (!microsoftEmail) {
      setErrorMessage("Unable to retrieve your Microsoft account.");
      setLoading(false);
      return;
    }

    setLoading(true);

    completeMicrosoftLogin(microsoftEmail)
      .catch((err) => {
        console.error(err);
        setErrorMessage("Microsoft login failed.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accounts, inProgress]);

  const getPhoneDigits = () => phoneNo.replace(/\D/g, "");

  const validatePhone = () => {
    const digits = getPhoneDigits();

    if (!digits) {
      setErrorMessage("Please enter your phone number.");
      return null;
    }

    if (digits.length !== 10) {
      setErrorMessage("Enter a valid 10-digit mobile number.");
      return null;
    }

    return digits;
  };

  const handlePasswordLogin = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setErrorMessage("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);
      setLoadingAction("password");
      setErrorMessage("");
      setInfoMessage("");

      const response = await fetch("/api/participant-password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        setErrorMessage(
          isLocal
            ? "Unable to reach the login service. Make sure the API is running on port 7071."
            : "Unable to reach the login service. The API may be restarting after a deploy — wait a minute and try again."
        );
        return;
      }

      if (!data.success) {
        setErrorMessage(data.message || "Invalid username or password.");
        return;
      }

      if (data.skipOtp && data.user) {
        localStorage.setItem("participant", JSON.stringify(data.user));
        clearAllCachedPageData();
        redirectUser(data.user.role || "Participant");
        return;
      }

      const assignedPhone = String(data.user?.phoneNo || "").replace(/\D/g, "");

      if (assignedPhone.length !== 10) {
        setErrorMessage("No valid phone number is assigned to this user.");
        return;
      }

      setPhoneNo(assignedPhone);

      const otpResponse = await fetch("/api/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNo: assignedPhone }),
      });

      let otpData: any = null;
      try {
        otpData = await otpResponse.json();
      } catch {
        setErrorMessage(
          "Unable to send the verification code. Make sure the API is running."
        );
        return;
      }

      if (!otpData.success) {
        const rawOtpError = String(otpData.message || "");
        const isSmsIpBlocked = /ip blocked|bulksmslink|sms_dev_bypass/i.test(
          rawOtpError
        );
        setErrorMessage(
          isSmsIpBlocked
            ? "Unable to send the verification code right now. Please try again shortly, or contact your workshop organizer."
            : rawOtpError || "Unable to send OTP."
        );
        return;
      }

      setStep("otp");
      setInfoMessage(
        otpData.devOtp
          ? `Local OTP: ${otpData.devOtp}`
          : otpData.message || "OTP sent to your mobile number."
      );
      if (otpData.devOtp) {
        setOtp(String(otpData.devOtp));
      }
    } catch (error) {
      console.error(error);
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      setErrorMessage(
        isLocal
          ? "Unable to sign in. Check that the API (port 7071) is running, then try again."
          : "Unable to sign in. The API may be restarting after a deploy — wait a minute and try again."
      );
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  const handleSendOtp = async () => {
    const digits = validatePhone();
    if (!digits) {
      return;
    }

    try {
      setLoading(true);
      setLoadingAction("otp");
      setErrorMessage("");
      setInfoMessage("");

      const response = await fetch("/api/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNo: digits }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.message || "Unable to send OTP.");
        return;
      }

      setStep("otp");
      setInfoMessage(
        data.devOtp
          ? `Local OTP: ${data.devOtp}`
          : data.message || "OTP sent successfully."
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to send OTP.");
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  const handleVerifyOtp = async () => {
    const digits = validatePhone();
    if (!digits) {
      return;
    }

    if (!otp || otp.length < 4) {
      setErrorMessage("Enter the OTP sent to your phone.");
      return;
    }

    try {
      setLoading(true);
      setLoadingAction("otp");
      setErrorMessage("");

      const response = await fetch("/api/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNo: digits,
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.message || "Invalid OTP.");
        return;
      }

      localStorage.setItem("participant", JSON.stringify(data.user));
      clearAllCachedPageData();
      redirectUser(data.user.role || "Participant");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to verify OTP.");
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setErrorMessage("");
    setInfoMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const field = event.currentTarget.id;

    if (field === "user-username" || field === "user-password") {
      handlePasswordLogin();
      return;
    }

    handleVerifyOtp();
  };

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
          </div>

          <div className="user-login-brand-footer">
            <div className="user-login-brand-footer-line" aria-hidden />
            <p>Partners Beyond Boundaries</p>
          </div>
        </aside>

        <section className="user-login-panel">
          <div className="user-login-card">
            <div className="user-login-card-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access </p>
            </div>

            {infoMessage ? (
              <div className="user-login-info">{infoMessage}</div>
            ) : null}
            {errorMessage ? (
              <div className="user-login-error">{errorMessage}</div>
            ) : null}

            {step === "phone" ? (
              <>
                <label className="user-login-label" htmlFor="user-username">
                  Username
                </label>
                <div className="user-login-input-wrap">
                  <User size={16} strokeWidth={2} aria-hidden />
                  <input
                    id="user-username"
                    type="text"
                    className="user-login-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>

                <label className="user-login-label" htmlFor="user-password">
                  Password
                </label>
                <div className="user-login-input-wrap">
                  <Lock size={16} strokeWidth={2} aria-hidden />
                  <input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    className="user-login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="user-login-eye-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={2} />
                    ) : (
                      <Eye size={16} strokeWidth={2} />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  className="user-login-btn user-login-btn-primary"
                  onClick={handlePasswordLogin}
                  disabled={loading}
                >
                  <Lock size={16} strokeWidth={2.2} />
                  {loadingAction === "password" ? "Signing in..." : "Sign In"}
                </button>

                <Link
                  to="/adminlogin"
                  className="user-login-btn user-login-btn-outline"
                >
                  <Lock size={16} strokeWidth={2.2} />
                  Admin Login
                </Link>
              </>
            ) : (
              <>
                <label className="user-login-label" htmlFor="user-otp">
                  Verification code
                </label>
                <div className="user-login-input-wrap">
                  <Lock size={16} strokeWidth={2} aria-hidden />
                  <input
                    id="user-otp"
                    type="text"
                    className="user-login-input"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="Enter OTP"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  className="user-login-btn user-login-btn-primary"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  <Lock size={16} strokeWidth={2.2} />
                  {loadingAction === "otp" ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  className="user-login-btn user-login-btn-secondary"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  className="user-login-link-btn"
                  onClick={handleBackToPhone}
                  disabled={loading}
                >
                  Back to login
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
