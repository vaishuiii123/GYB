import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { markReportsReturnFromQuestions } from "../../utils/reportsReturn";
import {
  AlertTriangle,
  Eye,
  FileText,
  Handshake,
  Lightbulb,
  MoreVertical,
  Plus,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AttachmentPreviewModal, {
  type AttachmentPreviewTarget,
} from "../../components/AttachmentPreviewModal";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  isAllowedAttachmentFile,
  normalizeAttachmentList,
} from "../../utils/attachmentTypes";

const QUESTIONS_PER_PAGE = 5;

const STATUS_OPTIONS = [
  { value: "Red", label: "Red", className: "status-red" },
  { value: "Yellow", label: "Yellow", className: "status-yellow" },
  { value: "Green", label: "Green", className: "status-green" },
];

type NoteEntry = {
  id: string;
  text: string;
  theme: number;
  author: string;
  createdAt: string;
};

const NOTE_ICONS: LucideIcon[] = [
  Lightbulb,
  Target,
  Users,
  AlertTriangle,
  Handshake,
];

function participantDisplayName(participant: {
  firstName?: string;
  First_Name?: string;
  lastName?: string;
  Last_Name?: string;
}) {
  const first = String(
    participant.firstName || participant.First_Name || ""
  ).trim();
  if (first) {
    return first;
  }
  const last = String(
    participant.lastName || participant.Last_Name || ""
  ).trim();
  return last || "You";
}

function parseNoteEntries(raw: string, author: string): NoteEntry[] {
  const text = String(raw || "").trim();
  if (!text) {
    return [];
  }
  return text
    .split(/\n{2,}/)
    .map((part, index) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({
      id: `note-${index}-${part.slice(0, 24)}`,
      text: part,
      theme: index % NOTE_ICONS.length,
      author,
      createdAt: new Date().toISOString(),
    }));
}

