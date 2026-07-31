import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import UserLayout from "./UserLayout";
import "../../styles/ODChart.css";

type ODChartShellProps = {
  backLabel?: string;
  backPath?: string;
  children: React.ReactNode;
};

export default function ODChartShell({
  backLabel = "Back to Chart",
  backPath = "/od-chart",
  children,
}: ODChartShellProps) {
  const navigate = useNavigate();
  const isQuestionsPage = backPath !== "/od-chart";

  return (
    <UserLayout contentClassName="user-layout-main-od">
      <div className="od-chart-panel">
        {isQuestionsPage && (
          <div className="od-panel-top">
            <button
              type="button"
              className="od-back-btn"
              onClick={() => navigate(backPath)}
            >
              <ArrowLeft size={18} strokeWidth={2} />
              {backLabel}
            </button>
          </div>
        )}

        <div className="od-chart-main">{children}</div>
      </div>
    </UserLayout>
  );
}
