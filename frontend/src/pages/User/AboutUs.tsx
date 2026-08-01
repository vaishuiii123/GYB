import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getParticipantFromStorage } from "../../utils/selectedWorkshop";
import "../../styles/AboutUs.css";

export default function AboutUs() {
  const navigate = useNavigate();

  useEffect(() => {
    const participant = getParticipantFromStorage();
    if (!participant?.id) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="about-page">
      <header className="about-header">
        <div className="about-header-left">
          <button
            type="button"
            className="menu-btn"
            onClick={() => navigate("/select-workshop")}
            aria-label="Go to dashboard"
          >
            <span />
            <span />
            <span />
          </button>
          <h1>ABOUT US</h1>
        </div>

        <div className="about-header-right">
          <button
            type="button"
            className="header-link"
            onClick={() => navigate("/select-workshop")}
          >
            Home
          </button>
          <span className="header-icon" aria-hidden="true">
            🌐
          </span>
          <span className="header-icon linkedin" aria-hidden="true">
            in
          </span>
        </div>
      </header>

      <main className="about-main">
        <div className="about-card">
          <p>
            KNAV is a firm with over two decades of experience in international
            accounting and tax advisory. Headquartered in Mumbai and Atlanta,
            KNAV has a presence in seven countries and serves clients across
            diverse industries with deep expertise and a client-first approach.
          </p>

          <p>
            The Organization Development Workshop is a collaborative platform
            designed for businesses of all sizes — from startups to established
            enterprises — to align organizational goals, engage stakeholders,
            and build a shared understanding of where the business is headed.
          </p>

          <p>
            The Organization Development &amp; Business Planning Workshop helps
            organizations identify pain points and map roadmaps toward their
            business vision. Through structured discussions and SWOT analysis
            — covering strengths, weaknesses, opportunities, and threats —
            participants gain clarity on priorities and actionable next steps.
          </p>

          <p>
            To support this process, KNAV has developed a proprietary application
            called <strong>Grow Your Business</strong>, which streamlines
            management inputs and generates tailored reports — enabling leaders
            to make informed decisions and drive sustainable growth.
          </p>
        </div>
      </main>

      <footer className="about-footer">
        <p className="about-footer-text">
          Grow Your Business: Organization Development Workshop
        </p>

        <button
          type="button"
          className="next-btn"
          onClick={() => navigate("/select-workshop")}
        >
          Next
          <span className="next-arrow" aria-hidden="true">
            ›››
          </span>
        </button>
      </footer>
    </div>
  );
}
