import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Menu } from "lucide-react";
import UserNavDrawer from "./UserNavDrawer";
import {
  clearSelectedWorkshop,
  getParticipantDisplayName,
  getParticipantFromStorage,
} from "../../utils/selectedWorkshop";
import "../../styles/UserHeader.css";

export default function UserHeader() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const participant = getParticipantFromStorage();
  const participantName = getParticipantDisplayName(participant);

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

  const handleLogout = () => {
    if (window.confirm("Do you really want to logout?")) {
      clearSelectedWorkshop();
      localStorage.removeItem("participant");
      navigate("/");
    }
  };

  return (
    <>
      <header className="user-header">
        <div className="user-header-top">
          <div className="user-header-left">
            <button
              type="button"
              className="user-header-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={2} />
            </button>
          </div>

          <div className="user-header-right">
            <div className="user-header-user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-header-user-btn"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="user-header-participant-name">
                  {participantName}
                </span>
                <ChevronDown size={18} strokeWidth={2} />
              </button>

              {menuOpen ? (
                <div className="user-header-dropdown" role="menu">
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
        </div>
      </header>

      <UserNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
