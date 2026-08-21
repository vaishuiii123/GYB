import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import {
  Lock,
  Phone,
  Send,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

import myImage from "../../images/KNAV logo.png";
import { MSAL_LOGIN_TARGET_KEY } from "../../authConfig";
import { clearSelectedWorkshop } from "../../utils/selectedWorkshop";
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

      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.message || "Invalid username or password.");
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
      
      const otpData = await otpResponse.json();
      
      if (!otpData.success) {
        setErrorMessage(otpData.message || "Unable to send OTP.");
        return;
      }
      
      setStep("otp");
      setInfoMessage(
        otpData.devOtp
          ? `Local OTP: ${otpData.devOtp}`
          : otpData.message || "OTP sent to your mobile number."
      );

      

    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to sign in.");
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

    if (step === "phone") {
      handleSendOtp();
    } else {
      handleVerifyOtp();
    }
  };

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
                <span>Strengthen capabilities, optimise execution and build for scale</span>
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
        <div className="user-login-toplinks">
          <a
            href="https://in.knavcpa.com/"
            className="user-login-about"
            target="_blank"
            rel="noopener noreferrer"
          >
            About KNAV
          </a>
          <a
            href="https://in.linkedin.com/company/knav-ind/"
            className="user-login-icon-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <LinkedInIcon />
          </a>
        </div>

        <div className="user-login-card">
          <div className="user-login-card-header">
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
                  type="password"
                  className="user-login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="button"
                className="user-login-btn user-login-btn-primary"
                onClick={handlePasswordLogin}
                disabled={loading}
              >
                <Lock size={16} strokeWidth={2.2} />
                {loadingAction === "password" ? "Signing in..." : "Login"}
              </button>
            </>
          ) : null}         

          {step === "otp" ? (
            <div className="user-login-input-wrap">
              <Lock size={16} strokeWidth={2} aria-hidden />
              <input
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
          ) : null}

          {step === "otp" ? (
            <>
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
          ) : null}

          <div className="user-login-divider">
            <span>OR</span>
          </div>

          <Link to="/adminlogin" className="user-login-btn user-login-btn-outline">
            <Lock size={16} strokeWidth={2.2} />
            Admin Login
          </Link>
        </div>

        <p className="user-login-footer">© 2026 KNAV. All rights reserved.</p>
      </section>
    </div>
  );
}
