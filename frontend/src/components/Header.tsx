import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import logo from "../images/knav_white.png";
import { appConfirm } from "../utils/appDialog";
import "../styles/AdminShell.css";

type HeaderProps = {
  user?: { name?: string };
};

export default function Header({ user }: HeaderProps) {
  const navigate = useNavigate();
  const displayName = user?.name || "Admin";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "A";

  const handleLogout = async () => {
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

  const toggleSidebar = () => {
    document.body.classList.toggle("admin-sidebar-collapsed");
  };

  return (
    <header className="admin-shell-header">
      <div className="admin-shell-header-left">
        <img src={logo} alt="KNAV" className="admin-shell-logo" />
        <button
          type="button"
          className="admin-shell-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={22} strokeWidth={2.2} />
        </button>
      </div>

      <div className="admin-shell-header-right">
        <div className="admin-shell-user">
          <span className="admin-shell-avatar" aria-hidden>
            {initials}
          </span>
          <span className="admin-shell-user-name">{displayName}</span>
          <ChevronDown size={16} strokeWidth={2.2} />
        </div>

        <button
          type="button"
          className="admin-shell-logout"
          onClick={handleLogout}
        >
          <LogOut size={16} strokeWidth={2.2} />
          Logout
        </button>
      </div>
    </header>
  );
}
