import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { exportWorkshopResponsesExcel } from "../../utils/exportWorkshopResponses";
import "../../styles/AdminDashboard.css";

type PageProps = {
  user?: any;
};

type TabKey =
  | "preOd"
  | "odChart"
  | "visionMission"
  | "actionables"
  | "feedback";

type ParticipantResponse = {
  participantId: string;
  participantName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  preOd: { answers: Record<string, string>; submittedDate?: string } | null;
  odChart: { answers: Record<string, string>; submittedDate?: string } | null;
  visionMission: {
    visionText: string;
    missionText: string;
    visionKeywords: string[];
    missionKeywords: string[];
    submittedDate?: string;
  } | null;
  actionables: Array<{
    id: string;
    categoryName: string;
    description: string;
    timeline: string;
    responsiblePersons: string;
    comments: string;
  }>;
};

type FeedbackQuestion = {
  id: string;
  label: string;
};

type FeedbackSubmission = {
  participantId: string;
  participantName: string;
  firstName?: string;
  lastName?: string;
  answers: Record<string, string>;
  submittedDate?: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function buildFullName(item: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
}) {
  const fullName = [item.firstName, item.middleName, item.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  return fullName || String(item.email || "").trim();
}

function isPlaceholderName(name?: string) {
  const trimmed = String(name || "").trim();
  return (
    !trimmed ||
    trimmed.toLowerCase() === "participant" ||
    trimmed.toLowerCase() === "unknown" ||
    /^\d{10,}$/.test(trimmed)
  );
}

export default function WorkshopResponses({ user }: PageProps) {
  const navigate = useNavigate();
  const { workshopId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("preOd");
  const [participants, setParticipants] = useState<ParticipantResponse[]>([]);
  const [preOdQuestions, setPreOdQuestions] = useState<
    Array<{ srNo: number; category?: string; question: string }>
  >([]);
  const [questionLabels, setQuestionLabels] = useState<Record<string, string>>(
    {}
  );
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>(
    []
  );
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<
    FeedbackSubmission[]
  >([]);
  const [participantNameById, setParticipantNameById] = useState<
    Record<string, string>
  >({});
  const [expandedId, setExpandedId] = useState("");
  const [exporting, setExporting] = useState(false);

  const resolveParticipantName = (participantId: string, fallbackName?: string, firstName?: string, lastName?: string) => {
    const composed = [firstName, lastName]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" ");
    if (composed) {
      return composed;
    }

    const mapped = participantNameById[String(participantId || "").trim()];
    if (mapped && !isPlaceholderName(mapped)) {
      return mapped;
    }
    if (!isPlaceholderName(fallbackName)) {
      return String(fallbackName).trim();
    }
    return mapped || "Unknown";
  };

  useEffect(() => {
    if (!workshopId) {
      setErrorMessage("Workshop not found.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const [responsesRes, feedbackRes, participantsRes] = await Promise.all([
          fetch(
            `/api/get-workshop-responses?workshopId=${encodeURIComponent(
              workshopId
            )}`
          ),
          fetch(
            `/api/get-workshop-feedback?workshopId=${encodeURIComponent(
              workshopId
            )}&admin=true`
          ),
          fetch("/api/get-participants"),
        ]);

        const responsesData = await responsesRes.json();
        const feedbackData = await feedbackRes.json();
        const participantsData = await participantsRes.json().catch(() => null);

        if (!responsesRes.ok || !responsesData.success) {
          setErrorMessage(
            responsesData.message || "Unable to load workshop responses."
          );
          return;
        }

        const nameMap: Record<string, string> = {};
        if (participantsData?.success && Array.isArray(participantsData.participants)) {
          participantsData.participants.forEach(
            (item: {
              id?: string;
              firstName?: string;
              middleName?: string;
              lastName?: string;
              email?: string;
            }) => {
              const id = String(item.id || "").trim();
              if (!id) {
                return;
              }
              const fullName = buildFullName(item);
              if (fullName) {
                nameMap[id] = fullName;
              }
            }
          );
        }

        const responseParticipants: ParticipantResponse[] =
          responsesData.participants || [];
        responseParticipants.forEach((item) => {
          const id = String(item.participantId || "").trim();
          if (!id || nameMap[id]) {
            return;
          }
          const composed = buildFullName({
            firstName: item.firstName,
            lastName: item.lastName,
            email: item.email,
          });
          if (composed && !isPlaceholderName(composed)) {
            nameMap[id] = composed;
            return;
          }
          if (!isPlaceholderName(item.participantName)) {
            nameMap[id] = String(item.participantName).trim();
          }
        });

        let feedbackList: FeedbackSubmission[] = [];
        if (feedbackRes.ok && feedbackData.success) {
          feedbackList = feedbackData.submissions || [];
          feedbackList.forEach((item) => {
            const id = String(item.participantId || "").trim();
            if (!id || nameMap[id]) {
              return;
            }
            if (!isPlaceholderName(item.participantName)) {
              nameMap[id] = String(item.participantName).trim();
            }
          });
        }

        setParticipantNameById(nameMap);
        setWorkshopName(responsesData.workshop?.workshopName || "Workshop");
        setOrganizationName(responsesData.workshop?.organizationName || "");
        setParticipants(responseParticipants);
        setPreOdQuestions(responsesData.preOdQuestions || []);
        setQuestionLabels(responsesData.questionLabels || {});

        if (feedbackRes.ok && feedbackData.success) {
          setFeedbackQuestions(feedbackData.questions || []);
          setFeedbackSubmissions(feedbackList);
        }

        setExpandedId("");
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load workshop responses.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [workshopId]);

  const filteredParticipants = participants.filter((item) => {
    if (activeTab === "preOd") return Boolean(item.preOd);
    if (activeTab === "odChart") return Boolean(item.odChart);
    if (activeTab === "visionMission") return Boolean(item.visionMission);
    if (activeTab === "actionables") return item.actionables.length > 0;
    return false;
  });

  const showingFeedback = activeTab === "feedback";

  const handleExportExcel = async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting(true);
      exportWorkshopResponsesExcel({
        workshopName,
        organizationName,
        participants,
        preOdQuestions,
        questionLabels,
        feedbackQuestions,
        feedbackSubmissions,
        participantNameById,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-dashboard-page">
      <Header user={user} />
      <Sidebar />

      <div className="admin-dashboard-content">
        <div className="admin-dashboard-header">
          <div>
            <h1>{workshopName || "Workshop Responses"}</h1>
            {organizationName ? (
              <p className="admin-dashboard-subtitle">{organizationName}</p>
            ) : null}
          </div>

          <div className="admin-dashboard-header-actions">
            <button
              type="button"
              className="admin-dashboard-primary-btn"
              onClick={handleExportExcel}
              disabled={loading || exporting || Boolean(errorMessage)}
            >
              {exporting ? "Exporting..." : "Export Excel"}
            </button>
            <button
              type="button"
              className="admin-dashboard-secondary-btn"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="admin-dashboard-tabs">
          {(
            [
              ["preOd", "Pre OD"],
              ["odChart", "OD Chart"],
              ["visionMission", "Vision & Mission"],
              ["actionables", "Actionables"],
              ["feedback", "Feedback"],
            ] as Array<[TabKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`admin-dashboard-tab ${
                activeTab === key ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(key);
                setExpandedId("");
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="admin-dashboard-section">
          {loading ? (
            <p className="admin-dashboard-status">Loading responses...</p>
          ) : errorMessage ? (
            <div className="admin-dashboard-empty">{errorMessage}</div>
          ) : showingFeedback ? (
            feedbackSubmissions.length === 0 ? (
              <div className="admin-dashboard-empty">
                No feedback submissions for this workshop yet.
              </div>
            ) : (
              <div className="admin-dashboard-submissions">
                {feedbackSubmissions.map((submission) => {
                  const isExpanded = expandedId === submission.participantId;

                  return (
                    <div
                      key={submission.participantId}
                      className="admin-dashboard-submission-card"
                    >
                      <button
                        type="button"
                        className="admin-dashboard-submission-toggle"
                        onClick={() =>
                          setExpandedId(
                            isExpanded ? "" : submission.participantId
                          )
                        }
                      >
                        <div>
                          <strong>
                            {resolveParticipantName(
                              submission.participantId,
                              submission.participantName,
                              submission.firstName,
                              submission.lastName
                            )}
                          </strong>
                          <span>
                            Submitted: {formatDate(submission.submittedDate)}
                          </span>
                        </div>
                        <span>{isExpanded ? "−" : "+"}</span>
                      </button>

                      {isExpanded ? (
                        <div className="admin-dashboard-answers">
                          {feedbackQuestions.map((question) => (
                            <div
                              key={question.id}
                              className="admin-dashboard-answer"
                            >
                              <p className="admin-dashboard-question">
                                {question.label}
                              </p>
                              <p className="admin-dashboard-response">
                                {submission.answers[question.id] || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredParticipants.length === 0 ? (
            <div className="admin-dashboard-empty">
              No {activeTab === "odChart" ? "OD Chart" : activeTab} responses
              for this workshop.
            </div>
          ) : (
            <div className="admin-dashboard-submissions">
              {filteredParticipants.map((participant) => {
                const isExpanded = expandedId === participant.participantId;

                return (
                  <div
                    key={participant.participantId}
                    className="admin-dashboard-submission-card"
                  >
                    <button
                      type="button"
                      className="admin-dashboard-submission-toggle"
                      onClick={() =>
                        setExpandedId(
                          isExpanded ? "" : participant.participantId
                        )
                      }
                    >
                      <div>
                        <strong>
                          {resolveParticipantName(
                            participant.participantId,
                            participant.participantName,
                            participant.firstName,
                            participant.lastName
                          )}
                        </strong>
                        <span>
                          {activeTab === "preOd" &&
                            `Submitted: ${formatDate(
                              participant.preOd?.submittedDate
                            )}`}
                          {activeTab === "odChart" &&
                            `Submitted: ${formatDate(
                              participant.odChart?.submittedDate
                            )}`}
                          {activeTab === "visionMission" &&
                            `Submitted: ${formatDate(
                              participant.visionMission?.submittedDate
                            )}`}
                          {activeTab === "actionables" &&
                            `${participant.actionables.length} actionable(s)`}
                        </span>
                      </div>
                      <span>{isExpanded ? "−" : "+"}</span>
                    </button>

                    {isExpanded ? (
                      <div className="admin-dashboard-answers">
                        {activeTab === "preOd" &&
                          preOdQuestions.map((question) => (
                            <div
                              key={question.srNo}
                              className="admin-dashboard-answer"
                            >
                              <p className="admin-dashboard-question">
                                {question.srNo}. {question.question}
                              </p>
                              <p className="admin-dashboard-response">
                                {participant.preOd?.answers[
                                  String(question.srNo)
                                ] || "—"}
                              </p>
                            </div>
                          ))}

                        {activeTab === "odChart" &&
                          Object.entries(
                            participant.odChart?.answers || {}
                          ).map(([questionId, answer]) => (
                            <div
                              key={questionId}
                              className="admin-dashboard-answer"
                            >
                              <p className="admin-dashboard-question">
                                {questionLabels[questionId] || questionId}
                              </p>
                              <p className="admin-dashboard-response">
                                {answer || "—"}
                              </p>
                            </div>
                          ))}

                        {activeTab === "visionMission" &&
                          participant.visionMission && (
                            <>
                              <div className="admin-dashboard-answer">
                                <p className="admin-dashboard-question">
                                  Vision
                                </p>
                                <p className="admin-dashboard-response">
                                  {participant.visionMission.visionText || "—"}
                                </p>
                              </div>
                              <div className="admin-dashboard-answer">
                                <p className="admin-dashboard-question">
                                  Mission
                                </p>
                                <p className="admin-dashboard-response">
                                  {participant.visionMission.missionText || "—"}
                                </p>
                              </div>
                            </>
                          )}

                        {activeTab === "actionables" &&
                          participant.actionables.map((item) => (
                            <div
                              key={item.id}
                              className="admin-dashboard-answer"
                            >
                              <p className="admin-dashboard-question">
                                {item.categoryName || "Actionable"}
                              </p>
                              <p className="admin-dashboard-response">
                                <strong>Description:</strong> {item.description}
                                <br />
                                <strong>Timeline:</strong> {item.timeline}
                                <br />
                                <strong>Responsible:</strong>{" "}
                                {item.responsiblePersons}
                                {item.comments ? (
                                  <>
                                    <br />
                                    <strong>Comments:</strong> {item.comments}
                                  </>
                                ) : null}
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
