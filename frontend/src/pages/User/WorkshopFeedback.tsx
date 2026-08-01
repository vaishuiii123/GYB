import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/WorkshopFeedback.css";

type FeedbackQuestion = {
  id: string;
  type: "rating" | "yesno" | "text";
  label: string;
  required: boolean;
};

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
        setLoading(true);
        const params = new URLSearchParams({
          workshopId: selectedWorkshop.id,
          participantId: participant.id,
        });

        const response = await fetch(
          `/api/get-workshop-feedback?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || "Unable to load feedback form.");
          return;
        }

        setQuestions(data.questions || []);
        setAnswers(data.answers || {});
        setAvailable(Boolean(data.available));
        setCanSubmit(Boolean(data.canSubmit));
        setSubmitted(Boolean(data.submitted));
        setMessage(data.message || "");
        setWorkshopName(data.workshop?.workshopName || selectedWorkshop.workshopName);
        setSubmittedDate(data.submittedDate || "");
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

  return (
    <UserLayout contentClassName="feedback-layout">
      <div className="feedback-page">
        <div className="feedback-header">
          <h1>Workshop Feedback</h1>
          <p>
            Share your feedback after the workshop ends. This can be submitted
            only once.
          </p>
        </div>

        {message ? <WorkshopEditBanner message={message} /> : null}
        {errorMessage ? <div className="feedback-error">{errorMessage}</div> : null}
        {successMessage ? (
          <div className="feedback-success">{successMessage}</div>
        ) : null}

        {loading ? (
          <p className="feedback-status">Loading feedback form...</p>
        ) : !available && !submitted ? (
          <div className="feedback-empty">
            {message ||
              "Workshop feedback will be available after the workshop has ended."}
          </div>
        ) : (
          <>
            <div className="feedback-workshop-card">
              <h2>{workshopName || "Workshop"}</h2>
              {submittedDate ? (
                <p className="feedback-submitted">
                  Submitted: {new Date(submittedDate).toLocaleString()}
                </p>
              ) : null}
            </div>

            <form
              className="feedback-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              {questions.map((question) => (
                <label key={question.id} className="feedback-field">
                  <span className="feedback-label">
                    {question.label}
                    {question.required ? " *" : ""}
                  </span>

                  {question.type === "rating" ? (
                    <div className="feedback-rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`feedback-rating-btn ${
                            String(answers[question.id]) === String(value)
                              ? "active"
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
                    <div className="feedback-yesno">
                      {["Yes", "No"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`feedback-yesno-btn ${
                            answers[question.id] === value ? "active" : ""
                          }`}
                          disabled={!canSubmit || saving}
                          onClick={() => updateAnswer(question.id, value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {question.type === "text" ? (
                    <textarea
                      rows={4}
                      value={answers[question.id] || ""}
                      disabled={!canSubmit || saving}
                      onChange={(event) =>
                        updateAnswer(question.id, event.target.value)
                      }
                      placeholder="Enter your response"
                    />
                  ) : null}
                </label>
              ))}

              {canSubmit ? (
                <button
                  type="submit"
                  className="user-btn-primary feedback-submit"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Feedback"}
                </button>
              ) : (
                <p className="feedback-readonly-note">
                  Feedback is one-time only and cannot be edited after submit.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </UserLayout>
  );
}
