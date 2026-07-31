import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader";
import { dashboardCards } from "./userMenuItems";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/UserHeader.css";
import "../../styles/UserDashboard.css";

export default function UserDashboard() {
  const navigate = useNavigate();

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

  return (
    <div className="user-dashboard-page">
      <UserHeader />

      <div className="user-dashboard-content">
        <div className="user-dashboard-grid">
          {dashboardCards.map((card) => (
            <button
              key={card.title}
              type="button"
              className={`user-dashboard-card ${card.path ? "" : "disabled"}`}
              onClick={() => card.path && navigate(card.path)}
              disabled={!card.path}
            >
              <span className="user-dashboard-card-icon" aria-hidden="true">
                ❖
              </span>
              <div className="user-dashboard-card-body">
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="user-dashboard-footer">
          Grow Your Business: Organization Development Workshop
        </div>
      </div>
    </div>
  );
}
