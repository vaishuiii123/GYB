import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
  clearSelectedWorkshop,
  getParticipantDisplayName,
  getParticipantFromStorage,
  setSelectedWorkshop,
  type SelectedWorkshop,
} from "../../utils/selectedWorkshop";
import { fetchParticipantWorkshops } from "../../utils/workshopCache";
import "../../styles/WorkshopSelection.css";

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

    const loadWorkshops = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await fetchParticipantWorkshops(
          participant.id,
          participant.organizationId || ""
        );

        if (!data.success) {
          setErrorMessage(
            data.editMessage ||
              "Failed to load workshops. Restart the API and try again."
          );
          return;
        }

        const items = (data.workshops || []).map((workshop) => ({
          id: workshop.id,
          workshopName: workshop.workshopName || "Workshop",
          organizationName: workshop.organizationName || "",
          organizationId: workshop.organizationId || participant.organizationId,
          templateId: workshop.templateId,
          templateName: workshop.templateName,
          startDate: workshop.startDate,
          endDate: workshop.endDate,
          preOdQuestionCount: workshop.preOdQuestionCount,
          participantCount: workshop.participantCount,
        }));

        setWorkshops(items);
      } catch (error) {
        console.error(error);
        setErrorMessage("Failed to load workshops.");
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

  const handleLogout = () => {
    if (window.confirm("Do you really want to logout?")) {
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
          <h1>Dashboard</h1>
          <p className="workshop-selection-subtitle">
            Choose the workshop assigned to you to continue.
          </p>
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
            {workshops.map((workshop) => (
              <button
                key={workshop.id}
                type="button"
                className="workshop-selection-card"
                onClick={() => handleSelectWorkshop(workshop)}
              >
                <span
                  className="workshop-selection-card-icon"
                  aria-hidden="true"
                >
                  ❖
                </span>
                <div className="workshop-selection-card-body">
                  <h2>{workshop.workshopName}</h2>
                  {formatWorkshopDates(workshop.startDate, workshop.endDate) && (
                    <p className="workshop-selection-card-dates">
                      {formatWorkshopDates(
                        workshop.startDate,
                        workshop.endDate
                      )}
                    </p>
                  )}
                  {workshop.preOdQuestionCount ? (
                    <p className="workshop-selection-card-meta">
                      {workshop.preOdQuestionCount} Pre OD questions assigned
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="workshop-selection-footer">
        Grow Your Business: Organization Development Workshop
      </footer>
    </div>
  );
}
