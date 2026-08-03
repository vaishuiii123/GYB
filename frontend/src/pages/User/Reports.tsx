import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "./UserLayout";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import {
  getFeedbackAccessStatus,
  getPreOdAccessStatus,
  getWorkshopModuleAccessStatus,
  workshopFromSelected,
} from "../../utils/workshopCache";
import "../../styles/UserReports.css";

type ReportSection = {
  title: string;
  description: string;
  path: string;
  access: "preOd" | "feedback" | "module";
};

const reportSections: ReportSection[] = [
  {
    title: "Pre OD",
    description: "Review your Pre OD responses for this workshop.",
    path: "/pre-od-workshop",
    access: "preOd",
  },
  {
    title: "Vision & Mission",
    description: "View your vision and mission statements.",
    path: "/vision-mission",
    access: "module",
  },
  {
    title: "Unlock Value",
    description: "Open your OD questionnaire responses.",
    path: "/od-chart",
    access: "module",
  },
  {
    title: "Actionables",
    description: "Track priorities and takeaways from the workshop.",
    path: "/actionables",
    access: "module",
  },
  {
    title: "Workshop Feedback",
    description: "Open workshop feedback after the session ends.",
    path: "/workshop-feedback",
    access: "feedback",
  },
];

export default function Reports() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const selectedWorkshop = getSelectedWorkshop();
  const [workshopName, setWorkshopName] = useState("");

  const preOdStatus = getPreOdAccessStatus(selectedWorkshop);
  const feedbackStatus = getFeedbackAccessStatus(selectedWorkshop);
  const moduleStatus = getWorkshopModuleAccessStatus(
    selectedWorkshop ? workshopFromSelected(selectedWorkshop) : null
  );

  const sections = useMemo(() => {
    return reportSections.map((section) => {
      if (section.access === "preOd") {
        return {
          ...section,
          enabled: preOdStatus.enabled,
          note: preOdStatus.message,
        };
      }

      if (section.access === "feedback") {
        return {
          ...section,
          enabled: feedbackStatus.enabled,
          note: feedbackStatus.message,
        };
      }

      return {
        ...section,
        enabled: moduleStatus.enabled,
        note: moduleStatus.message,
      };
    });
  }, [
    preOdStatus.enabled,
    preOdStatus.message,
    feedbackStatus.enabled,
    feedbackStatus.message,
    moduleStatus.enabled,
    moduleStatus.message,
  ]);

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
          {sections.map((section) => (
            <button
              key={section.path}
              type="button"
              className={`user-reports-card ${
                section.enabled ? "" : "is-disabled"
              }`}
              onClick={() => section.enabled && navigate(section.path)}
              disabled={!section.enabled}
              title={section.enabled ? undefined : section.note}
            >
              <span className="user-reports-card-icon" aria-hidden="true">
                ❖
              </span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
                {!section.enabled && section.note ? (
                  <p className="user-reports-card-note">{section.note}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}
