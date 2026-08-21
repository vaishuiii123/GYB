import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
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
import "../../styles/PreODForm.css";

type AttachmentMeta = {
  fileName: string;
  blobPath: string;
  contentType?: string;
  size?: number;
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
  attachments?: Record<string, AttachmentMeta>;
  submittedDate?: string;
};

const ATTACHMENT_ACCEPT =
  ".xlsx,.xls,.doc,.docx,.ppt,.pptx,.pdf,.txt,.png,.jpg,.jpeg,.gif,.webp";

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
    Record<string, AttachmentMeta>
  >({});
  const [pendingFiles, setPendingFiles] = useState<
    Record<string, { file: File; fileName: string; contentType: string }>
  >({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const requestIdRef = useRef(0);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);

  const canFill = formData?.canFill ?? false;

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
          setSavedAttachments(cached.attachments || {});
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
        const data = await response.json();

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok || !data.success) {
          if (!cached) {
            setErrorMessage(data.message || "Unable to load Pre OD form.");
          }
          return;
        }

        setFormData(data);
        setAnswers(data.answers || {});
        setSavedAttachments(data.attachments || {});
        setCachedPageData(cacheKey, data);
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        if (!cancelled && requestId === requestIdRef.current) {
          setErrorMessage("Unable to load Pre OD form.");
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
    setAnswers((current) => ({
      ...current,
      [String(srNo)]: value,
    }));
  };

  const handleAttachmentChange = (
    srNo: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    const key = String(srNo);
    if (!file) {
      setPendingFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }

    setPendingFiles((current) => ({
      ...current,
      [key]: {
        file,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      },
    }));
    setErrorMessage("");
  };

  const saveAnswers = async (isDraft: boolean) => {
    if (!canFill || !formData?.workshop?.id || !participantId) {
      return;
    }

    const uploadedAttachments: Record<string, AttachmentMeta> = {
      ...savedAttachments,
    };

    for (const [questionSrNo, pending] of Object.entries(pendingFiles)) {
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
      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(
          uploadResult.message ||
            `Failed to upload attachment for question ${questionSrNo}.`
        );
      }

      uploadedAttachments[questionSrNo] = {
        fileName: uploadResult.data.fileName,
        blobPath: uploadResult.data.blobPath,
        contentType: uploadResult.data.contentType,
        size: uploadResult.data.size,
      };
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

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to save Pre OD.");
    }

    setSavedAttachments(
      data.data?.attachments || uploadedAttachments
    );
    setPendingFiles({});
    setFormData((current) =>
      current
        ? {
            ...current,
            answers,
            attachments: data.data?.attachments || uploadedAttachments,
            submittedDate: data.data?.submittedDate || current.submittedDate,
          }
        : current
    );

    return data;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      await saveAnswers(true);
      setSuccessMessage("Pre OD draft saved successfully.");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to save Pre OD.");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      setPage((current) => Math.min(current + 1, totalPages - 1));
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to save Pre OD.");
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
      clearCachedPageData(`pre-od:${participantId}:${formData!.workshop.id}`);
      setSuccessMessage("Pre OD submitted successfully.");
      navigate("/userdashboard", { replace: true });
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Failed to submit Pre OD.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <UserLayout contentClassName="pre-od-form-layout">
      <div className="pre-od-form-page">
        <div className="pre-od-form-header">
          <div>
            <h1>Pre-Organization Development Workshop</h1>
            <p>Complete the assigned questions before your workshop begins.</p>
          </div>
        </div>

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
          <p className="pre-od-form-status">Loading Pre OD form...</p>
        ) : !formData?.available ? (
          <div className="pre-od-form-empty">
            {formData?.message ||
              "Pre OD has not been assigned for your workshop yet."}
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
              <div className="pre-od-toolbar">
                <p className="pre-od-form-page-indicator">
                  Page {page + 1} of {totalPages}
                </p>

                {canFill ? (
                  <div className="pre-od-form-actions">
                    <button
                      type="button"
                      className="pre-od-btn pre-od-btn-outline"
                      onClick={handlePrevious}
                      disabled={page === 0 || saving}
                    >
                      ← Previous
                    </button>

                    <button
                      type="button"
                      className="pre-od-btn pre-od-btn-outline"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>

                    {!isLastPage ? (
                      <button
                        type="button"
                        className="pre-od-btn pre-od-btn-solid"
                        onClick={handleNext}
                        disabled={saving}
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="pre-od-btn pre-od-btn-solid"
                        onClick={handleSubmit}
                        disabled={saving}
                      >
                        {saving ? "Submitting..." : "Submit"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="pre-od-form-readonly-note">Read-only</p>
                )}
              </div>

              <div className="pre-od-question-list">
                {pageQuestions.map((item) => {
                  const key = String(item.srNo);
                  const pending = pendingFiles[key];
                  const saved = savedAttachments[key];
                  const displayName = pending?.fileName || saved?.fileName || "";
                  const showAttachment =
                    String(item.attachmentsApplicable || "N").toUpperCase() ===
                    "Y";

                  return (
                    <div key={item.srNo} className="pre-od-question-card">
                      <div className="pre-od-question-title">
                        <span className="pre-od-question-number">
                          {item.displayNo}
                        </span>
                        <span className="pre-od-question-text">
                          {item.question}
                        </span>
                      </div>
                      <textarea
                        value={answers[key] || ""}
                        onChange={(event) =>
                          handleAnswerChange(item.srNo, event.target.value)
                        }
                        rows={4}
                        disabled={!canFill || saving}
                        placeholder="Enter your response"
                      />
                      {showAttachment ? (
                        <div className="pre-od-attachment">
                          <label className="pre-od-attachment-label">
                            Attachment
                          </label>
                          <input
                            type="file"
                            accept={ATTACHMENT_ACCEPT}
                            disabled={!canFill || saving}
                            onChange={(event) =>
                              handleAttachmentChange(item.srNo, event)
                            }
                          />
                          <p className="pre-od-attachment-hint">
                            Excel, Word, PowerPoint, PDF, text, or images (max
                            10 MB)
                          </p>
                          {displayName ? (
                            <div className="pre-od-attachment-file">
                              <span>{displayName}</span>
                              {saved?.blobPath && !pending ? (
                                <a
                                  className="pre-od-attachment-link"
                                  href={`/api/get-pre-od-attachment?participantId=${encodeURIComponent(
                                    participantId
                                  )}&workshopId=${encodeURIComponent(
                                    formData.workshop.id
                                  )}&questionSrNo=${encodeURIComponent(key)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Download
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </form>
          </>
        )}
      </div>
    </UserLayout>
  );
}
