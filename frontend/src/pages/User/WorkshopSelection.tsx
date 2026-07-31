import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import {
  clearSelectedWorkshop,
  getParticipantDisplayName,
  getParticipantFromStorage,
  setSelectedWorkshop,
  type SelectedWorkshop,
} from "../../utils/selectedWorkshop";
import { fetchParticipantWorkshops } from "../../utils/workshopCache";
import "../../styles/WorkshopSelection.css";

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
  const organizationName =
    participant.organization ||
    participant.Organization ||
    participant.Organisation ||
    "";

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
            data.editMessage || "Failed to load workshops. Restart the API and try again."
          );
          return;
        }

        const items = (data.workshops || []).map((workshop) => ({
          id: workshop.id,
          workshopName: workshop.workshopName || "Workshop",
          organizationName:
            workshop.organizationName || organizationName || "",
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
  }, [navigate, organizationName, participant.id, participant.organizationId]);

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
        <div className="workshop-selection-header-left">
          <span className="workshop-selection-name">{participantName}</span>
        </div>

        <div className="workshop-selection-header-right">
          <button
            type="button"
            className="workshop-selection-link"
            onClick={handleLogout}
          >
            Logout
          </button>
          <button type="button" className="workshop-selection-icon-btn" aria-label="Language">
            <Globe size={18} strokeWidth={2} />
          </button>
          <button type="button" className="workshop-selection-icon-btn" aria-label="LinkedIn">
            <LinkedInIcon />
          </button>
        </div>
      </header>

      <main className="workshop-selection-main">
        <div className="workshop-selection-intro">
          <p className="workshop-selection-org">{organizationName}</p>
          <h1>Select Workshop</h1>
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
                <span className="workshop-selection-card-icon" aria-hidden="true">
                  ❖
                </span>
                <div className="workshop-selection-card-body">
                  <h2>{workshop.workshopName}</h2>
                  <p>{workshop.organizationName}</p>
                  {formatWorkshopDates(workshop.startDate, workshop.endDate) && (
                    <p className="workshop-selection-card-dates">
                      {formatWorkshopDates(workshop.startDate, workshop.endDate)}
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
