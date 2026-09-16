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
          <button
            type="button"
            className="header-link"
            onClick={goToDashboard}
          >
            Back to Dashboard
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