function serializeNoteEntries(entries: NoteEntry[]): string {
  return entries
    .map((entry) => entry.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function newNoteId() {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function formatResponseText(value: string) {
  const parts = String(value || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
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
  const [noteLists, setNoteLists] = useState<Record<string, NoteEntry[]>>({});
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
  const [responseQuestionId, setResponseQuestionId] = useState<string | null>(
    null
  );
  const [noteComposerQuestionId, setNoteComposerQuestionId] = useState<
    string | null
  >(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteMenuId, setNoteMenuId] = useState<string | null>(null);
  const [noteMenuQuestionId, setNoteMenuQuestionId] = useState<string | null>(
    null
  );
  const [noteMenuPos, setNoteMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const noteMenuRef = useRef<HTMLDivElement | null>(null);
  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreviewTarget | null>(null);
  const [page, setPage] = useState(0);
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
      setNoteLists({});
      setNoteComposerQuestionId(null);
      setNoteDraft("");
      setEditingNoteId(null);
      setNoteMenuId(null);
      setNoteMenuQuestionId(null);
      setNoteMenuPos(null);
      setPendingFiles({});
      setSavedAttachments({});
      setPage(0);
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
        const author = participantDisplayName(participant || {});
        const loadedNotes = data.notes || {};
        setNotes(loadedNotes);
        const nextLists: Record<string, NoteEntry[]> = {};
        Object.entries(loadedNotes).forEach(([questionId, text]) => {
          nextLists[questionId] = parseNoteEntries(String(text || ""), author);
        });
        setNoteLists(nextLists);
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

  const syncNotesFromList = (
    questionId: string,
    entries: NoteEntry[],
    lists: Record<string, NoteEntry[]>
  ) => {
    const nextLists = { ...lists, [questionId]: entries };
    setNoteLists(nextLists);
    setNotes((prev) => ({
      ...prev,
      [questionId]: serializeNoteEntries(entries),
    }));
  };

  const closeNoteMenu = () => {
    setNoteMenuId(null);
    setNoteMenuQuestionId(null);
    setNoteMenuPos(null);
  };

  useEffect(() => {
    if (!noteMenuId) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (noteMenuRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest(".qr-note-menu-btn")) {
        return;
      }
      closeNoteMenu();
    };

    const onViewportChange = () => {
      closeNoteMenu();
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [noteMenuId]);

  const openNoteComposer = (questionId: string, note?: NoteEntry) => {
    if (!canEdit) {
      return;
    }
    setNoteComposerQuestionId(questionId);
    setEditingNoteId(note?.id || null);
    setNoteDraft(note?.text || "");
    closeNoteMenu();
    window.setTimeout(() => {
      document.getElementById(`od-note-composer-${questionId}`)?.focus();
    }, 0);
  };

  const closeNoteComposer = () => {
    setNoteComposerQuestionId(null);
    setEditingNoteId(null);
    setNoteDraft("");
  };

  const submitNoteForQuestion = (questionId: string) => {
    if (!canEdit) {
      return;
    }
    const text = noteDraft.trim();
    if (!text) {
      return;
    }

    const author = participantDisplayName(participant || {});
    const existing = noteLists[questionId] || [];
    let nextEntries: NoteEntry[];

    if (editingNoteId) {
      nextEntries = existing.map((entry) =>
        entry.id === editingNoteId ? { ...entry, text } : entry
      );
    } else {
      nextEntries = [
        ...existing,
        {
          id: newNoteId(),
          text,
          theme: existing.length % NOTE_ICONS.length,
          author,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    answersDirtyRef.current = true;
    setIsDirty(true);
    syncNotesFromList(questionId, nextEntries, noteLists);
    closeNoteComposer();
  };

  const deleteNoteEntry = (questionId: string, noteId: string) => {
    if (!canEdit) {
      return;
    }
    const nextEntries = (noteLists[questionId] || []).filter(
      (entry) => entry.id !== noteId
    );
    answersDirtyRef.current = true;
    setIsDirty(true);
    syncNotesFromList(questionId, nextEntries, noteLists);
    closeNoteMenu();
    if (editingNoteId === noteId) {
      closeNoteComposer();
    }
  };

  const renderNotesPanel = (question: Question) => {
    const entries = noteLists[question.id] || [];
    const composing = noteComposerQuestionId === question.id;
    const count = entries.length;

    return (
      <div className="qr-notes-panel">
        <div className="qr-notes-head">
          <span className="qr-notes-title">
            <FileText size={14} strokeWidth={2.2} aria-hidden />
            Notes ({count})
          </span>
          {canEdit && !composing ? (
            <button
              type="button"
              className="qr-notes-add"
              onClick={() => openNoteComposer(question.id)}
              disabled={saving || loading}
            >
              <Plus size={14} strokeWidth={2.4} aria-hidden />
              Add Note
            </button>
          ) : null}
        </div>

        {composing ? (
          <div className="qr-note-composer">
            <textarea
              id={`od-note-composer-${question.id}`}
              className="qr-note-composer-input"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Write your note..."
              rows={3}
              disabled={saving}
            />
            <div className="qr-note-composer-actions">
              <button
                type="button"
                className="user-btn-secondary"
                onClick={closeNoteComposer}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="user-btn-primary"
                onClick={() => submitNoteForQuestion(question.id)}
                disabled={saving || !noteDraft.trim()}
              >
                Submit Note
              </button>
            </div>
          </div>
        ) : null}

        {!composing && count === 0 ? (
          <div className="qr-notes-empty">
            <FileText size={28} strokeWidth={1.6} aria-hidden />
            <p>No notes yet. Add a note to capture your thoughts.</p>
          </div>
        ) : null}

        {count > 0 ? (
          <ul className="qr-note-list">
            {entries.map((entry) => {
              const Icon = NOTE_ICONS[entry.theme % NOTE_ICONS.length];
              const menuOpen = noteMenuId === entry.id;
              return (
                <li
                  key={entry.id}
                  className={`qr-note-card theme-${entry.theme % NOTE_ICONS.length}`}
                >
                  <span className="qr-note-icon" aria-hidden>
                    <Icon size={16} strokeWidth={2.2} />
                  </span>
                  <div className="qr-note-body">
                    <p className="qr-note-text">{entry.text}</p>
                    <span className="qr-note-author">- {entry.author}</span>
                  </div>
                  {canEdit ? (
                    <div className="qr-note-menu-wrap">
                      <button
                        type="button"
                        className="qr-note-menu-btn"
                        aria-label="Note options"
                        aria-expanded={menuOpen}
                        onClick={(event) => {
                          if (menuOpen) {
                            closeNoteMenu();
                            return;
                          }
                          const rect =
                            event.currentTarget.getBoundingClientRect();
                          const menuWidth = 128;
                          const menuHeight = 84;
                          const gap = 6;
                          const left = Math.max(
                            8,
                            Math.min(
                              rect.right - menuWidth,
                              window.innerWidth - menuWidth - 8
                            )
                          );
                          const openBelow =
                            rect.bottom + gap + menuHeight <=
                            window.innerHeight - 8;
                          const top = openBelow
                            ? rect.bottom + gap
                            : Math.max(8, rect.top - menuHeight - gap);
                          setNoteMenuId(entry.id);
                          setNoteMenuQuestionId(question.id);
                          setNoteMenuPos({ top, left });
                        }}
                        disabled={saving}
                      >
                        <MoreVertical size={16} strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
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
        rows={3}
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
        {canEdit ? (
          <div className="od-attach-card-head">
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
          </div>
        ) : null}

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
          <p className="od-attach-empty">
            No attachments yet. {ATTACHMENT_HINT}
          </p>
        )}

        {items.length > 0 ? (
          <p className="od-attach-hint">{ATTACHMENT_HINT}</p>
        ) : null}
      </div>
    );
  };

  const totalPages = Math.max(
    1,
    Math.ceil(questions.length / QUESTIONS_PER_PAGE)
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageQuestions = useMemo(() => {
    const start = safePage * QUESTIONS_PER_PAGE;
    return questions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [questions, safePage]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  if (!navState) {
    return null;
  }

  const responseQuestion = responseQuestionId
    ? questions.find((item) => item.id === responseQuestionId) || null
    : null;
  const responseQuestionIndex = responseQuestion
    ? questions.findIndex((item) => item.id === responseQuestion.id)
    : -1;

  return (
    <ODChartShell>
      <div className="od-questions-panel">
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
              className="user-btn-secondary"
              onClick={() => {
                markReportsReturnFromQuestions();
                void tryNavigate("/reports", {
                  state: {
                    view: "questions",
                    returnTo: "question",
                  },
                });
              }}
              disabled={saving || loading}
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
          <>
          <div className="od-questions-list">
            {pageQuestions.map((question, index) => {
              const questionNumber = safePage * QUESTIONS_PER_PAGE + index + 1;
              return (
                <div
                  key={question.id}
                  id={`od-question-${question.id}`}
                  className="question-block"
                  style={{
                    borderLeft: `3px solid ${question.tagColor || "#9b304a"}`,
                  }}
                >
                  <div className="qr-col qr-question">
                    <span className="qr-label">Question</span>
                    <div className="question-block-header">
                      <span className="question-number">Q{questionNumber}</span>
                      <div className="question-block-heading">
                        <div className="question-text">{question.question}</div>
                        <div className="question-meta">
                          {question.tagName ? (
                            <span className="question-tag">{question.tagName}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="qr-col qr-response">
                    <span className="qr-label">Response</span>
                    {renderQuestionInput(question)}
                  </div>

                  <div className="qr-col qr-notes">
                    {renderNotesPanel(question)}
                  </div>

                  <div className="qr-col qr-attachments">
                    <span className="qr-label">Attachments</span>
                    {renderAttachmentPanel(question)}
                  </div>

                  <div className="qr-col qr-actions">
                    <span className="qr-label">Actions</span>
                    <div className="question-card-actions">
                      <button
                        type="button"
                        className="user-btn-secondary qr-action-btn"
                        onClick={() => setResponseQuestionId(question.id)}
                        disabled={saving || loading}
                      >
                        <Eye size={14} strokeWidth={2.2} aria-hidden />
                        View Response
                      </button>
                      <button
                        type="button"
                        className="user-btn-secondary qr-action-btn"
                        onClick={() => openActionableForQuestion(question)}
                        disabled={saving || loading || !canEdit}
                      >
                        <Plus size={14} strokeWidth={2.2} aria-hidden />
                        Add as Actionable
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {questions.length > QUESTIONS_PER_PAGE ? (
            <div className="od-questions-pagination">
              <button
                type="button"
                className="user-btn-secondary"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={safePage === 0 || saving}
              >
                Previous
              </button>
              <span className="od-questions-page-indicator">
                Page {safePage + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="user-btn-secondary"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
                disabled={safePage >= totalPages - 1 || saving}
              >
                Next
              </button>
            </div>
          ) : null}
          </>
        )}

        {errorMessage && <div className="od-chart-error">{errorMessage}</div>}

        {successMessage && (
          <div className="od-chart-success">{successMessage}</div>
        )}
      </div>

      {responseQuestion ? (
        <div className="od-response-modal" role="dialog" aria-modal="true" aria-labelledby="od-response-title">
          <button
            type="button"
            className="od-response-backdrop"
            aria-label="Back to question"
            onClick={() => setResponseQuestionId(null)}
          />
          <div className="od-response-card">
            <div className="od-response-header">
              <h2 id="od-response-title">
                Q{responseQuestionIndex >= 0 ? responseQuestionIndex + 1 : ""} Response
              </h2>
              <button
                type="button"
                className="od-notes-close"
                onClick={() => setResponseQuestionId(null)}
                aria-label="Close response"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="od-response-body">
              <section>
                <h3>Question</h3>
                <p>{responseQuestion.question}</p>
              </section>
              <section>
                <h3>Responses</h3>
                <p>
                  {formatResponseText(answers[responseQuestion.id] || "") ||
                    "No response yet."}
                </p>
              </section>
              <section>
                <h3>Notes</h3>
                <p>
                  {String(notes[responseQuestion.id] || "").trim() ||
                    "No notes yet."}
                </p>
              </section>
              <section>
                <h3>Attachments</h3>
                {getQuestionAttachments(responseQuestion.id).length === 0 ? (
                  <p>No attachments yet.</p>
                ) : (
                  <ul>
                    {getQuestionAttachments(responseQuestion.id).map((item) => (
                      <li key={item.id}>{item.fileName}</li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="od-response-footer">
              <button
                type="button"
                className="user-btn-secondary"
                onClick={() => {
                  const targetId = responseQuestion.id;
                  setResponseQuestionId(null);
                  window.requestAnimationFrame(() => {
                    document
                      .getElementById(`od-question-${targetId}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
              >
                Back to question
              </button>
              <button
                type="button"
                className="user-btn-secondary"
                onClick={() => {
                  setResponseQuestionId(null);
                  markReportsReturnFromQuestions();
                  void tryNavigate("/reports", {
                    state: {
                      view: "questions",
                      question: responseQuestion.question,
                      returnTo: "question",
                    },
                  });
                }}
              >
                Open in Reports
              </button>
              <button
                type="button"
                className="user-btn-primary"
                onClick={() => {
                  setResponseQuestionId(null);
                  requestBackToChart();
                }}
              >
                Back to Unlock Value
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {noteMenuId &&
      noteMenuQuestionId &&
      noteMenuPos &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              ref={noteMenuRef}
              className="qr-note-menu is-portal"
              role="menu"
              style={{ top: noteMenuPos.top, left: noteMenuPos.left }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const note = (noteLists[noteMenuQuestionId] || []).find(
                    (entry) => entry.id === noteMenuId
                  );
                  if (note) {
                    openNoteComposer(noteMenuQuestionId, note);
                  } else {
                    closeNoteMenu();
                  }
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() =>
                  deleteNoteEntry(noteMenuQuestionId, noteMenuId)
                }
              >
                Delete
              </button>
            </div>,
            document.body
          )
        : null}

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
