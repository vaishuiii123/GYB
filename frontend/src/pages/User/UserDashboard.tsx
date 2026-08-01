import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader";
import { dashboardCards } from "./userMenuItems";
import {
  fetchParticipantWorkshops,
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
      const status = getPreOdAccessStatus(workshop || selectedWorkshop);
      setPreOdEnabled(status.enabled);
      setPreOdMessage(status.message);
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
            const path = isPreOdCard
              ? preOdEnabled
                ? card.path
                : null
              : card.path;
            const disabled = !path;

            return (
              <button
                key={card.title}
                type="button"
                className={`user-dashboard-card ${disabled ? "disabled" : ""}`}
                onClick={() => path && navigate(path)}
                disabled={disabled}
                title={isPreOdCard && disabled ? preOdMessage : undefined}
              >
                <span className="user-dashboard-card-icon" aria-hidden="true">
                  ❖
                </span>
                <div className="user-dashboard-card-body">
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                  {isPreOdCard && disabled && preOdMessage ? (
                    <p className="user-dashboard-card-note">{preOdMessage}</p>
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
