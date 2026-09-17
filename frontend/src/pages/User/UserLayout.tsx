import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import { useUnsavedChanges } from "../../utils/unsavedChanges";
import "../../styles/UserHeader.css";
import "../../styles/UserLayout.css";

type UserLayoutProps = {
  children: React.ReactNode;
  contentClassName?: string;
  /** When false, hides the shared Back to Dashboard control (e.g. OD shell has its own). */
  showBackButton?: boolean;
};

export default function UserLayout({
  children,
  contentClassName = "",
  showBackButton = true,
}: UserLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryNavigate } = useUnsavedChanges();

  useEffect(() => {
    const participant = getParticipantFromStorage();

    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    if (!getSelectedWorkshop()?.id) {
      navigate("/userdashboard", { replace: true });
    }
  }, [navigate]);

  const isDashboard = location.pathname.startsWith("/userdashboard");
  // OD Chart shell renders its own Back to Dashboard to avoid duplicate controls.
  const isOdChart = location.pathname.startsWith("/od-chart");
  const shouldShowBack = showBackButton && !isDashboard && !isOdChart;

  return (
    <div className="user-layout">
      <UserHeader />

      <main className={`user-layout-main ${contentClassName}`.trim()}>
        {shouldShowBack ? (
          <div className="user-layout-back-row">
            <button
              type="button"
              className="user-btn-secondary od-back-btn user-layout-back-btn"
              onClick={() => {
                void tryNavigate("/userdashboard");
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
