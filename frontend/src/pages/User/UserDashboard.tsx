import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader";
import { dashboardCards } from "./userMenuItems";
import {
  fetchParticipantWorkshops,
  getFeedbackAccessStatus,
  getPreOdAccessStatus,
  type WorkshopRecord,
} from "../../utils/workshopCache";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/UserHeader.css";
import "../../styles/UserDashboard.css";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [preOdEnabled, setPreOdEnabled] = useState(false);
  const [preOdMessage, setPreOdMessage] = useState("");
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    const participant = getParticipantFromStorage();

    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    if (!getSelectedWorkshop()?.id) {
      navigate("/select-workshop", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const participant = getParticipantFromStorage();
    const selectedWorkshop = getSelectedWorkshop();

    if (!participant?.id || !selectedWorkshop?.id) {
      return;
    }

    const applyStatus = (workshop?: WorkshopRecord | null) => {
      const source = workshop || selectedWorkshop;
      const preOdStatus = getPreOdAccessStatus(source);
      const feedbackStatus = getFeedbackAccessStatus(source);
      setPreOdEnabled(preOdStatus.enabled);
      setPreOdMessage(preOdStatus.message);
      setFeedbackEnabled(feedbackStatus.enabled);
      setFeedbackMessage(feedbackStatus.message);
    };

    applyStatus(selectedWorkshop);

    const refreshWorkshop = async () => {
      try {
        const data = await fetchParticipantWorkshops(
          participant.id,
          participant.organizationId || ""
        );

        if (!data.success) {
          return;
        }

        const matched =
          data.workshops?.find((workshop) => workshop.id === selectedWorkshop.id) ||
          data.workshop;

        applyStatus(matched);
      } catch {
        // keep selected-workshop status
      }
    };

    refreshWorkshop();
  }, []);

  return (
    <div className="user-dashboard-page">
      <UserHeader />

      <div className="user-dashboard-content">
        <div className="user-dashboard-grid">
          {dashboardCards.map((card) => {
            const isPreOdCard = card.path === "/pre-od-workshop";
            const isFeedbackCard = card.path === "/workshop-feedback";
            let path = card.path;
            let note = "";

            if (isPreOdCard) {
              path = preOdEnabled ? card.path : null;
              note = preOdMessage;
            }

            if (isFeedbackCard) {
              path = feedbackEnabled ? card.path : null;
              note = feedbackMessage;
            }

            const disabled = !path;

            return (
              <button
                key={card.title}
                type="button"
                className={`user-dashboard-card ${disabled ? "disabled" : ""}`}
                onClick={() => path && navigate(path)}
                disabled={disabled}
                title={disabled && note ? note : undefined}
              >
                <span className="user-dashboard-card-icon" aria-hidden="true">
                  ❖
                </span>
                <div className="user-dashboard-card-body">
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                  {disabled && note ? (
                    <p className="user-dashboard-card-note">{note}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="user-dashboard-footer">
          Grow Your Business: Organization Development Workshop
        </div>
      </div>
    </div>
  );
}
