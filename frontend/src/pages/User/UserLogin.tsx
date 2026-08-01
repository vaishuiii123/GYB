import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Globe } from "lucide-react";

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
  const [phoneNo, setPhoneNo] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSendOtp = async () => {
    const digits = validatePhone();
    if (!digits) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");

      const response = await fetch("/api/send-login-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNo: digits }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to send OTP.");
        return;
      }

      setStep("otp");
      setOtp("");
      setInfoMessage(
        data.message ||
          `OTP sent to ${digits}. Valid for ${data.expiresInMinutes || 30} minutes.`
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const digits = validatePhone();
    if (!digits) {
      return;
    }

    if (!otp.trim()) {
      setErrorMessage("Please enter the OTP sent to your phone.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");

      const response = await fetch("/api/user-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNo: digits,
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Invalid OTP.");
        return;
      }

      localStorage.setItem("participant", JSON.stringify(data.user));
      redirectUser(data.user.role || "Participant");
    } catch (error) {
      console.error(error);
      setErrorMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setErrorMessage("");
    setInfoMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !loading) {
      if (step === "phone") {
        handleSendOtp();
      } else {
        handleVerifyOtp();
      }
    }
  };

  return (
    <div className="user-login-page">
      <img src={myImage} alt="KNAV" className="user-login-logo" />
      <div className="user-login-shape" aria-hidden="true" />

      <div className="user-login-toplinks">
        <a
          href="https://in.knavcpa.com/"
          className="user-login-about"
          target="_blank"
          rel="noopener noreferrer"
        >
          About KNAV
        </a>
        <button type="button" className="user-login-icon-btn" aria-label="Language">
          <Globe size={20} strokeWidth={2} />
        </button>
        <button type="button" className="user-login-icon-btn" aria-label="LinkedIn">
          <LinkedInIcon />
        </button>
      </div>

      <div className="user-login-center">
        <h1 className="user-login-title">GROW YOUR BUSINESS</h1>
        <p className="user-login-subtitle">Organisation Development Workshop</p>

        <div className="user-login-form">
          <input
            type="tel"
            className="user-login-input"
            value={phoneNo}
            onChange={(e) =>
              setPhoneNo(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            onKeyDown={handleKeyDown}
            placeholder="Phone number"
            inputMode="numeric"
            maxLength={10}
            disabled={step === "otp"}
          />

          {step === "otp" && (
            <input
              type="text"
              className="user-login-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder="Enter OTP"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />
          )}

          {infoMessage && (
            <div className="user-login-info">{infoMessage}</div>
          )}

          {errorMessage && (
            <div className="user-login-error">{errorMessage}</div>
          )}

          {step === "phone" ? (
            <button
              type="button"
              className="user-login-btn user-login-btn-primary"
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Checking..." : "Send OTP"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="user-login-btn user-login-btn-primary"
                onClick={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
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
                Change phone number
              </button>
            </>
          )}
        </div>

        <div className="user-login-admin-link">
          <Link to="/adminlogin">Admin Login</Link>
        </div>
      </div>
    </div>
  );
}
