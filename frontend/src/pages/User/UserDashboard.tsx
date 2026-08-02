import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UserHeader from "./UserHeader";
import {
  getFeedbackAccessStatus,
  getPreOdAccessStatus,
  prefetchOdChart,
} from "../../utils/workshopCache";
import {
  getParticipantDisplayName,
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import knavLogo from "../../images/KNAV logo.png";
import "../../styles/UserHeader.css";
import "../../styles/UserDashboard.css";

type ModuleCard = {
  key: string;
  title: string;
  description: string;
  path: string;
  theme: "pink" | "blue" | "green" | "yellow" | "coral";
  icon: LucideIcon;
  access: "preOd" | "feedback" | "open";
};

const MODULE_CARDS: ModuleCard[] = [
  {
    key: "pre-od",
    title: "Pre-OD Workshop",
    description:
      "Setting context before the Organization Development Workshop.",
    path: "/pre-od-workshop",
    theme: "pink",
    icon: ClipboardList,
    access: "preOd",
  },
  {
    key: "vision",
    title: "Vision & Mission",
    description:
      "Aligning goals, purpose, and aspirations for the business.",
    path: "/vision-mission",
    theme: "blue",
    icon: Target,
    access: "open",
  },
  {
    key: "unlock",
    title: "Unlock Value",
    description:
      "Foundational insights on the business model, operational efficiency and strategic outlook.",
    path: "/od-chart",
    theme: "green",
    icon: LayoutDashboard,
    access: "open",
  },
  {
    key: "actionables",
    title: "Actionables",
    description:
      "Track key priorities & takeaways from the Organization Development Workshop.",
    path: "/actionables",
    theme: "yellow",
    icon: FileText,
    access: "open",
  },
  {
    key: "feedback",
    title: "Workshop Feedback",
    description:
      "Share one-time feedback after the workshop has ended.",
    path: "/workshop-feedback",
    theme: "coral",
    icon: MessageSquareText,
    access: "feedback",
  },
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const selectedWorkshop = getSelectedWorkshop();
  const participant = getParticipantFromStorage();
  const participantName = getParticipantDisplayName(participant);
  const firstName = participantName.split(/\s+/)[0] || "there";

  const preOdStatus = getPreOdAccessStatus(selectedWorkshop);
  const feedbackStatus = getFeedbackAccessStatus(selectedWorkshop);
  const [preOdEnabled] = useState(preOdStatus.enabled);
  const [preOdMessage] = useState(preOdStatus.message);
  const [feedbackEnabled] = useState(feedbackStatus.enabled);
  const [feedbackMessage] = useState(feedbackStatus.message);

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    if (!getSelectedWorkshop()?.id) {
      navigate("/select-workshop", { replace: true });
      return;
    }

    prefetchOdChart(getSelectedWorkshop()?.templateId);
  }, [navigate, participant?.id]);

  const workshopName = selectedWorkshop?.workshopName || "your workshop";

  const cards = useMemo(() => {
    return MODULE_CARDS.map((card) => {
      if (card.access === "preOd") {
        return {
          ...card,
          enabled: preOdEnabled,
          note: preOdMessage,
          badge: preOdEnabled ? "" : "IN PROGRESS",
        };
      }

      if (card.access === "feedback") {
        return {
          ...card,
          enabled: feedbackEnabled,
          note: feedbackMessage,
          badge: feedbackEnabled ? "" : "AFTER WORKSHOP",
        };
      }

      return {
        ...card,
        enabled: true,
        note: "",
        badge: "",
      };
    });
  }, [preOdEnabled, preOdMessage, feedbackEnabled, feedbackMessage]);

  return (
    <div className="ws-dash">
      <UserHeader />

      <div className="ws-dash-shell">
        <aside className="ws-dash-brand">
          <img src={knavLogo} alt="KNAV" className="ws-dash-brand-logo" />
          <div className="ws-dash-brand-copy">
            <h1>GROW YOUR BUSINESS</h1>
            <p className="ws-dash-brand-subtitle">
              Organisation Development Workshop
            </p>
            <ul className="ws-dash-features">
              <li>
                <span aria-hidden>
                  <TrendingUp size={15} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>Strategic Growth</strong>
                  <span>Unlock your potential and drive sustainable growth</span>
                </div>
              </li>
              <li>
                <span aria-hidden>
                  <Users size={15} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>People Excellence</strong>
                  <span>Build high-performing teams and strong culture</span>
                </div>
              </li>
              <li>
                <span aria-hidden>
                  <Target size={15} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>Business Impact</strong>
                  <span>Deliver measurable results and long-term value</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="ws-dash-brand-art" aria-hidden />
        </aside>

        <main className="ws-dash-main">
          <section className="ws-dash-welcome">
            <div className="ws-dash-welcome-copy">
              <span className="ws-dash-welcome-icon" aria-hidden>
                <LayoutDashboard size={20} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Welcome back, {firstName}!</h2>
                <p>
                  Continue with <strong>{workshopName}</strong> — choose a
                  module below to proceed.
                </p>
              </div>
            </div>
          </section>

          <section className="ws-dash-modules">
            {cards.map((card) => {
              const Icon = card.icon;
              const disabled = !card.enabled;

              return (
                <button
                  key={card.key}
                  type="button"
                  className={`ws-dash-module theme-${card.theme} ${
                    disabled ? "is-disabled" : ""
                  }`}
                  disabled={disabled}
                  onClick={() => !disabled && navigate(card.path)}
                  title={disabled ? card.note : undefined}
                >
                  <div className="ws-dash-module-rail">
                    <span className="ws-dash-module-icon" aria-hidden>
                      <Icon size={22} strokeWidth={2.1} />
                    </span>
                  </div>

                  <div className="ws-dash-module-body">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>

                    <div className="ws-dash-module-footer">
                      <div className="ws-dash-module-status">
                        {card.badge ? (
                          <span className="ws-dash-badge">{card.badge}</span>
                        ) : null}
                        <span>
                          {disabled && card.note ? card.note : "Open module"}
                        </span>
                      </div>
                      <span className="ws-dash-module-arrow" aria-hidden>
                        <ArrowRight size={16} strokeWidth={2.4} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}
