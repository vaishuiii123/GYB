import { useEffect, useMemo, useState } from "react";
import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/PreODForm.css";

type PreOdQuestion = {
  srNo: number;
  category: string;
  question: string;
  section: "A" | "B";
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
  submittedDate?: string;
};

export default function PreODForm() {
  const participant = getParticipantFromStorage();
  const selectedWorkshop = getSelectedWorkshop();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PreOdFormData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canFill = formData?.canFill ?? false;

  const groupedQuestions = useMemo(() => {
    const groups = new Map<string, PreOdQuestion[]>();

    for (const question of formData?.questions || []) {
      if (!groups.has(question.category)) {
        groups.set(question.category, []);
      }
      groups.get(question.category)?.push(question);
    }

    return Array.from(groups.entries());
  }, [formData?.questions]);

  useEffect(() => {
    const loadForm = async () => {
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
        setErrorMessage("");

        const params = new URLSearchParams({
          participantId: participant.id,
          workshopId: selectedWorkshop.id,
        });

        if (participant.organizationId) {
          params.set("organizationId", participant.organizationId);
        }

        const response = await fetch(
          `/api/get-workshop-pre-od?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || "Unable to load Pre OD form.");
          return;
        }

        setFormData(data);
        setAnswers(data.answers || {});
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load Pre OD form.");
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [participant?.id, participant?.organizationId, selectedWorkshop?.id]);

  const handleAnswerChange = (srNo: number, value: string) => {
    setAnswers((current) => ({
      ...current,
      [String(srNo)]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!canFill || !formData?.workshop?.id || !participant?.id) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/save-pre-od-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: participant.id,
          organizationId: participant.organizationId || "",
          workshopId: formData.workshop.id,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to submit Pre OD.");
        return;
      }

      setSuccessMessage("Pre OD submitted successfully.");
      setFormData((current) =>
        current
          ? {
              ...current,
              answers: data.data?.answers || answers,
              submittedDate: data.data?.submittedDate || new Date().toISOString(),
            }
          : current
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to submit Pre OD.");
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
            <p>
              Complete the assigned questions before your workshop begins.
            </p>
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

        {loading ? (
          <p className="pre-od-form-status">Loading Pre OD form...</p>
        ) : !formData?.available ? (
          <div className="pre-od-form-empty">
            {formData?.message ||
              "Pre OD has not been assigned for your workshop yet."}
          </div>
        ) : (
          <>
            <div className="pre-od-form-workshop-card">
              <h2>{formData.workshop.workshopName}</h2>
              {formData.workshop.organizationName ? (
                <p>{formData.workshop.organizationName}</p>
              ) : null}
              {formData.submittedDate ? (
                <p className="pre-od-form-submitted">
                  Last submitted:{" "}
                  {new Date(formData.submittedDate).toLocaleString()}
                </p>
              ) : null}
            </div>

            <form
              className="pre-od-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              {groupedQuestions.map(([category, items]) => (
                <section key={category} className="pre-od-form-section">
                  <h3>{category}</h3>

                  {items.map((item) => (
                    <label key={item.srNo} className="pre-od-form-field">
                      <span className="pre-od-form-label">
                        {item.srNo}. {item.question}
                      </span>
                      <textarea
                        value={answers[String(item.srNo)] || ""}
                        onChange={(event) =>
                          handleAnswerChange(item.srNo, event.target.value)
                        }
                        rows={4}
                        disabled={!canFill || saving}
                        placeholder="Enter your response"
                      />
                    </label>
                  ))}
                </section>
              ))}

              {canFill ? (
                <button
                  type="submit"
                  className="pre-od-form-submit"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Pre OD"}
                </button>
              ) : (
                <p className="pre-od-form-readonly-note">
                  This form is read-only because the workshop has started.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </UserLayout>
  );
}
