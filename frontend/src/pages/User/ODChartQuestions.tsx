import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import ODChartShell from "./ODChartShell";
import {
  fetchWorkshopByOrganization,
  getWorkshopEditStatus,
} from "../../utils/workshopCache";
import "../../styles/ODChart.css";
import { OD_CHART_NAV_KEY } from "./ODChart";
import type { ODQuestionsNavState, Question } from "./ODChart";

const STATUS_OPTIONS = [
  { value: "Red", label: "Red", className: "status-red" },
  { value: "Yellow", label: "Yellow", className: "status-yellow" },
  { value: "Green", label: "Green", className: "status-green" },
];

function loadNavState(location: ReturnType<typeof useLocation>): ODQuestionsNavState | null {
  const fromRoute = location.state as ODQuestionsNavState | null;
  if (fromRoute?.leaf && fromRoute?.workshop) {
    return fromRoute;
  }

  try {
    const stored = sessionStorage.getItem(OD_CHART_NAV_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function ODChartQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navState, setNavState] = useState<ODQuestionsNavState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [editMessage, setEditMessage] = useState("");

  const participant = (() => {
    try {
      return JSON.parse(localStorage.getItem("participant") || "{}");
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    const state = loadNavState(location);
    if (!state) {
      navigate("/od-chart", { replace: true });
      return;
    }
    setNavState(state);

    const loadPageData = async () => {
      if (!participant.id || !state.workshop.id) {
        setLoading(false);
        return;
      }

      try {
        if (participant.organizationId) {
          const workshopData = await fetchWorkshopByOrganization(
            participant.organizationId
          );
          const editStatus =
            typeof workshopData.canEdit === "boolean"
              ? {
                  canEdit: workshopData.canEdit,
                  editMessage: workshopData.editMessage || "",
                }
              : getWorkshopEditStatus(workshopData.workshop);

          setCanEdit(editStatus.canEdit);
          setEditMessage(editStatus.editMessage);
        }

        const query = new URLSearchParams({
          categoryId: state.leaf.id,
          participantId: participant.id,
          workshopId: state.workshop.id,
          templateId: state.workshop.templateId,
        });

        const questionsRes = await fetch(
          `/api/get-category-questions?${query.toString()}`
        );
        const questionsData = await questionsRes.json();

        if (questionsData.success) {
          setQuestions(
            (questionsData.data || []).map(
              (item: {
                questionId: string;
                questionText: string;
                questionType: string;
                tagId?: string;
                tagName?: string;
                tagColor?: string;
                options: { optionText: string }[] | string[];
              }) => ({
                id: item.questionId,
                question: item.questionText,
                answerType: item.questionType,
                tagId: item.tagId,
                tagName: item.tagName,
                tagColor: item.tagColor,
                options: (item.options || []).map((option) =>
                  typeof option === "string" ? option : option.optionText
                ),
              })
            )
          );
          setAnswers(questionsData.answers || {});
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load questions.");
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [location, navigate, participant.id]);

  const setAnswer = (questionId: string, value: string) => {
    if (!canEdit) {
      return;
    }

    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      setErrorMessage(
        editMessage ||
          "The workshop has ended. You can no longer edit questionnaire answers."
      );
      return;
    }

    if (!participant.id || !navState) {
      setErrorMessage("Please log in again to save responses.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      let mergedAnswers = { ...answers };

      const existingRes = await fetch(
        `/api/get-od-responses?participantId=${participant.id}&workshopId=${navState.workshop.id}`
      );
      const existingData = await existingRes.json();
      if (existingData.success) {
        mergedAnswers = {
          ...(existingData.data.answers || {}),
          ...answers,
        };
      }

      const response = await fetch("/api/save-od-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          workshopId: navState.workshop.id,
          organizationId: participant.organizationId || "",
          templateId: navState.workshop.templateId,
          answers: mergedAnswers,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.message || "Failed to save responses.");
        return;
      }

      setSuccessMessage("Responses saved successfully.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const currentValue = answers[question.id] || "";
    const type = question.answerType.toLowerCase();
    const disabled = !canEdit;

    if (type.includes("rating") || type.includes("single")) {
      return (
        <div className="status-buttons">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`status-btn ${option.className} ${
                currentValue === option.value ? "selected" : ""
              }`}
              onClick={() => setAnswer(question.id, option.value)}
              disabled={disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    if (question.options.length > 0) {
      return (
        <div className="option-buttons">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`option-btn ${
                currentValue === option ? "selected" : ""
              }`}
              onClick={() => setAnswer(question.id, option)}
              disabled={disabled}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    return (
      <textarea
        value={currentValue}
        onChange={(event) => setAnswer(question.id, event.target.value)}
        placeholder="Enter your response"
        rows={3}
        disabled={disabled}
      />
    );
  };

  if (!navState) {
    return null;
  }

  return (
    <ODChartShell
      backLabel="Back to Chart"
      backPath="/od-chart"
    >
      <div className="od-questions-panel">
        <nav className="od-breadcrumb" aria-label="Category breadcrumb">
          {navState.breadcrumb.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="od-breadcrumb-item">
              {index > 0 && <span className="od-breadcrumb-sep"> › </span>}
              <span
                className={
                  index === navState.breadcrumb.length - 1
                    ? "od-breadcrumb-current"
                    : "od-breadcrumb-text"
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        <h1 className="od-questions-title">{navState.leaf.name}</h1>
        <p className="od-questions-path">{navState.leaf.fullPath}</p>

        {!canEdit && <WorkshopEditBanner message={editMessage} />}

        {loading ? (
          <p className="od-chart-status">Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="od-no-questions">
            No questions are assigned to you for this category in your workshop
            template.
          </p>
        ) : (
          questions.map((question) => (
            <div
              key={question.id}
              className="question-block"
              style={
                question.tagColor
                  ? { borderLeft: `4px solid ${question.tagColor}` }
                  : undefined
              }
            >
              <div className="question-text">{question.question}</div>
              <div className="question-meta">
                {question.tagName ? (
                  <span
                    className="question-tag"
                    style={{ color: question.tagColor || "#9B304A" }}
                  >
                    {question.tagName}
                  </span>
                ) : null}
                {question.tagName ? " · " : ""}
                {question.answerType}
              </div>
              {renderQuestionInput(question)}
            </div>
          ))
        )}

        {errorMessage && (
          <div className="od-chart-error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="od-chart-success">{successMessage}</div>
        )}

        <div className="od-chart-actions">
          <button
            type="button"
            className="user-btn-secondary"
            onClick={() => navigate("/od-chart")}
          >
            Back to Chart
          </button>
          <button
            type="button"
            className="user-btn-primary"
            onClick={handleSave}
            disabled={saving || loading || !canEdit}
          >
            {saving ? "Saving..." : "Save Responses"}
          </button>
        </div>
      </div>
    </ODChartShell>
  );
}
