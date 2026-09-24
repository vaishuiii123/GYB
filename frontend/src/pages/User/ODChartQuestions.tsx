import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import AddActionableModal, {
  type AddActionablePreset,
} from "../../components/AddActionableModal";
import ODChartShell from "./ODChartShell";
import {
  clearCachedPageData,
  fetchCategoryQuestions,
  getActiveWorkshopContext,
  getCachedPageData,
  getWorkshopEditStatus,
  getWorkshopModuleAccessStatus,
  setCachedPageData,
} from "../../utils/workshopCache";
import {
  useRegisterUnsavedGuard,
  useUnsavedChanges,
} from "../../utils/unsavedChanges";
import "../../styles/ODChart.css";
import { OD_CHART_NAV_KEY } from "./ODChart";
import type { ODQuestionsNavState, Question } from "./ODChart";
import {
  ClipboardPlus,
  FileText,
  Paperclip,
  Pencil,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import AttachmentPreviewModal, {
  type AttachmentPreviewTarget,
} from "../../components/AttachmentPreviewModal";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  isAllowedAttachmentFile,
  normalizeAttachmentList,
} from "../../utils/attachmentTypes";
const STATUS_OPTIONS = [
  { value: "Red", label: "Red", className: "status-red" },
  { value: "Yellow", label: "Yellow", className: "status-yellow" },
  { value: "Green", label: "Green", className: "status-green" },
];

function normalizeStatusValue(value: string): string {
  const lower = String(value || "")
    .trim()
    .toLowerCase();
  if (lower === "red" || lower === "r") {
    return "Red";
  }
  if (lower === "yellow" || lower === "y" || lower === "amber") {
    return "Yellow";
  }
  if (lower === "green" || lower === "g") {
    return "Green";
  }
  return String(value || "").trim();
}

function statusPresetFor(value: string) {
  const normalized = normalizeStatusValue(value);
  return (
    STATUS_OPTIONS.find((item) => item.value === normalized) ||
    STATUS_OPTIONS.find(
      (item) => item.value.toLowerCase() === String(value || "").trim().toLowerCase()
    ) ||
    null
  );
}
type AttachmentMeta = {
  id: string;
  fileName: string;
  blobPath?: string;
  contentType?: string;
  size?: number;
};

type PendingFile = {
  id: string;
  file: File;
  fileName: string;
  contentType: string;
};

