import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/AdminDashboard.css";

type PageProps = {
  user?: any;
};

type ResponseQuestion = {
  srNo: number;
  category: string;
  question: string;
};

type PreOdSubmission = {
  participantId: string;
  participantName: string;
  submittedDate?: string;
  answers: Record<string, string>;
};

function formatSubmittedDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function PreODResponses({ user }: PageProps) {
  const navigate = useNavigate();
  const { workshopId = "" } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [questions, setQuestions] = useState<ResponseQuestion[]>([]);
  const [submissions, setSubmissions] = useState<PreOdSubmission[]>([]);
  const [expandedParticipantId, setExpandedParticipantId] = useState("");

  useEffect(() => {
    if (!workshopId) {
      setErrorMessage("Workshop not found.");
      setLoading(false);
      return;
    }

    const loadResponses = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `/api/get-pre-od-responses?workshopId=${encodeURIComponent(workshopId)}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || "Unable to load Pre OD responses.");
          setQuestions([]);
          setSubmissions([]);
          return;
        }

        setWorkshopName(data.workshop?.workshopName || "Workshop");
        setOrganizationName(data.workshop?.organizationName || "");
        setQuestions(data.questions || []);
        setSubmissions(data.submissions || []);
        setExpandedParticipantId("");
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load Pre OD responses.");
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [workshopId]);

  return (
    <div className="admin-dashboard-page">
      <Header user={user} />
      <Sidebar />

      <div className="admin-dashboard-content">
        <div className="admin-dashboard-header">
          <div>
            <h1>{workshopName || "Pre OD Responses"}</h1>
            {organizationName ? (
              <p className="admin-dashboard-subtitle">{organizationName}</p>
            ) : null}
          </div>

          <div className="admin-dashboard-header-actions">
            <button
              type="button"
              className="admin-dashboard-secondary-btn"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="admin-dashboard-link-btn"
              onClick={() => navigate("/pre-od")}
            >
              Manage Pre OD
            </button>
          </div>
        </div>

        <section className="admin-dashboard-section">
          <div className="admin-dashboard-section-header">
            <h2>All Pre OD Responses</h2>
            <p>
              {submissions.length} submission
              {submissions.length === 1 ? "" : "s"} for this workshop
            </p>
          </div>

          {loading ? (
            <p className="admin-dashboard-status">Loading responses...</p>
          ) : errorMessage ? (
            <div className="admin-dashboard-empty">{errorMessage}</div>
          ) : submissions.length === 0 ? (
            <div className="admin-dashboard-empty">
              No Pre OD submissions yet for this workshop.
            </div>
          ) : (
            <div className="admin-dashboard-submissions">
              {submissions.map((submission) => {
                const isExpanded =
                  expandedParticipantId === submission.participantId;

                return (
                  <div
                    key={submission.participantId}
                    className="admin-dashboard-submission-card"
                  >
                    <button
                      type="button"
                      className="admin-dashboard-submission-toggle"
                      onClick={() =>
                        setExpandedParticipantId(
                          isExpanded ? "" : submission.participantId
                        )
                      }
                    >
                      <div>
                        <strong>{submission.participantName}</strong>
                        <span>
                          Submitted:{" "}
                          {formatSubmittedDate(submission.submittedDate)}
                        </span>
                      </div>
                      <span>{isExpanded ? "−" : "+"}</span>
                    </button>

                    {isExpanded ? (
                      <div className="admin-dashboard-answers">
                        {questions.map((question) => (
                          <div
                            key={question.srNo}
                            className="admin-dashboard-answer"
                          >
                            <p className="admin-dashboard-question">
                              {question.srNo}. {question.question}
                            </p>
                            <p className="admin-dashboard-response">
                              {submission.answers[String(question.srNo)] || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
