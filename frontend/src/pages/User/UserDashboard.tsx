import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  LayoutGrid,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UserHeader from "./UserHeader";
import {
  getPreOdAccessStatus,
  getWorkshopModuleAccessStatus,
  prefetchOdChart,
  refreshParticipantWorkshopSchedule,
  WORKSHOP_SCHEDULE_UPDATED_EVENT,
  workshopFromSelected,
} from "../../utils/workshopCache";
import { getWorkshopLifecycleStatus, pickOngoingWorkshop } from "../../utils/workshopLifecycle";
import {
  clearSelectedWorkshop,
  getParticipantDisplayName,
  getParticipantFromStorage,
  getSelectedWorkshop,
  setSelectedWorkshop,
  type SelectedWorkshop,
} from "../../utils/selectedWorkshop";
import { clearReportsReturn } from "../../utils/reportsReturn";
import "../../styles/UserHeader.css";
import "../../styles/UserDashboard.css";

type ModuleCard = {
  key: string;
  title: string;
  description: string;
  path: string;
  theme: "pink" | "blue" | "green" | "yellow" | "purple";
  icon: LucideIcon;
  access: "preOd" | "open";
};

const MODULE_CARDS: ModuleCard[] = [
  {
    key: "pre-od",
    title: "Pre-Workshop Questionnaire",
    description:
      "Complete this short questionnaire before the Organization Development Workshop begins.",
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
    icon: LayoutGrid,
    access: "open",
  },
  {
    key: "actionables",
    title: "Actionables",
    description:
      "Track key priorities & takeaways from the Organization Development Workshop.",
    path: "/actionables",
    theme: "yellow",
    icon: ClipboardCheck,
    access: "open",
  },
  {
    key: "reports",
    title: "Reports",
    description:
      "Summary of key insights, participant reflections & actionables for this workshop.",
    path: "/reports",
    theme: "purple",
    icon: BarChart3,
    access: "open",
  },
];

const PRE_OD_CLOSED_NOTE =
  "This questionnaire is closed because the workshop has started.";

