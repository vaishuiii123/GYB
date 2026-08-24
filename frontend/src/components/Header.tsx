import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import logo from "../images/knav_white.png";
import { appConfirm } from "../utils/appDialog";
import AppVersionControl from "./AppVersionControl";
import "../styles/AdminShell.css";

type HeaderProps = {
  user?: { name?: string };
};

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.name || "Admin";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "A";

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

  const handleLogout = async () => {
    setMenuOpen(false);
    const confirmLogout = await appConfirm("Do you really want to logout?", {
      title: "Logout",
      confirmLabel: "Logout",
      variant: "warning",
    });

    if (confirmLogout) {
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
    }
  };

  return (
    <header className="admin-shell-header">
      <div className="admin-shell-header-left">
        <img src={logo} alt="KNAV" className="admin-shell-logo" />
      </div>

      <div className="admin-shell-header-right">
        <AppVersionControl variant="onDark" />

        <div className="admin-shell-user-menu" ref={menuRef}>
          <button
            type="button"
            className="admin-shell-user-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="admin-shell-avatar" aria-hidden>
              {initials}
            </span>
            <span className="admin-shell-user-name">{displayName}</span>
            <ChevronDown size={16} strokeWidth={2.2} />
          </button>

          {menuOpen ? (
            <div className="admin-shell-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
