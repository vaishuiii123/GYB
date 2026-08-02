import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Users,
} from "lucide-react";
import {
  clearSelectedWorkshop,
  getParticipantDisplayName,
  getParticipantFromStorage,
  setSelectedWorkshop,
  type SelectedWorkshop,
} from "../../utils/selectedWorkshop";
import {
  fetchParticipantWorkshops,
  getCachedParticipantWorkshops,
} from "../../utils/workshopCache";
import "../../styles/WorkshopSelection.css";
import { appConfirm } from "../../utils/appDialog";

type WorkshopOption = SelectedWorkshop & {
  participantCount?: number;
};

function formatWorkshopDates(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "";
  }

  const format = (value?: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const start = format(startDate);
  const end = format(endDate);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || end;
}

export default function WorkshopSelection() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const participantName = getParticipantDisplayName(participant);
  const initials = participantName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    if (!participant.organizationId && !participant.id) {
      setErrorMessage("You are not assigned to an organization.");
      setLoading(false);
      return;
    }

    const mapWorkshops = (
      source: Array<{
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
        participantCount?: number;
      }>
    ): WorkshopOption[] =>
      source.map((workshop) => ({
        id: workshop.id,
        workshopName: workshop.workshopName || "Workshop",
        organizationName: workshop.organizationName || "",
        organizationId: workshop.organizationId || participant.organizationId,
        templateId: workshop.templateId,
        templateName: workshop.templateName,
        preOdStartDate: workshop.preOdStartDate,
        startDate: workshop.startDate,
        endDate: workshop.endDate,
        preOdQuestionCount: workshop.preOdQuestionCount,
        participantCount: workshop.participantCount,
      }));

    const cached = getCachedParticipantWorkshops(
      participant.id,
      participant.organizationId || ""
    );

    if (cached?.success && (cached.workshops || []).length > 0) {
      setWorkshops(mapWorkshops(cached.workshops || []));
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadWorkshops = async () => {
      try {
        setErrorMessage("");

        // Always refresh so newly assigned workshops appear immediately.
        const data = await fetchParticipantWorkshops(
          participant.id,
          participant.organizationId || "",
          { forceRefresh: true }
        );

        if (!data.success) {
          if (!cached?.success) {
            setErrorMessage(
              data.editMessage ||
                "Failed to load workshops. Restart the API and try again."
            );
          }
          return;
        }

        setWorkshops(mapWorkshops(data.workshops || []));
      } catch (error) {
        console.error(error);
        if (!cached?.success) {
          setErrorMessage("Failed to load workshops.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadWorkshops();
  }, [navigate, participant.id, participant.organizationId]);

  const handleSelectWorkshop = (workshop: WorkshopOption) => {
    setSelectedWorkshop(workshop);
    navigate("/userdashboard", { replace: true });
  };

  const handleLogout = async () => {
    const confirmed = await appConfirm("Do you really want to logout?", {
      title: "Logout",
      confirmLabel: "Logout",
      variant: "warning",
    });

    if (confirmed) {
      clearSelectedWorkshop();
      localStorage.removeItem("participant");
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="workshop-selection-page">
      <header className="workshop-selection-header">
        <div className="workshop-selection-header-left" />

        <div className="workshop-selection-header-right">
          <div className="workshop-selection-user-menu" ref={menuRef}>
            <button
              type="button"
              className="workshop-selection-user-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="workshop-selection-avatar" aria-hidden>
                {initials || "U"}
              </span>
              <span className="workshop-selection-name">{participantName}</span>
              <ChevronDown size={18} strokeWidth={2} />
            </button>

            {menuOpen ? (
              <div className="workshop-selection-dropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/select-workshop");
                  }}
                >
                  Home
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="workshop-selection-main">
        <div className="workshop-selection-intro">
          <div className="workshop-selection-intro-icon" aria-hidden>
            <LayoutDashboard size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1>Dashboard</h1>
            <p className="workshop-selection-subtitle">
              Choose the workshop assigned to you to continue.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="workshop-selection-status">Loading workshops...</p>
        ) : errorMessage ? (
          <p className="workshop-selection-error">{errorMessage}</p>
        ) : workshops.length === 0 ? (
          <p className="workshop-selection-status">
            No workshops are assigned to your organization yet. Ask your admin to
            create a workshop for your organization and assign you under Admin →
            Organization.
          </p>
        ) : (
          <div className="workshop-selection-grid">
            {workshops.map((workshop) => {
              const dates = formatWorkshopDates(
                workshop.startDate,
                workshop.endDate
              );

              return (
                <button
                  key={workshop.id}
                  type="button"
                  className="workshop-selection-card"
                  onClick={() => handleSelectWorkshop(workshop)}
                >
                  <div className="workshop-selection-card-top">
                    <span
                      className="workshop-selection-card-icon"
                      aria-hidden
                    >
                      <LayoutDashboard size={20} strokeWidth={2.1} />
                    </span>
                    <div className="workshop-selection-card-body">
                      <h2>{workshop.workshopName}</h2>
                      {dates ? (
                        <p className="workshop-selection-card-dates">
                          <CalendarDays size={14} strokeWidth={2} />
                          <span>{dates}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="workshop-selection-card-divider" />

                  <div className="workshop-selection-card-bottom">
                    <p className="workshop-selection-card-meta">
                      <FileText size={14} strokeWidth={2} />
                      <span>
                        {workshop.preOdQuestionCount
                          ? `${workshop.preOdQuestionCount} Pre OD questions assigned`
                          : "No Pre OD questions assigned"}
                      </span>
                    </p>
                    <span className="workshop-selection-card-arrow" aria-hidden>
                      <ArrowRight size={16} strokeWidth={2.4} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer className="workshop-selection-footer">
        <div className="workshop-selection-footer-badge" aria-hidden>
          <Users size={28} strokeWidth={1.8} />
        </div>
        <h3>Grow Your Business</h3>
        <p>Organization Development Workshop</p>
        <span className="workshop-selection-footer-rule" aria-hidden />
      </footer>
    </div>
  );
}
