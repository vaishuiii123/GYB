import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { getParticipantFromStorage } from "../../utils/selectedWorkshop";
import "../../styles/AboutUs.css";

const KNAV_WEBSITE_URL = "https://in.knavcpa.com/";
const KNAV_LINKEDIN_URL = "https://in.linkedin.com/company/knav-ind/";

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

export default function AboutUs() {
  const navigate = useNavigate();

  useEffect(() => {
    const participant = getParticipantFromStorage();
    if (!participant?.id) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const goToDashboard = () => {
    navigate("/userdashboard");
  };

  return (
    <div className="about-page">
      <header className="about-header">
        <div className="about-header-left">
          <button
            type="button"
            className="menu-btn"
            onClick={goToDashboard}
            aria-label="Go to dashboard"
          >
            <span />
            <span />
            <span />
          </button>
          <h1>ABOUT US</h1>
        </div>

        <div className="about-header-right">
          <a
            href={KNAV_WEBSITE_URL}
            className="header-icon-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KNAV website"
          >
            <Globe size={22} strokeWidth={2.2} />
          </a>
          <a
            href={KNAV_LINKEDIN_URL}
            className="header-icon-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
          >
            <LinkedInIcon />
          </a>
        </div>
      </header>

      <main className="about-main">
        <div className="about-card">
          <p>
            In today&apos;s ever-changing business landscape, adaptability is
            key. KNAV&apos;s Organization Development Workshop is a collaborative
            platform for businesses aiming to accelerate growth. The goal is
            simple: align strategic objectives with action plans, engage
            stakeholders, and chart a clear path forward in a resilience-focused
            environment.
          </p>

          <p>
            Through this exercise, guided by KNAV experts, you will explore key
            business facets, uncover strengths and challenges, identify
            opportunities, and create a roadmap toward your vision.
          </p>

          <p>
            Together, we will embark on a journey of strategic exploration to
            unlock your business&apos;s full potential. This interactive workshop
            encourages active participation and idea-sharing, fostering a
            supportive environment where real breakthroughs happen!
          </p>

          <p>
            To support this process, KNAV has developed the{" "}
            <strong>Grow Your Business</strong> platform, where you will
            complete the Pre-Organisation Development Workshop Questionnaire and
            collaborate throughout the workshop journey.
          </p>

          <div className="about-card-actions">
            <button
              type="button"
              className="next-btn"
              onClick={goToDashboard}
            >
              Next
              <span className="next-arrow" aria-hidden="true">
                ›››
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