function makeAttachmentId() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function attachmentsForQuestion(
  map: Record<string, AttachmentMeta[]>,
  questionId: string
): AttachmentMeta[] {
  return map[questionId] || [];
}

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
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savedAttachments, setSavedAttachments] = useState<
    Record<string, AttachmentMeta[]>
  >({});
  const [pendingFiles, setPendingFiles] = useState<
    Record<string, PendingFile[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [editMessage, setEditMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [actionableOpen, setActionableOpen] = useState(false);
  const [actionablePreset, setActionablePreset] =
    useState<AddActionablePreset | null>(null);
  const [notesPanelQuestionId, setNotesPanelQuestionId] = useState<string | null>(
    null
  );
  const [notesEditing, setNotesEditing] = useState(false);
  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreviewTarget | null>(null);
  const [noteUpdatedAt, setNoteUpdatedAt] = useState<Record<string, string>>(
    {}
  );
  const answersDirtyRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const loadedLeafIdRef = useRef<string>("");

  const { tryNavigate } = useUnsavedChanges();
  const { participant } = getActiveWorkshopContext();
  const leafId =
    (location.state as ODQuestionsNavState | null)?.leaf?.id ||
    (() => {
      try {
        const stored = sessionStorage.getItem(OD_CHART_NAV_KEY);
        return stored
          ? (JSON.parse(stored) as ODQuestionsNavState)?.leaf?.id
          : "";
      } catch {
        return "";
      }
    })();

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

    const leafChanged = loadedLeafIdRef.current !== state.leaf.id;
    if (leafChanged) {
      answersDirtyRef.current = false;
      setIsDirty(false);
      loadedLeafIdRef.current = state.leaf.id;
      setAnswers({});
      setNotes({});
      setNotesPanelQuestionId(null);
      setNotesEditing(false);
      setNoteUpdatedAt({});
      setPendingFiles({});
      setSavedAttachments({});
      setLoading(true);
    }

    const requestId = ++loadRequestIdRef.current;
    let cancelled = false;

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
      notes?: Record<string, string>;
      attachments?: Record<string, unknown>;
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

      // Never wipe in-progress edits if a late/duplicate fetch finishes.
      if (!answersDirtyRef.current) {
        setAnswers(data.answers || {});
        setNotes(data.notes || {});
        const initialUpdated: Record<string, string> = {};
        Object.entries(data.notes || {}).forEach(([questionId, text]) => {
          if (String(text || "").trim()) {
            initialUpdated[questionId] = new Date().toISOString();
          }
        });
        setNoteUpdatedAt(initialUpdated);
        const nextAttachments: Record<string, AttachmentMeta[]> = {};
        Object.entries(data.attachments || {}).forEach(([questionId, value]) => {
          nextAttachments[questionId] = normalizeAttachmentList(value).map(
            (item) => ({
              id: item.id || item.blobPath || item.fileName,
              fileName: item.fileName,
              blobPath: item.blobPath,
              contentType: item.contentType,
              size: item.size,
            })
          );
        });
        setSavedAttachments(nextAttachments);
        setPendingFiles({});
      }
    };

    const loadPageData = async () => {
      if (!participant.id || !state.workshop.id) {
        if (!cancelled && requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
        return;
      }

      try {
        const editStatus = getWorkshopEditStatus(state.workshop);
        if (!cancelled && requestId === loadRequestIdRef.current) {
          setCanEdit(editStatus.canEdit);
          setEditMessage(editStatus.editMessage);
        }

        const cacheKey = `od-questions:${state.workshop.id}:${state.leaf.id}:${participant.id}`;
        const cached = getCachedPageData<{
          success: boolean;
          message?: string;
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
          attachments?: Record<string, AttachmentMeta[] | AttachmentMeta>;
        }>(cacheKey);

        const activeWorkshop = getActiveWorkshopContext().workshop;
        const templateId = String(
          activeWorkshop?.templateId || state.workshop.templateId || ""
        ).trim();
        const workshopId = String(
          activeWorkshop?.id || state.workshop.id || ""
        ).trim();

        if (!templateId) {
          if (!cancelled && requestId === loadRequestIdRef.current) {
            setQuestions([]);
            setErrorMessage(
              "This workshop does not have a template assigned. Questions cannot be loaded."
            );
            setLoading(false);
          }
          return;
        }

        const requestParams = {
          categoryId: state.leaf.id,
          participantId: participant.id,
          workshopId,
          templateId,
        };

        if (cached?.success && Array.isArray(cached.data)) {
          if (!cancelled && requestId === loadRequestIdRef.current) {
            mapQuestions(cached);
            setLoading(false);
          }

          // Soft revalidate in background (API memory cache keeps this ~ms).
          void fetchCategoryQuestions({
            ...requestParams,
            forceRefresh: true,
          })
            .then((questionsData) => {
              if (
                cancelled ||
                requestId !== loadRequestIdRef.current ||
                !questionsData.success ||
                answersDirtyRef.current
              ) {
                return;
              }
              mapQuestions(questionsData);
              setCachedPageData(cacheKey, questionsData);
            })
            .catch(() => {
              // keep cached page
            });
          return;
        }

        if (!cancelled && requestId === loadRequestIdRef.current) {
          setLoading(true);
        }

        const questionsData = await fetchCategoryQuestions(requestParams);

        if (cancelled || requestId !== loadRequestIdRef.current) {
          return;
        }

        if (questionsData.success) {
          if (!answersDirtyRef.current) {
            mapQuestions(questionsData);
          }
          setCachedPageData(cacheKey, questionsData);
        } else {
          setQuestions([]);
          setErrorMessage(
            questionsData.message ||
              "Unable to load questions for this workshop template."
          );
        }
      } catch (error) {
        console.error(error);
        if (!cancelled && requestId === loadRequestIdRef.current) {
          setErrorMessage("Unable to load questions.");
        }
      } finally {
        if (!cancelled && requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
      }
    };

    loadPageData();

    return () => {
      cancelled = true;
    };
  }, [leafId, navigate, participant.id, location.key]);

  const setAnswer = (questionId: string, value: string) => {
    if (!canEdit) {
      return;
    }

    answersDirtyRef.current = true;
    setIsDirty(true);
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const setNote = (questionId: string, value: string) => {
    if (!canEdit) {
      return;
    }

    answersDirtyRef.current = true;
    setIsDirty(true);
    setNotes((prev) => ({ ...prev, [questionId]: value }));
    setNoteUpdatedAt((prev) => ({
      ...prev,
      [questionId]: new Date().toISOString(),
    }));
  };

  const openNotesPanel = (questionId: string, startEditing = false) => {
    const hasNote = Boolean(String(notes[questionId] || "").trim());
    setNotesPanelQuestionId(questionId);
    setNotesEditing(startEditing || !hasNote);
    if (startEditing || !hasNote) {
      window.setTimeout(() => {
        const el = document.getElementById(
          `od-note-panel-${questionId}`
        ) as HTMLTextAreaElement | null;
        el?.focus();
      }, 0);
    }
  };

  const closeNotesPanel = () => {
    setNotesPanelQuestionId(null);
    setNotesEditing(false);
  };

  const deleteNoteForQuestion = (questionId: string) => {
    if (!canEdit) {
      return;
    }
    answersDirtyRef.current = true;
    setIsDirty(true);
    setNotes((prev) => ({ ...prev, [questionId]: "" }));
    setNoteUpdatedAt((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setNotesEditing(true);
  };

  const clearAttachmentForQuestion = (
    questionId: string,
    attachmentId?: string
  ) => {
    if (!canEdit) {
      return;
    }
    answersDirtyRef.current = true;
    setIsDirty(true);

    if (!attachmentId) {
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setSavedAttachments((prev) => ({
        ...prev,
        [questionId]: [],
      }));
      return;
    }

    setPendingFiles((prev) => {
      const nextList = (prev[questionId] || []).filter(
        (item) => item.id !== attachmentId
      );
      const next = { ...prev };
      if (nextList.length) {
        next[questionId] = nextList;
      } else {
        delete next[questionId];
      }
      return next;
    });
    setSavedAttachments((prev) => {
      const nextList = (prev[questionId] || []).filter(
        (item) => item.id !== attachmentId
      );
      return {
        ...prev,
        [questionId]: nextList,
      };
    });
  };

  const formatNoteTimestamp = (value?: string) => {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFileSize = (size?: number) => {
    const bytes = Number(size) || 0;
    if (bytes <= 0) {
      return "";
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentChange = (
    questionId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canEdit) {
      return;
    }

    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const accepted: PendingFile[] = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 10 MB size limit.`);
        continue;
      }
      if (!isAllowedAttachmentFile(file.name, file.type)) {
        setErrorMessage(
          `"${file.name}" is unsupported. Allowed: images, Word, Excel, and PDF.`
        );
        continue;
      }
      accepted.push({
        id: makeAttachmentId(),
        file,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
    }

    if (!accepted.length) {
      event.target.value = "";
      return;
    }

    answersDirtyRef.current = true;
    setIsDirty(true);
    setPendingFiles((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...accepted],
    }));
    setErrorMessage("");
    event.target.value = "";
  };

  const handleSave = async (): Promise<boolean> => {
    if (!canEdit) {
      setErrorMessage(
        editMessage ||
          "The workshop has ended. You can no longer edit questionnaire answers."
      );
      return false;
    }

    if (!participant.id || !navState) {
      setErrorMessage("Please log in again to save responses.");
      return false;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const uploadedAttachments: Record<string, AttachmentMeta[]> = {
        ...savedAttachments,
      };

      for (const [questionId, pendingList] of Object.entries(pendingFiles)) {
        const merged = [...(uploadedAttachments[questionId] || [])];

        for (const pending of pendingList) {
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
            return false;
          }

          merged.push({
            id: pending.id,
            fileName: uploadResult.data.fileName,
            blobPath: uploadResult.data.blobPath,
            contentType: uploadResult.data.contentType,
            size: uploadResult.data.size,
          });
        }

        uploadedAttachments[questionId] = merged;
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
          notes,
          attachments: uploadedAttachments,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.message || "Failed to save responses.");
        return false;
      }

      setSavedAttachments(uploadedAttachments);
      setPendingFiles({});
      answersDirtyRef.current = false;
      setIsDirty(false);

      if (navState) {
        const cacheKey = `od-questions:${navState.workshop.id}:${navState.leaf.id}:${participant.id}`;
        const existing = getCachedPageData<{
          success?: boolean;
          data?: unknown;
          answers?: Record<string, string>;
          notes?: Record<string, string>;
          attachments?: Record<string, AttachmentMeta[]>;
        }>(cacheKey);
        if (existing?.success) {
          setCachedPageData(cacheKey, {
            ...existing,
            answers,
            notes,
            attachments: uploadedAttachments,
          });
        } else {
          clearCachedPageData(cacheKey);
        }
      }

      setSuccessMessage("Responses saved successfully.");
      return true;
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useRegisterUnsavedGuard(isDirty && canEdit, handleSave);

  const requestBackToChart = () => {
    void tryNavigate("/od-chart");
  };

  const openActionableForQuestion = (question: Question) => {
    if (!navState || !participant?.id) {
      return;
    }
    const noteText = String(notes[question.id] || "").trim();
    setActionablePreset({
      participantId: String(participant.id),
      workshopId: navState.workshop.id,
      organizationId: String(participant.organizationId || ""),
      categoryId: navState.leaf.id,
      categoryName: navState.leaf.name,
      categoryPath: navState.leaf.fullPath || navState.leaf.name,
      initialDescription: noteText || question.question,
    });
    setActionableOpen(true);
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
    const looksLikeTrafficLight =
      options.length > 0 &&
      options.every((option) =>
        ["red", "yellow", "green", "amber", "r", "y", "g"].includes(
          option.toLowerCase()
        )
      );
    const isRating = type.includes("rating") || looksLikeTrafficLight;
    const isText =
      type.includes("text") ||
      (!isMultiple && !isSingle && !isRating && options.length === 0);

    if (isRating) {
      // Rating is always Red / Yellow / Green. Ignore leftover custom options
      // (e.g. A/B/C/D) that are not traffic-light values.
      const ratingOptions = looksLikeTrafficLight
        ? Array.from(
            new Set(options.map((option) => normalizeStatusValue(option)))
          ).filter((option) => statusPresetFor(option))
        : STATUS_OPTIONS.map((option) => option.value);
      const swatches =
        ratingOptions.length > 0
          ? ratingOptions
          : STATUS_OPTIONS.map((option) => option.value);
      const selectedValue = normalizeStatusValue(currentValue);

      return (
        <div className="status-buttons" role="radiogroup" aria-label="Rating">
          {swatches.map((option) => {
            const preset = statusPresetFor(option);
            const value = preset?.value || option;
            const selected = selectedValue === value;
            return (
              <button
                key={value}
                type="button"
                className={`status-btn status-swatch ${preset?.className || ""} ${
                  selected ? "is-selected" : ""
                }`}
                onClick={() => setAnswer(question.id, value)}
                disabled={disabled}
                aria-label={preset?.label || value}
                aria-checked={selected}
                title={preset?.label || value}
                role="radio"
              />
            );
          })}
        </div>
      );
    }

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

    if (
      (isSingle || (options.length > 0 && !isText)) &&
      options.length > 0
    ) {
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

  const getQuestionAttachments = (questionId: string) => {
    const pending = pendingFiles[questionId] || [];
    const saved = attachmentsForQuestion(savedAttachments, questionId);
    const pendingIds = new Set(pending.map((item) => item.id));

    const items: Array<{
      id: string;
      fileName: string;
      size?: number;
      contentType?: string;
      file?: File;
      blobPath?: string;
      pending: boolean;
    }> = [
      ...pending.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        size: item.file.size,
        contentType: item.contentType,
        file: item.file,
        pending: true as const,
      })),
      ...saved
        .filter((item) => !pendingIds.has(item.id))
        .map((item) => ({
          id: item.id,
          fileName: item.fileName,
          size: item.size,
          contentType: item.contentType,
          blobPath: item.blobPath,
          pending: false as const,
        })),
    ];

    return items;
  };

  const attachmentUrlFor = (questionId: string, blobPath?: string) => {
    if (!blobPath || !navState || !participant.id) {
      return "";
    }
    return `/api/get-od-attachment?participantId=${encodeURIComponent(
      String(participant.id)
    )}&workshopId=${encodeURIComponent(
      navState.workshop.id
    )}&questionId=${encodeURIComponent(
      questionId
    )}&blobPath=${encodeURIComponent(blobPath)}`;
  };

  const renderAttachmentPanel = (question: Question) => {
    const items = getQuestionAttachments(question.id);

    return (
      <div className="od-attach-card">
        <div className="od-attach-card-head">
          <span className="od-attach-card-title">
            <Paperclip size={14} strokeWidth={2.2} aria-hidden />
            Attachments
            {items.length > 0 ? ` (${items.length})` : ""}
          </span>
          {canEdit ? (
            <label className="od-attach-upload-btn">
              <input
                id={`od-attach-${question.id}`}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                multiple
                disabled={saving}
                onChange={(event) =>
                  handleAttachmentChange(question.id, event)
                }
              />
              Choose files
            </label>
          ) : null}
        </div>

        {items.length ? (
          <ul className="od-attach-list">
            {items.map((item) => {
              const url = attachmentUrlFor(question.id, item.blobPath);
              return (
                <li key={item.id} className="od-attach-list-item">
                  <span className="od-attach-list-icon" aria-hidden>
                    <FileText size={12} strokeWidth={2} />
                  </span>
                  <span className="od-attach-list-name" title={item.fileName}>
                    {item.fileName}
                  </span>
                  {formatFileSize(item.size) ? (
                    <span className="od-attach-list-size">
                      {formatFileSize(item.size)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="od-notes-file-action"
                    onClick={() =>
                      setAttachmentPreview({
                        url: url || undefined,
                        file: item.file,
                        fileName: item.fileName,
                        contentType: item.contentType || "",
                      })
                    }
                  >
                    Preview
                  </button>
                  {url ? (
                    <a
                      className="od-notes-file-action"
                      href={`${url}&inline=0`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      className="od-notes-file-remove"
                      onClick={() =>
                        clearAttachmentForQuestion(question.id, item.id)
                      }
                      disabled={saving}
                      aria-label={`Remove ${item.fileName}`}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="od-attach-empty">No attachments yet.</p>
        )}

        <p className="od-attach-hint">{ATTACHMENT_HINT}</p>
      </div>
    );
  };

  if (!navState) {
    return null;
  }

  const notesPanelQuestion = notesPanelQuestionId
    ? questions.find((item) => item.id === notesPanelQuestionId) || null
    : null;
  const notesPanelIndex = notesPanelQuestion
    ? questions.findIndex((item) => item.id === notesPanelQuestion.id)
    : -1;
  const notesPanelText = notesPanelQuestion
    ? String(notes[notesPanelQuestion.id] || "")
    : "";
  const notesPanelHasText = Boolean(notesPanelText.trim());

  return (
    <ODChartShell>
      <div
        className={`od-questions-panel ${
          notesPanelQuestion ? "has-notes-drawer" : ""
        }`}
      >
        <div className="od-questions-top is-sticky">
          <h1 className="od-questions-title">{navState.leaf.name}</h1>
          <div className="od-chart-actions od-chart-actions-top">
            <button
              type="button"
              className="user-btn-secondary"
              onClick={requestBackToChart}
              disabled={saving}
            >
              Back to Chart
            </button>
            <button
              type="button"
              className="user-btn-primary"
              onClick={() => {
                void handleSave();
              }}
              disabled={saving || loading || !canEdit}
            >
              {saving ? "Saving..." : "Save Responses"}
            </button>
            <button
              type="button"
              className="user-btn-primary"
              onClick={() => {
                void tryNavigate("/reports");
              }}
              disabled={saving}
            >
              View Response
            </button>
          </div>
        </div>

        {!canEdit && <WorkshopEditBanner message={editMessage} />}

        {loading ? (
          <p className="od-chart-status">Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="od-no-questions">
            No questions are assigned to you for this category in your workshop
            template.
          </p>
        ) : (
          questions.map((question, index) => {
            const noteText = String(notes[question.id] || "").trim();
            const hasNote = Boolean(noteText);
            const isNotesOpen = notesPanelQuestionId === question.id;

            return (
              <div
                key={question.id}
                className={`question-block ${isNotesOpen ? "is-notes-open" : ""}`}
                style={
                  question.tagColor
                    ? { borderLeft: `4px solid ${question.tagColor}` }
                    : undefined
                }
              >
                <div className="question-block-header">
                  <span className="question-number">Q{index + 1}</span>
                  <div className="question-block-heading">
                    <div className="question-text">{question.question}</div>
                    <div className="question-meta">
                      {question.tagName ? (
                        <span className="question-tag">{question.tagName}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {renderQuestionInput(question)}

                {renderAttachmentPanel(question)}

                <div className="question-card-footer">
                  <div className="question-card-actions">
                    <button
                      type="button"
                      className={`user-btn-secondary ${
                        isNotesOpen || hasNote ? "is-active" : ""
                      }`}
                      onClick={() =>
                        isNotesOpen
                          ? closeNotesPanel()
                          : openNotesPanel(question.id, !hasNote)
                      }
                      disabled={saving || loading}
                      aria-expanded={isNotesOpen}
                    >
                      <StickyNote size={14} strokeWidth={2.2} aria-hidden />
                      {hasNote ? "Notes (1)" : "Add Note"}
                    </button>
                    <button
                      type="button"
                      className="user-btn-secondary"
                      onClick={() => openActionableForQuestion(question)}
                      disabled={saving || loading || !canEdit}
                    >
                      <ClipboardPlus size={14} strokeWidth={2.2} aria-hidden />
                      Add as Actionable
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {errorMessage && <div className="od-chart-error">{errorMessage}</div>}

        {successMessage && (
          <div className="od-chart-success">{successMessage}</div>
        )}
      </div>

      {notesPanelQuestion ? (
        <>
          <button
            type="button"
            className="od-notes-backdrop"
            aria-label="Close notes panel"
            onClick={closeNotesPanel}
          />
          <aside
            className="od-notes-drawer"
            aria-label="Notes for this question"
          >
            <div className="od-notes-drawer-header">
              <div className="od-notes-ref">
                <span className="question-number">
                  Q{notesPanelIndex >= 0 ? notesPanelIndex + 1 : ""}
                </span>
                <p>{notesPanelQuestion.question}</p>
              </div>
              <button
                type="button"
                className="od-notes-close"
                onClick={closeNotesPanel}
                aria-label="Close notes"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="od-notes-body">
              <div className="od-notes-section-title">Your notes</div>
              {notesEditing ? (
                <textarea
                  id={`od-note-panel-${notesPanelQuestion.id}`}
                  className="od-notes-textarea"
                  value={notesPanelText}
                  onChange={(event) =>
                    setNote(notesPanelQuestion.id, event.target.value)
                  }
                  placeholder="Add notes for this question..."
                  rows={8}
                  disabled={!canEdit || saving}
                />
              ) : notesPanelHasText ? (
                <div className="od-notes-readonly">
                  <p>{notesPanelText}</p>
                </div>
              ) : (
                <p className="od-notes-empty">No notes added yet.</p>
              )}

              {noteUpdatedAt[notesPanelQuestion.id] ? (
                <p className="od-notes-updated">
                  Last updated:{" "}
                  {formatNoteTimestamp(noteUpdatedAt[notesPanelQuestion.id])}
                </p>
              ) : null}
            </div>

            <div className="od-notes-drawer-footer">
              <button
                type="button"
                className="user-btn-secondary od-notes-delete"
                onClick={() => deleteNoteForQuestion(notesPanelQuestion.id)}
                disabled={!canEdit || saving || !notesPanelHasText}
              >
                <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                Delete Note
              </button>
              {notesEditing ? (
                <button
                  type="button"
                  className="user-btn-primary"
                  onClick={() => setNotesEditing(false)}
                  disabled={saving}
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  className="user-btn-primary"
                  onClick={() => openNotesPanel(notesPanelQuestion.id, true)}
                  disabled={!canEdit || saving}
                >
                  <Pencil size={14} strokeWidth={2.2} aria-hidden />
                  Edit Note
                </button>
              )}
            </div>
          </aside>
        </>
      ) : null}

      <AddActionableModal
        open={actionableOpen}
        preset={actionablePreset}
        canEdit={canEdit}
        onClose={() => {
          setActionableOpen(false);
          setActionablePreset(null);
        }}
      />
      <AttachmentPreviewModal
        target={attachmentPreview}
        onClose={() => setAttachmentPreview(null)}
      />
    </ODChartShell>
  );
}
