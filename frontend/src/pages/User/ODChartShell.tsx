import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import UserLayout from "./UserLayout";
import "../../styles/ODChart.css";

type ODChartShellProps = {
  children: React.ReactNode;
};

export default function ODChartShell({ children }: ODChartShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isQuestionsPage = location.pathname.startsWith("/od-chart/questions");

  return (
    <UserLayout contentClassName="user-layout-main-od">
      <div className="od-chart-panel">
        {!isQuestionsPage ? (
          <div className="od-panel-top od-panel-top-actions">
            <button
              type="button"
              className="user-btn-secondary od-back-btn"
              onClick={() => navigate("/userdashboard")}
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
