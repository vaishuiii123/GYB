import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import AttachmentPreviewModal, {
  type AttachmentPreviewTarget,
} from "../../components/AttachmentPreviewModal";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import {
  clearCachedPageData,
  getCachedPageData,
  getPreOdAccessStatus,
  setCachedPageData,
} from "../../utils/workshopCache";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  isAllowedAttachmentFile,
  normalizeAttachmentList,
} from "../../utils/attachmentTypes";
import { useRegisterUnsavedGuard } from "../../utils/unsavedChanges";
import {
  ClipboardList,
  Eye,
  FileText,
  Trash2,
} from "lucide-react";
import "../../styles/UserButtons.css";
import "../../styles/PreODForm.css";

type AttachmentMeta = {
  id?: string;
  fileName: string;
  blobPath: string;
  contentType?: string;
  size?: number;
};

type PendingAttachment = {
  id: string;
  file: File;
  fileName: string;
  contentType: string;
};

type PreOdQuestion = {
  srNo: number;
  category: string;
  question: string;
  section: "A" | "B";
  attachmentsApplicable?: "Y" | "N";
};

type PreOdFormData = {
  workshop: {
    id: string;
    workshopName: string;
    organizationName: string;
  };
  available: boolean;
  canFill: boolean;
  message: string;
  questions: PreOdQuestion[];
  answers: Record<string, string>;
  attachments?: Record<string, AttachmentMeta[] | AttachmentMeta>;
  submittedDate?: string;
};

function normalizeAttachmentsMap(
  value: Record<string, AttachmentMeta[] | AttachmentMeta> | undefined
): Record<string, AttachmentMeta[]> {
  const result: Record<string, AttachmentMeta[]> = {};
  if (!value || typeof value !== "object") {
    return result;
  }

  for (const [key, entry] of Object.entries(value)) {
    const list = normalizeAttachmentList(entry)
      .filter((item) => item.blobPath)
      .map((item) => ({
        id: String(item.id || item.blobPath || item.fileName),
        fileName: item.fileName,
        blobPath: String(item.blobPath),
        contentType: item.contentType,
        size: item.size,
      }));
    if (list.length > 0) {
      result[key] = list;
    }
  }

  return result;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("Unable to read attachment file."));
    reader.readAsDataURL(file);
  });
}

async function readApiJson(
  response: Response,
  fallbackMessage: string
): Promise<any> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(
      `${fallbackMessage} (empty response${
        response.status ? `, status ${response.status}` : ""
      }). Check that the API is running.`
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `${fallbackMessage} (invalid JSON${
        response.status ? `, status ${response.status}` : ""
      }).`
    );
  }
}

