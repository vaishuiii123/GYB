import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { workshopNavItems } from "./userMenuItems";
import {
  fetchParticipantWorkshops,
  getPreOdAccessStatus,
} from "../../utils/workshopCache";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/UserNavDrawer.css";

type UserNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function UserNavDrawer({ open, onClose }: UserNavDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [preOdEnabled, setPreOdEnabled] = useState(false);

  useEffect(() => {
    const participant = getParticipantFromStorage();
    const selectedWorkshop = getSelectedWorkshop();

    if (!participant?.id || !selectedWorkshop?.id) {
      setPreOdEnabled(false);
      return;
    }

    const applyStatus = (workshop?: { preOdQuestionCount?: number; startDate?: string } | null) => {
      setPreOdEnabled(getPreOdAccessStatus(workshop || selectedWorkshop).enabled);
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
  }, [open]);

  const handleNavigate = (path: string | null) => {
    if (!path) return;
    onClose();
    navigate(path);
  };

  return (
    <>
      <div
        className={`user-nav-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`user-nav-drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
      >
        <nav className="user-nav-menu">
          {workshopNavItems.map((item, index) => {
            const isActive = item.match?.(location.pathname) ?? false;
            const isPreOdItem = item.path === "/pre-od-workshop";
            const path =
              isPreOdItem && !preOdEnabled ? null : item.path;
            const disabled = !path;

            return (
              <div key={item.label}>
                <button
                  type="button"
                  className={`user-nav-item ${isActive ? "active" : ""} ${
                    disabled ? "disabled" : ""
                  }`}
                  onClick={() => handleNavigate(path)}
                  disabled={disabled}
                >
                  <span className="user-nav-icon" aria-hidden="true">
                    ❖
                  </span>
                  <span>{item.label}</span>
                </button>

                {index < workshopNavItems.length - 1 && (
                  <div className="user-nav-divider" />
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
