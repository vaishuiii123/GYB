import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UserHeader from "./UserHeader";
import {
  fetchParticipantWorkshops,
  getFeedbackAccessStatus,
  getPreOdAccessStatus,
  prefetchOdChart,
} from "../../utils/workshopCache";
import {
  getParticipantDisplayName,
  getParticipantFromStorage,
  getSelectedWorkshop,
  setSelectedWorkshop,
  type SelectedWorkshop,
} from "../../utils/selectedWorkshop";
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

const FEEDBACK_CLOSED_NOTE =
  "This window will start once the workshop is finished.";

const PRE_OD_CLOSED_NOTE =
  "This window has closed because the workshop has started.";

function syncSelectedWorkshop(
  selected: SelectedWorkshop,
  fresh: {
    preOdStartDate?: string;
    startDate?: string;
    endDate?: string;
    preOdQuestionCount?: number;
    workshopName?: string;
    templateId?: string;
    templateName?: string;
  }
): SelectedWorkshop {
  const next: SelectedWorkshop = {
    ...selected,
    workshopName: fresh.workshopName || selected.workshopName,
    templateId: fresh.templateId || selected.templateId,
    templateName: fresh.templateName || selected.templateName,
    preOdStartDate: fresh.preOdStartDate ?? selected.preOdStartDate,
    startDate: fresh.startDate ?? selected.startDate,
    endDate: fresh.endDate ?? selected.endDate,
    preOdQuestionCount:
      fresh.preOdQuestionCount ?? selected.preOdQuestionCount,
  };
  setSelectedWorkshop(next);
  return next;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const participantName = getParticipantDisplayName(participant);
  const firstName = participantName.split(/\s+/)[0] || "there";

  const [workshop, setWorkshop] = useState<SelectedWorkshop | null>(() =>
    getSelectedWorkshop()
  );

  const preOdStatus = getPreOdAccessStatus(workshop);
  const feedbackStatus = getFeedbackAccessStatus(workshop);

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    const selected = getSelectedWorkshop();
    if (!selected?.id) {
      navigate("/select-workshop", { replace: true });
      return;
    }

    setWorkshop(selected);
    prefetchOdChart(selected.templateId);

    let cancelled = false;
    (async () => {
      const data = await fetchParticipantWorkshops(
        String(participant.id),
        selected.organizationId,
        { forceRefresh: true }
      );
      if (cancelled || !data.success) {
        return;
      }

      const matched =
        (data.workshops || []).find((item) => item.id === selected.id) ||
        data.workshop;
      if (!matched?.id) {
        return;
      }

      setWorkshop(syncSelectedWorkshop(selected, matched));
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, participant?.id]);

  const workshopName = workshop?.workshopName || "your workshop";

  const cards = useMemo(() => {
    return MODULE_CARDS.map((card) => {
      if (card.access === "preOd") {
        return {
          ...card,
          enabled: preOdStatus.enabled,
          note: preOdStatus.enabled
            ? ""
            : preOdStatus.message || PRE_OD_CLOSED_NOTE,
        };
      }

      if (card.access === "feedback") {
        return {
          ...card,
          enabled: feedbackStatus.enabled,
          note: feedbackStatus.enabled
            ? ""
            : feedbackStatus.message || FEEDBACK_CLOSED_NOTE,
        };
      }

      return {
        ...card,
        enabled: true,
        note: "",
      };
    });
  }, [preOdStatus.enabled, preOdStatus.message, feedbackStatus.enabled, feedbackStatus.message]);

  return (
    <div className="ws-dash">
      <UserHeader />

      <main className="ws-dash-main">
        <section className="ws-dash-welcome">
          <div className="ws-dash-welcome-copy">
            <span className="ws-dash-welcome-icon" aria-hidden>
              <LayoutDashboard size={20} strokeWidth={2.2} />
            </span>
            <div>
              <h2>Welcome back, {firstName}!</h2>
              <p>
                Continue with <strong>{workshopName}</strong> — choose a module
                below to proceed.
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
  );
}
