import { useEffect, useState } from "react";
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
  clearCachedPageData,
  getCachedPageData,
  setCachedPageData,
} from "../../utils/workshopCache";
import "../../styles/WorkshopFeedback.css";

type FeedbackQuestion = {
  id: string;
  type: "rating" | "yesno" | "text";
  label: string;
  required: boolean;
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

  useEffect(() => {
    const load = async () => {
      if (!participant?.id) {
        setErrorMessage("Please log in again.");
        setLoading(false);
        return;
      }

      if (!selectedWorkshop?.id) {
        setErrorMessage("Please select a workshop first.");
        setLoading(false);
        return;
      }

      try {
        const cacheKey = `feedback:${participant.id}:${selectedWorkshop.id}`;
        const cached = getCachedPageData<{
          questions: FeedbackQuestion[];
          answers: Record<string, string>;
          available: boolean;
          canSubmit: boolean;
          submitted: boolean;
          message: string;
          workshopName: string;
          submittedDate: string;
        }>(cacheKey);

        if (cached) {
          setQuestions(cached.questions);
          setAnswers(cached.answers);
          setAvailable(cached.available);
          setCanSubmit(cached.canSubmit);
          setSubmitted(cached.submitted);
          setMessage(cached.message);
          setWorkshopName(cached.workshopName);
          setSubmittedDate(cached.submittedDate);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams({
          workshopId: selectedWorkshop.id,
          participantId: participant.id,
        });

        const response = await fetch(
          `/api/get-workshop-feedback?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          if (!cached) {
            setErrorMessage(data.message || "Unable to load feedback form.");
          }
          return;
        }

        const next = {
          questions: data.questions || [],
          answers: data.answers || {},
          available: Boolean(data.available),
          canSubmit: Boolean(data.canSubmit),
          submitted: Boolean(data.submitted),
          message: data.message || "",
          workshopName:
            data.workshop?.workshopName || selectedWorkshop.workshopName,
          submittedDate: data.submittedDate || "",
        };

        setQuestions(next.questions);
        setAnswers(next.answers);
        setAvailable(next.available);
        setCanSubmit(next.canSubmit);
        setSubmitted(next.submitted);
        setMessage(next.message);
        setWorkshopName(next.workshopName);
        setSubmittedDate(next.submittedDate);
        setCachedPageData(cacheKey, next);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load feedback form.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [participant?.id, selectedWorkshop?.id, selectedWorkshop?.workshopName]);

  const updateAnswer = (id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedWorkshop?.id || !participant?.id) {
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
          participantId: participant.id,
          organizationId: participant.organizationId || "",
          workshopId: selectedWorkshop.id,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to submit feedback.");
        return;
      }

      clearCachedPageData(`feedback:${participant.id}:${selectedWorkshop.id}`);
      setSuccessMessage("Feedback submitted successfully.");
      setCanSubmit(false);
      setSubmitted(true);
      setSubmittedDate(data.data?.submittedDate || new Date().toISOString());
      setMessage("You have already submitted feedback for this workshop.");

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
    workshopName || selectedWorkshop?.workshopName || "Workshop";

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
            ) : !available && !submitted ? (
              <div className="fb-empty">
                {message ||
                  "Workshop feedback will be available after the workshop has ended."}
              </div>
            ) : (
              <form
                className="fb-form-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmit();
                }}
              >
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
                                disabled={!canSubmit || saving}
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
                                disabled={!canSubmit || saving}
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
                            disabled={!canSubmit || saving}
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
            )}
          </section>
        </div>

        {!loading && (available || submitted) ? (
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
