import { useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import UserLayout from "./UserLayout";
import { useUnsavedChanges } from "../../utils/unsavedChanges";
import "../../styles/ODChart.css";

type ODChartShellProps = {
  children: React.ReactNode;
};

export default function ODChartShell({ children }: ODChartShellProps) {
  const location = useLocation();
  const { tryNavigate } = useUnsavedChanges();
  const isQuestionsPage = location.pathname.startsWith("/od-chart/questions");

  return (
    <UserLayout contentClassName="user-layout-main-od">
      <div className="od-chart-panel">
        {!isQuestionsPage ? (
          <div className="od-panel-top od-panel-top-actions">
            <button
              type="button"
              className="user-btn-secondary od-back-btn"
              onClick={() => {
                void tryNavigate("/userdashboard");
              }}
            >
              <ArrowLeft size={18} strokeWidth={2} />
              Back to Dashboard
            </button>
          </div>
        ) : null}

        <div className="od-chart-main">{children}</div>
      </div>
    </UserLayout>
  );
}
