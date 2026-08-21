import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import ODChartShell from "./ODChartShell";
import {
  clearCachedPageData,
  getActiveWorkshopContext,
  getCachedPageData,
  getWorkshopEditStatus,
  getWorkshopModuleAccessStatus,
  setCachedPageData,
} from "../../utils/workshopCache";
import "../../styles/ODChart.css";
import { OD_CHART_NAV_KEY } from "./ODChart";
import type { ODQuestionsNavState, Question } from "./ODChart";

const STATUS_OPTIONS = [
  { value: "Red", label: "Red", className: "status-red" },
  { value: "Yellow", label: "Yellow", className: "status-yellow" },
  { value: "Green", label: "Green", className: "status-green" },
];

const ATTACHMENT_ACCEPT =
  ".xlsx,.xls,.csv,.doc,.docx,.pdf,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.bmp";

type AttachmentMeta = {
  fileName: string;
  blobPath?: string;
  contentType?: string;
  size?: number;
};

type PendingFile = {
  file: File;
  fileName: string;
  contentType: string;
};

function loadNavState(
  location: ReturnType<typeof useLocation>
): ODQuestionsNavState | null {
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export default function ODChartQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navState, setNavState] = useState<ODQuestionsNavState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAttachments, setSavedAttachments] = useState<
    Record<string, AttachmentMeta>
  >({});
  const [pendingFiles, setPendingFiles] = useState<
    Record<string, PendingFile>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [editMessage, setEditMessage] = useState("");

  const { participant } = getActiveWorkshopContext();

  useEffect(() => {
    const { workshop } = getActiveWorkshopContext();
    if (!getWorkshopModuleAccessStatus(workshop).enabled) {
      navigate("/userdashboard", { replace: true });
      return;
    }

    const state = loadNavState(location);
    if (!state) {
      navigate("/od-chart", { replace: true });
      return;
    }
    setNavState(state);

    const mapQuestions = (data: {
      data?: Array<{
        questionId: string;
        questionText: string;
        questionType: string;
        tagId?: string;
        tagName?: string;
        tagColor?: string;
        attachmentsApplicable?: string;
        options: { optionText: string }[] | string[];
      }>;
      answers?: Record<string, string>;
      attachments?: Record<string, AttachmentMeta>;
    }) => {
      setQuestions(
        (data.data || []).map((item) => ({
          id: item.questionId,
          question: item.questionText,
          answerType: item.questionType,
          tagId: item.tagId,
          tagName: item.tagName,
          tagColor: item.tagColor,
          attachmentsApplicable:
            String(item.attachmentsApplicable || "N").toUpperCase() === "Y"
              ? "Y"
              : "N",
          options: (item.options || []).map((option) =>
            typeof option === "string" ? option : option.optionText
          ),
        }))
      );
      setAnswers(data.answers || {});
      setSavedAttachments(data.attachments || {});
      setPendingFiles({});
    };

    const loadPageData = async () => {
      if (!participant.id || !state.workshop.id) {
        setLoading(false);
        return;
      }

      try {
        const editStatus = getWorkshopEditStatus(state.workshop);
        setCanEdit(editStatus.canEdit);
        setEditMessage(editStatus.editMessage);

        const cacheKey = `od-questions:${state.workshop.id}:${state.leaf.id}:${participant.id}`;
        const cached = getCachedPageData<{
          success: boolean;
          data?: Array<{
            questionId: string;
            questionText: string;
            questionType: string;
            tagId?: string;
            tagName?: string;
            tagColor?: string;
            attachmentsApplicable?: string;
            options: { optionText: string }[] | string[];
          }>;
          answers?: Record<string, string>;
          attachments?: Record<string, AttachmentMeta>;
        }>(cacheKey);

        if (cached?.success) {
          mapQuestions(cached);
          setLoading(false);
        }

        const activeWorkshop = getActiveWorkshopContext().workshop;
        const templateId =
          String(activeWorkshop?.templateId || state.workshop.templateId || "").trim();
        const workshopId =
          String(activeWorkshop?.id || state.workshop.id || "").trim();

        const query = new URLSearchParams({
          categoryId: state.leaf.id,
          participantId: participant.id,
          workshopId,
          templateId,
        });

        const questionsRes = await fetch(
          `/api/get-category-questions?${query.toString()}`
        );
        const questionsData = await questionsRes.json();

        if (questionsData.success) {
          mapQuestions(questionsData);
          setCachedPageData(cacheKey, questionsData);
        } else {
          setErrorMessage(
            questionsData.message ||
              "Unable to load questions for this workshop template."
          );
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

  const handleAttachmentChange = (
    questionId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canEdit) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Attachment exceeds the 10 MB size limit.");
      event.target.value = "";
      return;
    }

    setPendingFiles((prev) => ({
      ...prev,
      [questionId]: {
        file,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      },
    }));
    setErrorMessage("");
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

      const uploadedAttachments: Record<string, AttachmentMeta> = {
        ...savedAttachments,
      };

      for (const [questionId, pending] of Object.entries(pendingFiles)) {
        const base64 = await fileToBase64(pending.file);
        const uploadResponse = await fetch("/api/upload-od-attachment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: participant.id,
            workshopId: navState.workshop.id,
            organizationId: participant.organizationId || "",
            questionId,
            fileName: pending.fileName,
            contentType: pending.contentType,
            base64,
          }),
        });
        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadResult.success) {
          setErrorMessage(
            uploadResult.message ||
              `Failed to upload attachment for question ${questionId}.`
          );
          return;
        }

        uploadedAttachments[questionId] = {
          fileName: uploadResult.data.fileName,
          blobPath: uploadResult.data.blobPath,
          contentType: uploadResult.data.contentType,
          size: uploadResult.data.size,
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
          participantName: [
            participant.firstName || participant.First_Name || "",
            participant.lastName || participant.Last_Name || "",
          ]
            .map((part) => String(part).trim())
            .filter(Boolean)
            .join(" "),
          answers,
          attachments: uploadedAttachments,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.message || "Failed to save responses.");
        return;
      }

      setSavedAttachments(uploadedAttachments);
      setPendingFiles({});

      if (navState) {
        clearCachedPageData(
          `od-questions:${navState.workshop.id}:${navState.leaf.id}:${participant.id}`
        );
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
    const type = String(question.answerType || "Text").trim().toLowerCase();
    const disabled = !canEdit;
    const options = (question.options || [])
      .map((option) => String(option || "").trim())
      .filter(Boolean);

    const isMultiple = type.includes("multiple");
    const isSingle = type.includes("single");
    const isRating = type.includes("rating");
    const isText = type.includes("text") || (!isMultiple && !isSingle && !isRating && options.length === 0);

    if (isMultiple && options.length > 0) {
      const selected = currentValue
        ? currentValue
            .split("|")
            .map((part) => part.trim())
            .filter(Boolean)
        : [];

      return (
        <div className="option-buttons option-buttons-multi" role="group">
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={`option-btn ${checked ? "selected" : ""}`}
                onClick={() => {
                  const next = checked
                    ? selected.filter((item) => item !== option)
                    : [...selected, option];
                  setAnswer(question.id, next.join(" | "));
                }}
                disabled={disabled}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    if ((isSingle || (options.length > 0 && !isText && !isRating)) && options.length > 0) {
      return (
        <div className="option-buttons" role="radiogroup">
          {options.map((option) => (
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

    if (isRating) {
      const ratingOptions =
        options.length > 0
          ? options
          : STATUS_OPTIONS.map((option) => option.value);

      return (
        <div className="status-buttons" role="radiogroup">
          {ratingOptions.map((option) => {
            const preset = STATUS_OPTIONS.find(
              (item) => item.value.toLowerCase() === option.toLowerCase()
            );
            return (
              <button
                key={option}
                type="button"
                className={`status-btn ${preset?.className || ""} ${
                  currentValue === option ? "selected" : ""
                }`}
                onClick={() => setAnswer(question.id, option)}
                disabled={disabled}
              >
                {preset?.label || option}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <textarea
        value={currentValue}
        onChange={(event) => setAnswer(question.id, event.target.value)}
        placeholder="Enter your response"
        rows={4}
        disabled={disabled}
      />
    );
  };

  const renderAttachmentInput = (question: Question) => {
    if (question.attachmentsApplicable !== "Y") {
      return null;
    }

    const pending = pendingFiles[question.id];
    const saved = savedAttachments[question.id];
    const displayName = pending?.fileName || saved?.fileName || "";

    return (
      <div className="question-attachment">
        <label className="question-attachment-label">Attachment</label>
        <input
          type="file"
          accept={ATTACHMENT_ACCEPT}
          disabled={!canEdit || saving}
          onChange={(event) => handleAttachmentChange(question.id, event)}
        />
        <p className="question-attachment-hint">
          Excel, Word, PowerPoint, PDF, text, or images (max 10 MB)
        </p>
        {displayName ? (
          <div className="question-attachment-file">
            <span>{displayName}</span>
            {saved?.blobPath && !pending && navState && participant.id ? (
              <a
                className="question-attachment-link"
                href={`/api/get-od-attachment?participantId=${encodeURIComponent(
                  participant.id
                )}&workshopId=${encodeURIComponent(
                  navState.workshop.id
                )}&questionId=${encodeURIComponent(question.id)}`}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  if (!navState) {
    return null;
  }

  return (
    <ODChartShell backLabel="Back to Chart" backPath="/od-chart">
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
                <span className="question-type-badge">
                  {question.answerType || "Text"}
                </span>
                {question.tagName ? (
                  <span
                    className="question-tag"
                    style={{ color: question.tagColor || "#9B304A" }}
                  >
                    {question.tagName}
                  </span>
                ) : null}
              </div>
              {renderQuestionInput(question)}
              {renderAttachmentInput(question)}
            </div>
          ))
        )}

        {errorMessage && <div className="od-chart-error">{errorMessage}</div>}

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
