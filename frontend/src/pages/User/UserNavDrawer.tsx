import { useNavigate, useLocation } from "react-router-dom";
import { workshopNavItems } from "./userMenuItems";
import {
  getFeedbackAccessStatus,
  getPreOdAccessStatus,
  getWorkshopModuleAccessStatus,
  workshopFromSelected,
} from "../../utils/workshopCache";
import { getSelectedWorkshop } from "../../utils/selectedWorkshop";
import "../../styles/UserNavDrawer.css";

type UserNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function UserNavDrawer({ open, onClose }: UserNavDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedWorkshop = getSelectedWorkshop();
  const workshopRecord = selectedWorkshop
    ? workshopFromSelected(selectedWorkshop)
    : null;
  const preOdStatus = getPreOdAccessStatus(selectedWorkshop);
  const feedbackStatus = getFeedbackAccessStatus(selectedWorkshop);
  const moduleStatus = getWorkshopModuleAccessStatus(workshopRecord);

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
            const isFeedbackItem = item.path === "/workshop-feedback";
            const isWorkshopModule =
              item.path === "/vision-mission" ||
              item.path === "/od-chart" ||
              item.path === "/actionables";

            let path = item.path;
            let title: string | undefined;

            if (isPreOdItem && !preOdStatus.enabled) {
              path = null;
              title = preOdStatus.message;
            }

            if (isFeedbackItem && !feedbackStatus.enabled) {
              path = null;
              title = feedbackStatus.message;
            }

            if (isWorkshopModule && !moduleStatus.enabled) {
              path = null;
              title = moduleStatus.message;
            }

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
                  title={title}
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

        <button
          type="button"
          className="user-nav-back"
          onClick={() => handleNavigate("/select-workshop")}
        >
          ← Back
        </button>
      </aside>
    </>
  );
}
