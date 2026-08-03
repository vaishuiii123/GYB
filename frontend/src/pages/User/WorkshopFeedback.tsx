import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Info,
  Lightbulb,
  Lock,
  MessageSquare,
  Send,
  Star,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UserLayout from "./UserLayout";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import {
  getCachedPageData,
  getFeedbackAccessStatus,
  setCachedPageData,
} from "../../utils/workshopCache";
import "../../styles/WorkshopFeedback.css";

type FeedbackQuestion = {
  id: string;
  type: "rating" | "yesno" | "text";
  label: string;
  required: boolean;
};

type FeedbackPageData = {
  questions: FeedbackQuestion[];
  answers: Record<string, string>;
  available: boolean;
  canSubmit: boolean;
  submitted: boolean;
  message: string;
  workshopName: string;
  submittedDate: string;
};

const QUESTION_ICONS: LucideIcon[] = [
  Star,
  BarChart3,
  Users,
  ThumbsUp,
  Lightbulb,
  TrendingUp,
  MessageSquare,
];

function questionIcon(
  index: number,
  type: FeedbackQuestion["type"]
): LucideIcon {
  if (QUESTION_ICONS[index]) {
    return QUESTION_ICONS[index];
  }

  if (type === "rating") return Star;
  if (type === "yesno") return ThumbsUp;
  return MessageSquare;
}

