import { useNavigate, useLocation } from "react-router-dom";
import { workshopNavItems } from "./userMenuItems";
import "../../styles/UserNavDrawer.css";

type UserNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function UserNavDrawer({ open, onClose }: UserNavDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();

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

            return (
              <div key={item.label}>
                <button
                  type="button"
                  className={`user-nav-item ${isActive ? "active" : ""} ${
                    item.path ? "" : "disabled"
                  }`}
                  onClick={() => handleNavigate(item.path)}
                  disabled={!item.path}
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
