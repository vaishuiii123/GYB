import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardCheck,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  fetchOdChart,
  flattenOdChartLeaves,
  getActiveWorkshopContext,
  getWorkshopEditStatus,
  getWorkshopModuleAccessStatus,
} from "../../utils/workshopCache";
import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import "../../styles/Actionables.css";

type CategoryOption = {
  id: string;
  name: string;
  fullPath: string;
};

type WorkshopContext = {
  id: string;
  templateId: string;
  workshopName?: string;
  organizationName?: string;
};

type FormEntry = {
  key: string;
  savedId?: string;
  categoryId: string;
  description: string;
  timeline: string;
  responsiblePersons: string;
  comments: string;
};

const DESCRIPTION_MAX = 500;

function createEmptyForm(): FormEntry {
  return {
    key: crypto.randomUUID(),
    categoryId: "",
    description: "",
    timeline: "",
    responsiblePersons: "",
    comments: "",
  };
}

export default function ActionableForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [workshop, setWorkshop] = useState<WorkshopContext | null>(null);
  const [forms, setForms] = useState<FormEntry[]>([createEmptyForm()]);
  const [canEdit, setCanEdit] = useState(true);
  const [editMessage, setEditMessage] = useState("");

  const {
    participant,
    workshop: selectedWorkshop,
    canEdit: initialCanEdit,
    editMessage: initialEditMessage,
  } = getActiveWorkshopContext();

  useEffect(() => {
    if (!getWorkshopModuleAccessStatus(selectedWorkshop).enabled) {
      navigate("/userdashboard", { replace: true });
    }
  }, [navigate, selectedWorkshop]);

  useEffect(() => {
    const loadFormData = async () => {
      if (!participant?.id) {
        setErrorMessage("Please log in again.");
        setLoading(false);
        return;
      }

      try {
        if (!selectedWorkshop?.id || !selectedWorkshop.templateId) {
          setErrorMessage("No workshop template found for your organization.");
          setLoading(false);
          return;
        }

        setWorkshop({
          id: selectedWorkshop.id,
          templateId: selectedWorkshop.templateId,
          workshopName: selectedWorkshop.workshopName || "",
          organizationName: selectedWorkshop.organizationName || "",
        });
        setCanEdit(initialCanEdit);
        setEditMessage(initialEditMessage);

        const [chartData, actionablesData] = await Promise.all([
          fetchOdChart(selectedWorkshop.templateId),
          fetch(
            `/api/get-actionables?participantId=${participant.id}&workshopId=${selectedWorkshop.id}`
          ).then((response) => response.json()),
        ]);

        if (chartData.success) {
          setCategories(
            flattenOdChartLeaves(
              chartData.tops || [],
              selectedWorkshop.templateId
            )
          );
        }

        if (actionablesData.success && actionablesData.data?.length > 0) {
          const loadedForms: FormEntry[] = actionablesData.data.map(
            (item: {
              id: string;
              categoryId: string;
              description: string;
              timeline: string;
              responsiblePersons: string;
              comments: string;
            }) => ({
              key: crypto.randomUUID(),
              savedId: item.id,
              categoryId: item.categoryId || "",
              description: item.description || "",
              timeline: item.timeline || "",
              responsiblePersons: item.responsiblePersons || "",
              comments: item.comments || "",
            })
          );

          setForms(loadedForms);
        } else {
          setForms([createEmptyForm()]);
        }

        const editStatus = getWorkshopEditStatus(selectedWorkshop);
        setCanEdit(editStatus.canEdit);
        setEditMessage(editStatus.editMessage);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load form.");
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [
    participant?.id,
    selectedWorkshop?.id,
    selectedWorkshop?.templateId,
    initialCanEdit,
    initialEditMessage,
  ]);

  const updateForm = (
    key: string,
    field: keyof FormEntry,
    value: string
  ) => {
    setForms((prev) =>
      prev.map((form) =>
        form.key === key ? { ...form, [field]: value } : form
      )
    );
  };

  const getAvailableCategories = (currentKey: string) => {
    const usedCategoryIds = new Set(
      forms
        .filter((form) => form.key !== currentKey && form.categoryId)
        .map((form) => form.categoryId)
    );

    return categories.filter((category) => !usedCategoryIds.has(category.id));
  };

  const addAnotherForm = () => {
    if (!canEdit) {
      return;
    }

    const usedCount = forms.filter((form) => form.categoryId).length;

    if (usedCount >= categories.length) {
      setErrorMessage("All assigned categories already have a form.");
      return;
    }

    setErrorMessage("");
    setForms((prev) => [...prev, createEmptyForm()]);
  };

  const removeForm = (key: string) => {
    if (!canEdit) {
      return;
    }

    setForms((prev) => {
      if (prev.length === 1) {
        return [createEmptyForm()];
      }
      return prev.filter((form) => form.key !== key);
    });
  };

  const handleSubmit = async () => {
    if (!canEdit) {
      setErrorMessage(
        editMessage ||
          "The workshop has ended. You can no longer edit actionables."
      );
      return;
    }

    const formsToSave = forms.filter(
      (form) =>
        form.categoryId ||
        form.description.trim() ||
        form.timeline.trim() ||
        form.responsiblePersons.trim() ||
        form.comments.trim()
    );

    if (formsToSave.length === 0) {
      setErrorMessage("Add at least one actionable item.");
      return;
    }

    for (const form of formsToSave) {
      const category = categories.find((item) => item.id === form.categoryId);

      if (!category) {
        setErrorMessage("Please select a category for each form.");
        return;
      }

      if (!form.description.trim()) {
        setErrorMessage("Description is required for each form.");
        return;
      }

      if (!form.timeline.trim()) {
        setErrorMessage("Timeline is required for each form.");
        return;
      }

      if (!form.responsiblePersons.trim()) {
        setErrorMessage("Person/s responsible is required for each form.");
        return;
      }
    }

    const categoryIds = formsToSave.map((form) => form.categoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      setErrorMessage("Each form must use a different category.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      for (const form of formsToSave) {
        const category = categories.find(
          (item) => item.id === form.categoryId
        )!;

        const response = await fetch("/api/save-actionable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.savedId,
            participantId: participant.id,
            workshopId: workshop?.id || "",
            organizationId: participant.organizationId || "",
            categoryId: category.id,
            categoryName: category.name,
            categoryPath: category.fullPath,
            description: form.description,
            timeline: form.timeline,
            responsiblePersons: form.responsiblePersons,
            comments: form.comments,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setErrorMessage(result.message || "Failed to save actionables.");
          return;
        }
      }

      setSuccessMessage("Actionables saved successfully.");

      const refreshRes = await fetch(
        `/api/get-actionables?participantId=${participant.id}&workshopId=${
          workshop?.id || ""
        }`
      );
      const refreshData = await refreshRes.json();

      if (refreshData.success && refreshData.data?.length > 0) {
        setForms(
          refreshData.data.map(
            (item: {
              id: string;
              categoryId: string;
              description: string;
              timeline: string;
              responsiblePersons: string;
              comments: string;
            }) => ({
              key: crypto.randomUUID(),
              savedId: item.id,
              categoryId: item.categoryId || "",
              description: item.description || "",
              timeline: item.timeline || "",
              responsiblePersons: item.responsiblePersons || "",
              comments: item.comments || "",
            })
          )
        );
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <UserLayout contentClassName="user-layout-main-actionables">
      <div className="act-page">
        <div className="act-panel">
          <section className="act-hero">
            <div className="act-hero-copy">
              <span className="act-hero-icon" aria-hidden>
                <ClipboardCheck size={22} strokeWidth={2.1} />
              </span>
              <div>
                <h1>Actionable Items</h1>
                <p>
                  Add key priorities and initiatives from the workshop. Select a
                  category, fill in the details, and save your actionable items.
                </p>
              </div>
            </div>
            <div className="act-hero-art" aria-hidden />
          </section>

          {loading ? (
            <p className="act-empty">Loading form...</p>
          ) : categories.length === 0 ? (
            <p className="act-empty">
              No categories are assigned to your workshop yet.
            </p>
          ) : (
            <>
              {!canEdit && <WorkshopEditBanner message={editMessage} />}

              {errorMessage ? (
                <div className="act-alert act-alert-error">{errorMessage}</div>
              ) : null}

              {successMessage ? (
                <div className="act-alert act-alert-success">
                  {successMessage}
                </div>
              ) : null}

              <div className="act-form-list">
                {forms.map((form, index) => {
                  const availableCategories = getAvailableCategories(form.key);
                  const selectedCategory = categories.find(
                    (item) => item.id === form.categoryId
                  );
                  const dropdownCategories = selectedCategory
                    ? [selectedCategory, ...availableCategories].sort((a, b) =>
                        a.name.localeCompare(b.name)
                      )
                    : availableCategories;

                  return (
                    <article key={form.key} className="act-item">
                      <header className="act-item-header">
                        <div className="act-item-title">
                          <span className="act-item-number" aria-hidden>
                            {index + 1}
                          </span>
                          <h2>Actionable Item {index + 1}</h2>
                        </div>
                        <button
                          type="button"
                          className="act-remove-btn"
                          onClick={() => removeForm(form.key)}
                          disabled={!canEdit}
                        >
                          <Trash2 size={15} strokeWidth={2.2} />
                          Remove
                        </button>
                      </header>

                      <div className="act-grid-top">
                        <div className="act-field">
                          <label htmlFor={`category-${form.key}`}>
                            Category
                          </label>
                          <select
                            id={`category-${form.key}`}
                            value={form.categoryId}
                            onChange={(event) =>
                              updateForm(
                                form.key,
                                "categoryId",
                                event.target.value
                              )
                            }
                            disabled={!canEdit}
                          >
                            <option value="">Select category</option>
                            {dropdownCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="act-field">
                          <div className="act-label-row">
                            <label htmlFor={`description-${form.key}`}>
                              Description<span>*</span>
                            </label>
                            <small>
                              {form.description.length}/{DESCRIPTION_MAX}
                            </small>
                          </div>
                          <textarea
                            id={`description-${form.key}`}
                            placeholder="Describe the actionable item"
                            value={form.description}
                            maxLength={DESCRIPTION_MAX}
                            onChange={(event) =>
                              updateForm(
                                form.key,
                                "description",
                                event.target.value
                              )
                            }
                            rows={3}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>

                      <div className="act-grid-bottom">
                        <div className="act-field">
                          <label htmlFor={`timeline-${form.key}`}>
                            Timeline<span>*</span>
                          </label>
                          <div className="act-input-wrap">
                            <CalendarDays size={16} strokeWidth={2} />
                            <input
                              id={`timeline-${form.key}`}
                              type="date"
                              value={form.timeline}
                              onChange={(event) =>
                                updateForm(
                                  form.key,
                                  "timeline",
                                  event.target.value
                                )
                              }
                              disabled={!canEdit}
                            />
                          </div>
                        </div>

                        <div className="act-field">
                          <label htmlFor={`responsible-${form.key}`}>
                            Person(s) responsible<span>*</span>
                          </label>
                          <div className="act-input-wrap">
                            <UserRound size={16} strokeWidth={2} />
                            <input
                              id={`responsible-${form.key}`}
                              type="text"
                              placeholder="Name or role"
                              value={form.responsiblePersons}
                              onChange={(event) =>
                                updateForm(
                                  form.key,
                                  "responsiblePersons",
                                  event.target.value
                                )
                              }
                              disabled={!canEdit}
                            />
                          </div>
                        </div>

                        <div className="act-field">
                          <label htmlFor={`comments-${form.key}`}>
                            Comments (if any)
                          </label>
                          <div className="act-input-wrap">
                            <MessageSquare size={16} strokeWidth={2} />
                            <input
                              id={`comments-${form.key}`}
                              type="text"
                              placeholder="Additional notes"
                              value={form.comments}
                              onChange={(event) =>
                                updateForm(
                                  form.key,
                                  "comments",
                                  event.target.value
                                )
                              }
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="act-actions">
                <button
                  type="button"
                  className="act-add-btn"
                  onClick={addAnotherForm}
                  disabled={!canEdit || forms.length >= categories.length}
                >
                  <Plus size={18} strokeWidth={2.2} />
                  Add Actionable Item
                </button>

                <button
                  type="button"
                  className="act-save-btn"
                  onClick={handleSubmit}
                  disabled={saving || loading || !canEdit}
                >
                  <Save size={16} strokeWidth={2.2} />
                  {saving ? "Saving..." : "Save & Submit"}
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="act-footer-banner">
          <div className="act-footer-copy">
            <span className="act-footer-icon" aria-hidden>
              <TrendingUp size={18} strokeWidth={2.1} />
            </span>
            <div>
              <strong>Grow Your Business</strong>
              <span>Organization Development Workshop</span>
            </div>
          </div>
        </footer>
      </div>
    </UserLayout>
  );
}