function toSelectedWorkshop(
  workshop: {
    id: string;
    workshopName?: string;
    organizationName?: string;
    organizationId?: string;
    templateId?: string;
    templateName?: string;
    preOdStartDate?: string;
    startDate?: string;
    endDate?: string;
    preOdQuestionCount?: number;
  },
  fallbackOrgId?: string
): SelectedWorkshop {
  return {
    id: workshop.id,
    workshopName: workshop.workshopName || "Workshop",
    organizationName: workshop.organizationName || "",
    organizationId: workshop.organizationId || fallbackOrgId,
    templateId: workshop.templateId,
    templateName: workshop.templateName,
    preOdStartDate: workshop.preOdStartDate,
    startDate: workshop.startDate,
    endDate: workshop.endDate,
    preOdQuestionCount: workshop.preOdQuestionCount,
  };
}

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
    organizationName?: string;
    organizationId?: string;
  }
): SelectedWorkshop {
  const next: SelectedWorkshop = {
    ...selected,
    workshopName: fresh.workshopName || selected.workshopName,
    organizationName: fresh.organizationName || selected.organizationName,
    organizationId: fresh.organizationId || selected.organizationId,
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

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [workshop, setWorkshop] = useState<SelectedWorkshop | null>(() =>
    getSelectedWorkshop()
  );

  const preOdStatus = getPreOdAccessStatus(workshop);
  const moduleStatus = getWorkshopModuleAccessStatus(
    workshop ? workshopFromSelected(workshop) : null
  );

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    let hasLoadedOnce = false;

    const loadWorkshops = async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }
      setErrorMessage("");

      try {
        const data = await refreshParticipantWorkshopSchedule({
          forceRefresh: true,
        });

        if (cancelled || !data) {
          return;
        }

        if (!data.success) {
          setErrorMessage(
            data.editMessage ||
              "Failed to load workshops. Please try again."
          );
          setWorkshop(null);
          clearSelectedWorkshop();
          return;
        }

        const mapped = (data.workshops || []).map((item) =>
          toSelectedWorkshop(item, participant.organizationId || "")
        );

        if (mapped.length === 0) {
          clearSelectedWorkshop();
          setWorkshop(null);
          setErrorMessage("No workshops are assigned to you yet.");
          return;
        }

        const preferredId = getSelectedWorkshop()?.id;
        const preferredStillRelevant =
          preferredId &&
          mapped.some((item) => {
            if (item.id !== preferredId) {
              return false;
            }
            const status = getWorkshopLifecycleStatus(item);
            return status === "in-progress" || status === "upcoming";
          })
            ? preferredId
            : undefined;

        const ongoing = pickOngoingWorkshop(mapped, preferredStillRelevant);

        if (!ongoing) {
          clearSelectedWorkshop();
          setWorkshop(null);
          setErrorMessage("No workshops has started.");
          return;
        }

        const next = syncSelectedWorkshop(
          toSelectedWorkshop(ongoing, participant.organizationId || ""),
          ongoing
        );
        setWorkshop(next);
        prefetchOdChart(next.templateId, next.id);
        hasLoadedOnce = true;
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("Failed to load workshops.");
          setWorkshop(null);
          clearSelectedWorkshop();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWorkshops(true);

    const onScheduleUpdated = () => {
      const selected = getSelectedWorkshop();
      if (selected) {
        setWorkshop(selected);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && hasLoadedOnce) {
        void loadWorkshops(false);
      }
    };

    window.addEventListener(
      WORKSHOP_SCHEDULE_UPDATED_EVENT,
      onScheduleUpdated
    );
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void loadWorkshops(false);
    }, 15000);

    return () => {
      cancelled = true;
      window.removeEventListener(
        WORKSHOP_SCHEDULE_UPDATED_EVENT,
        onScheduleUpdated
      );
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [navigate, participant?.id, participant?.organizationId]);

  const workshopName = workshop?.workshopName || "your workshop";

  const cards = useMemo(() => {
    return MODULE_CARDS.map((card) => {
      if (card.access === "preOd") {
        const viewOnly =
          preOdStatus.enabled && !preOdStatus.canFill && preOdStatus.message;
        return {
          ...card,
          enabled: preOdStatus.enabled,
          note: preOdStatus.enabled
            ? viewOnly
              ? preOdStatus.message || PRE_OD_CLOSED_NOTE
              : ""
            : preOdStatus.message || PRE_OD_CLOSED_NOTE,
        };
      }

      return {
        ...card,
        enabled: moduleStatus.enabled,
        note: moduleStatus.enabled ? "" : moduleStatus.message,
      };
    });
  }, [
    preOdStatus.enabled,
    preOdStatus.canFill,
    preOdStatus.message,
    moduleStatus.enabled,
    moduleStatus.message,
  ]);

  const welcomeMessage = loading
    ? "Loading your workshop..."
    : errorMessage
      ? errorMessage
      : !workshop
        ? "No workshops has started."
        : `Continue with ${workshopName} — choose a module below to proceed.`;

  return (
    <div className="ws-dash">
      <UserHeader />

      <main className="ws-dash-main">
        <section className="ws-dash-welcome">
          <div className="ws-dash-welcome-copy">
            <span className="ws-dash-welcome-icon" aria-hidden>
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <div>
              <h2>Welcome back, {firstName}!</h2>
              <p className={!workshop && !loading ? "ws-dash-empty-note" : undefined}>
                {welcomeMessage}
              </p>
            </div>
          </div>
          <p className="ws-dash-welcome-tagline">
            Insights today. A stronger tomorrow.
          </p>
        </section>

        {!loading && workshop ? (
          <section className="ws-dash-modules">
            {cards.map((card) => {
              const Icon = card.icon;
              const disabled = !card.enabled;
              const statusLabel = card.note
                ? card.note
                : disabled
                  ? "Locked"
                  : "Open module";

              return (
                <button
                  key={card.key}
                  type="button"
                  className={`ws-dash-module theme-${card.theme} ${
                    disabled ? "is-disabled" : ""
                  }`}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    if (card.path === "/reports") {
                      clearReportsReturn();
                    }
                    navigate(card.path);
                  }}
                  title={disabled ? card.note : card.description}
                >
                  <span className="ws-dash-module-watermark" aria-hidden>
                    <Icon size={110} strokeWidth={1.2} />
                  </span>

                  <span className="ws-dash-module-icon" aria-hidden>
                    <Icon size={22} strokeWidth={2.1} />
                  </span>

                  <div className="ws-dash-module-body">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>

                  <span className="ws-dash-module-cta">
                    {statusLabel}
                    {!disabled && !card.note ? (
                      <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </section>
        ) : null}
      </main>
    </div>
  );
}