export default function WorkshopFeedback() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const selectedWorkshop = getSelectedWorkshop();
  const participantId = String(participant?.id || "").trim();
  const workshopId = String(selectedWorkshop?.id || "").trim();
  const workshopNameFromSelection = selectedWorkshop?.workshopName || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [available, setAvailable] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const requestIdRef = useRef(0);

  const applyPageData = (next: FeedbackPageData) => {
    setQuestions(next.questions || []);
    setAnswers(next.answers || {});
    setAvailable(Boolean(next.available));
    setCanSubmit(Boolean(next.canSubmit));
    setSubmitted(Boolean(next.submitted));
    setMessage(next.message || "");
    setWorkshopName(next.workshopName || "");
    setSubmittedDate(next.submittedDate || "");
  };

  useEffect(() => {
    const workshop = getSelectedWorkshop();

    if (!getFeedbackAccessStatus(workshop).enabled) {
      navigate("/userdashboard", { replace: true });
      return;
    }

    if (!participantId) {
      setErrorMessage("Please log in again.");
      setLoading(false);
      return;
    }

    if (!workshopId) {
      setErrorMessage("Please select a workshop first.");
      setLoading(false);
      return;
    }

    const cacheKey = `feedback:${participantId}:${workshopId}`;
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const load = async () => {
      try {
        const cached = getCachedPageData<FeedbackPageData>(cacheKey);
        if (cached && requestId === requestIdRef.current) {
          applyPageData(cached);
          setLoading(false);
        } else if (!cached) {
          setLoading(true);
        }

        const params = new URLSearchParams({
          workshopId,
          participantId,
        });

        const response = await fetch(
          `/api/get-workshop-feedback?${params.toString()}`
        );
        const data = await response.json();

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || "Unable to load feedback form.");
          setCanSubmit(false);
          return;
        }

        const next: FeedbackPageData = {
          questions: data.questions || [],
          answers: data.answers || {},
          available: Boolean(data.available),
          canSubmit: Boolean(data.canSubmit),
          submitted: Boolean(data.submitted),
          message: data.message || "",
          workshopName:
            data.workshop?.workshopName || workshopNameFromSelection || "",
          submittedDate: data.submittedDate || "",
        };

        applyPageData(next);
        setCachedPageData(cacheKey, next);
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        if (!cancelled && requestId === requestIdRef.current) {
          setErrorMessage("Unable to load feedback form.");
          setCanSubmit(false);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate, participantId, workshopId, workshopNameFromSelection]);

  const updateAnswer = (id: string, value: string) => {
    if (!canSubmit || submitted) {
      return;
    }
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitted || !workshopId || !participantId) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/save-workshop-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          organizationId: participant.organizationId || "",
          workshopId,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to submit feedback.");
        return;
      }

      const submittedAt =
        data.data?.submittedDate || new Date().toISOString();
      const savedAnswers = data.data?.answers || answers;
      const next: FeedbackPageData = {
        questions,
        answers: savedAnswers,
        available: true,
        canSubmit: false,
        submitted: true,
        message: "You have already submitted feedback for this workshop.",
        workshopName: workshopName || workshopNameFromSelection || "Workshop",
        submittedDate: submittedAt,
      };

      applyPageData(next);
      setCachedPageData(`feedback:${participantId}:${workshopId}`, next);
      setSuccessMessage("Feedback submitted successfully.");

      setTimeout(() => {
        navigate("/userdashboard", { replace: true });
      }, 1200);
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to submit feedback.");
    } finally {
      setSaving(false);
    }
  };

  const displayWorkshopName =
    workshopName || workshopNameFromSelection || "Workshop";
  const readOnly = submitted || !canSubmit;
  const showForm = !loading && (available || submitted) && questions.length > 0;
  const hasAnswers = Object.keys(answers).some(
    (key) => String(answers[key] || "").trim() !== ""
  );

  return (
    <UserLayout contentClassName="feedback-layout">
      <div className="fb-page">
        <div className="fb-layout">
          <aside className="fb-side">
            <div className="fb-side-copy">
              <h1>Workshop Feedback</h1>
              <p>
                Share your feedback after the workshop ends. This can be
                submitted only once.
              </p>
            </div>

            <div className="fb-side-art" aria-hidden>
              <div className="fb-art-blob fb-art-blob-a" />
              <div className="fb-art-blob fb-art-blob-b" />
              <div className="fb-art-leaf fb-art-leaf-l" />
              <div className="fb-art-leaf fb-art-leaf-r" />
              <div className="fb-art-clipboard">
                <ClipboardList size={42} strokeWidth={1.6} />
              </div>
              <div className="fb-art-bubble">
                <MessageSquare size={18} strokeWidth={2} />
              </div>
            </div>

            {submitted ? (
              <div className="fb-status-card is-submitted">
                <span className="fb-status-icon" aria-hidden>
                  <Info size={15} strokeWidth={2.4} />
                </span>
                <div>
                  <strong>Already submitted</strong>
                  <p>
                    {message ||
                      "You have already submitted feedback for this workshop."}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="fb-status-card is-workshop">
              <span className="fb-status-icon" aria-hidden>
                <CalendarDays size={15} strokeWidth={2.2} />
              </span>
              <div>
                <strong>{displayWorkshopName}</strong>
                {submittedDate ? (
                  <p>
                    Submitted on {new Date(submittedDate).toLocaleString()}
                  </p>
                ) : (
                  <p>Feedback opens after the workshop ends.</p>
                )}
              </div>
            </div>

            <div className="fb-side-decor" aria-hidden />
          </aside>

          <section className="fb-main">
            {errorMessage ? (
              <div className="fb-alert fb-alert-error">{errorMessage}</div>
            ) : null}
            {successMessage ? (
              <div className="fb-alert fb-alert-success">{successMessage}</div>
            ) : null}

            {loading ? (
              <p className="fb-status">Loading feedback form...</p>
            ) : showForm ? (
              <form
                className={`fb-form-card ${readOnly ? "is-readonly" : ""}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmit();
                }}
              >
                {submitted ? (
                  <div className="fb-readonly-banner">
                    {hasAnswers
                      ? "Your submitted responses are shown below and cannot be edited."
                      : "Feedback already submitted. Responses could not be loaded — please refresh."}
                  </div>
                ) : null}

                {questions.map((question, index) => {
                  const Icon = questionIcon(index, question.type);

                  return (
                    <div key={question.id} className="fb-question-row">
                      <span className="fb-question-icon" aria-hidden>
                        <Icon size={16} strokeWidth={2} />
                      </span>

                      <div className="fb-question-body">
                        <label className="fb-question-label">
                          {question.label}
                          {question.required ? (
                            <span className="fb-required"> *</span>
                          ) : null}
                        </label>

                        {question.type === "rating" ? (
                          <div className="fb-rating">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={`fb-choice-btn ${
                                  String(answers[question.id]) === String(value)
                                    ? "is-active"
                                    : ""
                                }`}
                                disabled={readOnly || saving}
                                onClick={() =>
                                  updateAnswer(question.id, String(value))
                                }
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {question.type === "yesno" ? (
                          <div className="fb-yesno">
                            {["Yes", "No"].map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={`fb-choice-btn fb-yesno-btn ${
                                  answers[question.id] === value
                                    ? "is-active"
                                    : ""
                                }`}
                                disabled={readOnly || saving}
                                onClick={() =>
                                  updateAnswer(question.id, value)
                                }
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {question.type === "text" ? (
                          <textarea
                            rows={3}
                            value={answers[question.id] || ""}
                            disabled={readOnly || saving}
                            onChange={(event) =>
                              updateAnswer(question.id, event.target.value)
                            }
                            placeholder="Enter your response"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                <p className="fb-lock-note">
                  <Lock size={13} strokeWidth={2.2} />
                  Feedback is one time only and cannot be edited after submit.
                </p>
              </form>
            ) : (
              <div className="fb-empty">
                {message ||
                  errorMessage ||
                  "Workshop feedback will be available after the workshop has ended."}
              </div>
            )}
          </section>
        </div>

        {showForm && !submitted ? (
          <div className="fb-submit-bar">
            <button
              type="button"
              className="fb-submit-btn"
              disabled={!canSubmit || saving}
              onClick={handleSubmit}
            >
              <Send size={16} strokeWidth={2.2} />
              {saving ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        ) : null}
      </div>
    </UserLayout>
  );
}
