import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import { refreshParticipantWorkshopSchedule } from "../../utils/workshopCache";
import { useUnsavedChanges } from "../../utils/unsavedChanges";
import "../../styles/UserHeader.css";
import "../../styles/UserLayout.css";

type UserLayoutProps = {
  children: React.ReactNode;
  contentClassName?: string;
  /** When false, hides the shared Back to Dashboard control (e.g. OD shell has its own). */
  showBackButton?: boolean;
  /** Override default dashboard back navigation. */
  backTo?: string;
  backLabel?: string;
};

export default function UserLayout({
  children,
  contentClassName = "",
  showBackButton = true,
  backTo = "/userdashboard",
  backLabel = "← Back to Dashboard",
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

  // Keep workshop timing/access in sync when admin changes schedule.
  useEffect(() => {
    const participant = getParticipantFromStorage();
    if (!participant?.id) {
      return;
    }

    const refresh = () => {
      void refreshParticipantWorkshopSchedule({ forceRefresh: true });
    };

    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      refresh();
    }, 15000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [location.pathname]);

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
                void tryNavigate(backTo);
              }}
            >
              {backLabel}
            </button>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