export default function PreODForm() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const selectedWorkshop = getSelectedWorkshop();
  const participantId = String(participant?.id || "").trim();
  const organizationId = String(participant?.organizationId || "").trim();
  const workshopId = String(selectedWorkshop?.id || "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PreOdFormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAttachments, setSavedAttachments] = useState<
    Record<string, AttachmentMeta[]>
  >({});
  const [pendingFiles, setPendingFiles] = useState<
    Record<string, PendingAttachment[]>
  >({});
  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreviewTarget | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const requestIdRef = useRef(0);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);

  const canFill = formData?.canFill ?? false;

  const markDirty = () => {
    if (!canFill) {
      return;
    }
    setIsDirty(true);
  };

  const groupedQuestions = useMemo(() => {
    const groups = new Map<string, PreOdQuestion[]>();

    for (const question of formData?.questions || []) {
      if (!groups.has(question.category)) {
        groups.set(question.category, []);
      }
      groups.get(question.category)?.push(question);
    }

    return Array.from(groups.entries()).map(([category, items]) => [
      category,
      [...items].sort((a, b) => Number(a.srNo) - Number(b.srNo)),
    ]) as Array<[string, PreOdQuestion[]]>;
  }, [formData?.questions]);

  const displayQuestions = useMemo(() => {
    let displayNo = 0;
    return groupedQuestions.map(([category, items]) => ({
      category,
      items: items.map((item) => {
        displayNo += 1;
        return { ...item, displayNo };
      }),
    }));
  }, [groupedQuestions]);

  const flatQuestions = useMemo(() => {
    return displayQuestions.flatMap(({ category, items }) =>
      items.map((item) => ({ ...item, category }))
    );
  }, [displayQuestions]);

  const totalPages = Math.ceil(flatQuestions.length / PAGE_SIZE) || 1;
  const pageQuestions = flatQuestions.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );
  const isLastPage = page >= totalPages - 1;

  useEffect(() => {
    const workshop = getSelectedWorkshop();

    if (!getPreOdAccessStatus(workshop).enabled) {
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

    const cacheKey = `pre-od:${participantId}:${workshopId}`;
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const loadForm = async () => {
      try {
        const cached = getCachedPageData<PreOdFormData>(cacheKey);

        if (cached && requestId === requestIdRef.current) {
          setFormData(cached);
          setAnswers(cached.answers || {});
          setSavedAttachments(normalizeAttachmentsMap(cached.attachments));
          setLoading(false);
        } else if (!cached) {
          setLoading(true);
        }

        const params = new URLSearchParams({
          participantId,
          workshopId,
        });

        if (organizationId) {
          params.set("organizationId", organizationId);
        }

        const response = await fetch(
          `/api/get-workshop-pre-od?${params.toString()}`
        );
        const data = await readApiJson(
          response,
          "Unable to load the questionnaire."
        );

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok || !data.success) {
          if (!cached) {
            setErrorMessage(data.message || "Unable to load the questionnaire.");
          }
          return;
        }

        const normalizedAttachments = normalizeAttachmentsMap(data.attachments);
        setFormData({ ...data, attachments: normalizedAttachments });
        setAnswers(data.answers || {});
        setSavedAttachments(normalizedAttachments);
        setCachedPageData(cacheKey, {
          ...data,
          attachments: normalizedAttachments,
        });
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        if (!cancelled && requestId === requestIdRef.current) {
          setErrorMessage("Unable to load the questionnaire.");
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    loadForm();

    return () => {
      cancelled = true;
    };
  }, [navigate, participantId, organizationId, workshopId]);

  const handleAnswerChange = (srNo: number, value: string) => {
    markDirty();
    setAnswers((current) => ({
      ...current,
      [String(srNo)]: value,
    }));
  };

  const handleAttachmentChange = (
    srNo: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const key = String(srNo);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const accepted: PendingAttachment[] = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Attachment exceeds the 10 MB size limit.");
        return;
      }
      if (!isAllowedAttachmentFile(file.name, file.type)) {
        setErrorMessage(
          "Unsupported file type. Allowed: images, Word, Excel, and PDF."
        );
        return;
      }
      accepted.push({
        id: `pending-${key}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        file,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
    }

    markDirty();
    setPendingFiles((current) => ({
      ...current,
      [key]: [...(current[key] || []), ...accepted],
    }));
    setErrorMessage("");
  };

  const saveAnswers = async (isDraft: boolean) => {
    if (!canFill || !formData?.workshop?.id || !participantId) {
      return;
    }

    const uploadedAttachments: Record<string, AttachmentMeta[]> = {
      ...savedAttachments,
    };

    for (const [questionSrNo, pendingList] of Object.entries(pendingFiles)) {
      const merged = [...(uploadedAttachments[questionSrNo] || [])];

      for (const pending of pendingList) {
        const base64 = await fileToBase64(pending.file);
        const uploadResponse = await fetch("/api/upload-pre-od-attachment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId,
            workshopId: formData.workshop.id,
            organizationId,
            questionSrNo,
            fileName: pending.fileName,
            contentType: pending.contentType,
            base64,
          }),
        });
        const uploadResult = await readApiJson(
          uploadResponse,
          `Failed to upload attachment for question ${questionSrNo}.`
        );

        if (!uploadResponse.ok || !uploadResult.success) {
          throw new Error(
            uploadResult.message ||
              `Failed to upload attachment for question ${questionSrNo}.`
          );
        }

        merged.push({
          id: String(
            uploadResult.data.blobPath ||
              pending.id ||
              uploadResult.data.fileName
          ),
          fileName: uploadResult.data.fileName,
          blobPath: uploadResult.data.blobPath,
          contentType: uploadResult.data.contentType,
          size: uploadResult.data.size,
        });
      }

      uploadedAttachments[questionSrNo] = merged;
    }

    // Ensure every question key is present so removals persist.
    for (const question of formData.questions || []) {
      const key = String(question.srNo);
      if (!Object.prototype.hasOwnProperty.call(uploadedAttachments, key)) {
        uploadedAttachments[key] = [];
      }
    }

    const response = await fetch("/api/save-pre-od-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participantId,
        organizationId,
        workshopId: formData.workshop.id,
        answers,
        attachments: uploadedAttachments,
        isDraft,
      }),
    });

    const data = await readApiJson(
      response,
      "Failed to save your responses."
    );

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to save your responses.");
    }

    const nextAttachments = normalizeAttachmentsMap(
      data.data?.attachments || uploadedAttachments
    );
    setSavedAttachments(nextAttachments);
    setPendingFiles({});
    setIsDirty(false);
    setFormData((current) =>
      current
        ? {
            ...current,
            answers,
            attachments: nextAttachments,
            submittedDate: data.data?.submittedDate || current.submittedDate,
          }
        : current
    );

    return data;
  };

  const handleSave = async (): Promise<boolean> => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      await saveAnswers(true);
      setSuccessMessage("Draft saved successfully.");
      return true;
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to save your responses.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useRegisterUnsavedGuard(isDirty && canFill, handleSave);

  // Quiet auto-save so responses are not lost if the Pre-OD window closes
  // before the participant clicks Save.
  useEffect(() => {
    if (!canFill || !isDirty || saving || loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await saveAnswers(true);
          setSuccessMessage("Draft auto-saved.");
          setErrorMessage("");
        } catch (error: any) {
          console.error(error);
          // Keep the form dirty; user can still save manually.
        }
      })();
    }, 30000);

    return () => window.clearTimeout(timer);
    // saveAnswers closes over latest answers/attachments intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFill, isDirty, saving, loading, answers, pendingFiles, savedAttachments]);

  const handleNext = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      setPage((current) => Math.min(current + 1, totalPages - 1));
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to save your responses.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    setPage((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      await saveAnswers(false);
      setIsDirty(false);
      clearCachedPageData(`pre-od:${participantId}:${formData!.workshop.id}`);
      setSuccessMessage("Questionnaire submitted successfully.");
      navigate("/userdashboard", { replace: true });
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to submit the questionnaire.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <UserLayout contentClassName="pre-od-form-layout">
      <div className="pre-od-form-page">
        <section className="pre-od-hero">
          <div className="pre-od-hero-copy">
            <span className="pre-od-hero-icon" aria-hidden>
              <ClipboardList size={15} strokeWidth={2.2} />
            </span>
            <div>
              <h1>Pre-Organizational Development Questionnaire</h1>
              <p>
                Complete these questions before the workshop begins. Attach
                supporting files where helpful.
              </p>
            </div>
          </div>
          <div className="pre-od-hero-aside">
            <div className="pre-od-hero-art" aria-hidden />
            <p className="pre-od-hero-tagline">Prepare today. Grow tomorrow.</p>
          </div>
        </section>

        {formData?.available ? (
          <div className="pre-od-top is-sticky">
            <p className="pre-od-top-page">
              Page {page + 1} of {totalPages}
            </p>
            <div className="pre-od-top-actions">
              {canFill ? (
                <>
                  <button
                    type="button"
                    className="user-btn-secondary"
                    onClick={handlePrevious}
                    disabled={page === 0 || saving}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="user-btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Responses"}
                  </button>
                  {!isLastPage ? (
                    <button
                      type="button"
                      className="user-btn-secondary"
                      onClick={handleNext}
                      disabled={saving}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="user-btn-primary"
                      onClick={handleSubmit}
                      disabled={saving}
                    >
                      {saving ? "Submitting..." : "Submit"}
                    </button>
                  )}
                </>
              ) : (
                <span className="pre-od-readonly-chip">Read-only</span>
              )}
            </div>
          </div>
        ) : null}

        {!canFill && formData?.message ? (
          <WorkshopEditBanner message={formData.message} />
        ) : null}

        {errorMessage ? (
          <div className="pre-od-form-error">{errorMessage}</div>
        ) : null}

        {successMessage ? (
          <div className="pre-od-form-success">{successMessage}</div>
        ) : null}

        {loading && !formData ? (
          <p className="pre-od-form-status">Loading questionnaire...</p>
        ) : !formData?.available ? (
          <div className="pre-od-form-empty">
            {formData?.message ||
              "The Pre-Workshop Questionnaire has not been assigned for your workshop yet."}
          </div>
        ) : (
          <>
            {formData.submittedDate ? (
              <p className="pre-od-form-submitted">
                Last submitted:{" "}
                {new Date(formData.submittedDate).toLocaleString()}
              </p>
            ) : null}

            <form
              className="pre-od-form"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="pre-od-question-list">
                {pageQuestions.map((item) => {
                  const key = String(item.srNo);
                  const pendingList = pendingFiles[key] || [];
                  const savedList = savedAttachments[key] || [];
                  const attachmentItems = [
                    ...pendingList.map((entry) => ({
                      id: entry.id,
                      fileName: entry.fileName,
                      contentType: entry.contentType,
                      file: entry.file,
                      blobPath: undefined as string | undefined,
                      pending: true,
                    })),
                    ...savedList.map((entry) => ({
                      id: String(entry.id || entry.blobPath || entry.fileName),
                      fileName: entry.fileName,
                      contentType: entry.contentType,
                      file: undefined as File | undefined,
                      blobPath: entry.blobPath,
                      pending: false,
                    })),
                  ];
                  const allowAttachment =
                    String(item.attachmentsApplicable || "Y").toUpperCase() !==
                    "N";

                  return (
                    <div
                      key={item.srNo}
                      className="pre-od-question-block"
                      id={`pre-od-question-${item.srNo}`}
                    >
                      <div className="pre-od-col pre-od-col-question">
                        <span className="pre-od-label">Question</span>
                        <div className="pre-od-question-heading">
                          <span className="pre-od-question-number">
                            Q{item.displayNo}
                          </span>
                          <div className="pre-od-question-copy">
                            <div className="pre-od-question-text">
                              {item.question}
                            </div>
                            {item.category ? (
                              <span className="pre-od-question-tag">
                                {item.category}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="pre-od-col pre-od-col-response">
                        <span className="pre-od-label">Response</span>
                        <textarea
                          value={answers[key] || ""}
                          onChange={(event) =>
                            handleAnswerChange(item.srNo, event.target.value)
                          }
                          rows={3}
                          disabled={!canFill || saving}
                          placeholder="Enter your response"
                        />
                      </div>

                      <div className="pre-od-col pre-od-col-attachments">
                        <span className="pre-od-label">Attachments</span>
                        <div className="pre-od-attach-card">
                          {canFill && allowAttachment ? (
                            <div className="pre-od-attach-head">
                              <label className="pre-od-attach-upload">
                                Choose files
                                <input
                                  type="file"
                                  accept={ATTACHMENT_ACCEPT}
                                  multiple
                                  disabled={saving}
                                  onChange={(event) =>
                                    handleAttachmentChange(item.srNo, event)
                                  }
                                />
                              </label>
                            </div>
                          ) : null}

                          {attachmentItems.length > 0 ? (
                            attachmentItems.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="pre-od-attach-file"
                              >
                                <FileText
                                  size={14}
                                  strokeWidth={2.1}
                                  aria-hidden
                                />
                                <span title={attachment.fileName}>
                                  {attachment.fileName}
                                </span>
                                <button
                                  type="button"
                                  className="pre-od-attachment-link"
                                  onClick={() =>
                                    setAttachmentPreview({
                                      url:
                                        attachment.blobPath && !attachment.pending
                                          ? `/api/get-pre-od-attachment?participantId=${encodeURIComponent(
                                              participantId
                                            )}&workshopId=${encodeURIComponent(
                                              formData.workshop.id
                                            )}&questionSrNo=${encodeURIComponent(
                                              key
                                            )}&blobPath=${encodeURIComponent(
                                              attachment.blobPath
                                            )}`
                                          : undefined,
                                      file: attachment.file,
                                      fileName: attachment.fileName,
                                      contentType: attachment.contentType || "",
                                    })
                                  }
                                >
                                  <Eye
                                    size={13}
                                    strokeWidth={2.2}
                                    aria-hidden
                                  />
                                  Preview
                                </button>
                                {canFill ? (
                                  <button
                                    type="button"
                                    className="pre-od-attach-remove"
                                    aria-label={`Remove ${attachment.fileName}`}
                                    disabled={saving}
                                    onClick={() => {
                                      markDirty();
                                      if (attachment.pending) {
                                        setPendingFiles((prev) => {
                                          const nextList = (
                                            prev[key] || []
                                          ).filter(
                                            (entry) => entry.id !== attachment.id
                                          );
                                          const next = { ...prev };
                                          if (nextList.length === 0) {
                                            delete next[key];
                                          } else {
                                            next[key] = nextList;
                                          }
                                          return next;
                                        });
                                        return;
                                      }
                                      setSavedAttachments((prev) => {
                                        const nextList = (
                                          prev[key] || []
                                        ).filter(
                                          (entry) =>
                                            String(
                                              entry.id ||
                                                entry.blobPath ||
                                                entry.fileName
                                            ) !== attachment.id
                                        );
                                        const next = { ...prev };
                                        if (nextList.length === 0) {
                                          delete next[key];
                                        } else {
                                          next[key] = nextList;
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    <Trash2 size={12} strokeWidth={2} />
                                  </button>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="pre-od-attach-empty">
                              No attachments yet. {ATTACHMENT_HINT}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {flatQuestions.length > PAGE_SIZE ? (
                <div className="pre-od-pagination">
                  <button
                    type="button"
                    className="user-btn-secondary"
                    onClick={handlePrevious}
                    disabled={page === 0 || saving}
                  >
                    Previous
                  </button>
                  <span className="pre-od-page-indicator">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="user-btn-secondary"
                    onClick={handleNext}
                    disabled={isLastPage || saving}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </form>
          </>
        )}
      </div>
      <AttachmentPreviewModal
        target={attachmentPreview}
        onClose={() => setAttachmentPreview(null)}
      />
    </UserLayout>
  );
}
