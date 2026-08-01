import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "./UserLayout";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/UserReports.css";

type ReportSection = {
  title: string;
  description: string;
  path: string;
};

const reportSections: ReportSection[] = [
  {
    title: "Pre OD",
    description: "Review your Pre OD responses for this workshop.",
    path: "/pre-od-workshop",
  },
  {
    title: "Vision & Mission",
    description: "View your vision and mission statements.",
    path: "/vision-mission",
  },
  {
    title: "Unlock Value",
    description: "Open your OD questionnaire responses.",
    path: "/od-chart",
  },
  {
    title: "Actionables",
    description: "Track priorities and takeaways from the workshop.",
    path: "/actionables",
  },
  {
    title: "Workshop Feedback",
    description: "Open workshop feedback after the session ends.",
    path: "/workshop-feedback",
  },
];

export default function Reports() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const selectedWorkshop = getSelectedWorkshop();
  const [workshopName, setWorkshopName] = useState("");

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    if (!selectedWorkshop?.id) {
      navigate("/select-workshop", { replace: true });
      return;
    }

    setWorkshopName(selectedWorkshop.workshopName || "Workshop");
  }, [navigate, participant?.id, selectedWorkshop?.id, selectedWorkshop?.workshopName]);

  return (
    <UserLayout>
      <div className="user-reports-page">
        <div className="user-reports-header">
          <h1>Reports</h1>
          <p>
            Summary of key insights, participant reflections, and actionables
            {workshopName ? ` for ${workshopName}` : ""}.
          </p>
        </div>

        <div className="user-reports-grid">
          {reportSections.map((section) => (
            <button
              key={section.path}
              type="button"
              className="user-reports-card"
              onClick={() => navigate(section.path)}
            >
              <span className="user-reports-card-icon" aria-hidden="true">
                ❖
              </span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}
