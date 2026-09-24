import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UserHeader from "./UserHeader";
import {
  fetchParticipantWorkshops,
  getPreOdAccessStatus,
  getWorkshopModuleAccessStatus,
  prefetchOdChart,
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
import "../../styles/UserHeader.css";
import "../../styles/UserDashboard.css";

type ModuleCard = {
  key: string;
  title: string;
  description: string;
  path: string;
  theme: "pink" | "blue" | "green" | "yellow" | "slate";
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
    key: "reports",
    title: "Reports",
    description:
      "Summary of key insights, participant reflections & actionables for this workshop.",
    path: "/reports",
    theme: "slate",
    icon: FileSpreadsheet,
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

    (async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchParticipantWorkshops(
          String(participant.id),
          participant.organizationId || ""
        );

        if (cancelled) {
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

        // Prefer a currently relevant workshop (in progress / Pre OD open).
        // Do not stick to an old completed selection when a newer one is active.
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
    })();

    return () => {
      cancelled = true;
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

  return (
    <div className="ws-dash">
      <UserHeader />

      <main className="ws-dash-main">
        {loading ? (
          <section className="ws-dash-welcome">
            <div className="ws-dash-welcome-copy">
              <span className="ws-dash-welcome-icon" aria-hidden>
                <LayoutDashboard size={20} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Welcome back, {firstName}!</h2>
                <p>Loading your workshop...</p>
              </div>
            </div>
          </section>
        ) : errorMessage ? (
          <section className="ws-dash-welcome">
            <div className="ws-dash-welcome-copy">
              <span className="ws-dash-welcome-icon" aria-hidden>
                <LayoutDashboard size={20} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Welcome back, {firstName}!</h2>
                <p className="ws-dash-empty-note">{errorMessage}</p>
              </div>
            </div>
          </section>
        ) : !workshop ? (
          <section className="ws-dash-welcome">
            <div className="ws-dash-welcome-copy">
              <span className="ws-dash-welcome-icon" aria-hidden>
                <LayoutDashboard size={20} strokeWidth={2.2} />
              </span>
              <div>
                <h2>Welcome back, {firstName}!</h2>
                <p className="ws-dash-empty-note">
                  No workshops has started.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
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
                          <span>
                            {card.note
                              ? card.note
                              : disabled
                                ? "Locked"
                                : "Open module"}
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
          </>
        )}
      </main>
    </div>
  );
}
