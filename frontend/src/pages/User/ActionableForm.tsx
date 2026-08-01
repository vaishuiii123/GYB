import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  fetchWorkshopByOrganization,
  fetchOdChart,
  flattenOdChartLeaves,
  getWorkshopEditStatus,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [workshop, setWorkshop] = useState<WorkshopContext | null>(null);
  const [forms, setForms] = useState<FormEntry[]>([createEmptyForm()]);
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
    const loadFormData = async () => {
      if (!participant.id) {
        setErrorMessage("Please log in again.");
        setLoading(false);
        return;
      }

      try {
        if (!participant.organizationId) {
          setErrorMessage("Organization not found.");
          setLoading(false);
          return;
        }

        const workshopData = await fetchWorkshopByOrganization(
          participant.organizationId
        );

        if (!workshopData.success || !workshopData.workshop?.templateId) {
          setErrorMessage("No workshop template found for your organization.");
          setLoading(false);
          return;
        }

        const activeWorkshop = workshopData.workshop;
        setWorkshop({
          id: activeWorkshop.id,
          templateId: activeWorkshop.templateId,
          workshopName: activeWorkshop.workshopName || "",
          organizationName: activeWorkshop.organizationName || "",
        });

        const editStatus =
          typeof workshopData.canEdit === "boolean"
            ? {
                canEdit: workshopData.canEdit,
                editMessage: workshopData.editMessage || "",
              }
            : getWorkshopEditStatus(activeWorkshop);

        setCanEdit(editStatus.canEdit);
        setEditMessage(editStatus.editMessage);

        const [chartData, actionablesData] = await Promise.all([
          fetchOdChart(activeWorkshop.templateId),
          fetch(
            `/api/get-actionables?participantId=${participant.id}&workshopId=${activeWorkshop.id}`
          ).then((response) => response.json()),
        ]);

        if (chartData.success) {
          setCategories(flattenOdChartLeaves(chartData.tops || []));
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
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load form.");
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [participant.id, participant.organizationId]);

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
        const category = categories.find((item) => item.id === form.categoryId)!;

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
        `/api/get-actionables?participantId=${participant.id}&workshopId=${workshop?.id || ""}`
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
      <div className="actionables-page-wrap">
        <div className="actionables-panel">
          <div className="actionables-panel-header">
            <h1 className="actionables-title">Actionable Items</h1>
            <p className="actionables-intro">
              Record key priorities and takeaways from the workshop. Select a
              category, fill in the details, and save your actionables.
            </p>
          </div>

          {loading ? (
            <p className="actionables-empty">Loading form...</p>
          ) : categories.length === 0 ? (
            <p className="actionables-empty">
              No categories are assigned to your workshop yet.
            </p>
          ) : (
            <>
              {!canEdit && <WorkshopEditBanner message={editMessage} />}

              {errorMessage && (
                <div className="actionables-alert actionables-alert-error">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="actionables-alert actionables-alert-success">
                  {successMessage}
                </div>
              )}

              <div className="actionables-form-list">
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
                <div key={form.key} className="actionables-form-block">
                  {forms.length > 1 && (
                    <div className="actionables-form-block-header">
                      <span className="actionables-form-block-title">
                        Actionable {index + 1}
                      </span>
                      <button
                        type="button"
                        className="actionables-remove-btn"
                        onClick={() => removeForm(form.key)}
                        disabled={!canEdit}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="actionables-field">
                    <label
                      className="actionables-label"
                      htmlFor={`category-${form.key}`}
                    >
                      Category
                    </label>
                    <select
                      id={`category-${form.key}`}
                      className="actionables-select"
                      value={form.categoryId}
                      onChange={(event) =>
                        updateForm(form.key, "categoryId", event.target.value)
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

                  <div className="actionables-field">
                    <label
                      className="actionables-label"
                      htmlFor={`description-${form.key}`}
                    >
                      Description*
                    </label>
                    <textarea
                      id={`description-${form.key}`}
                      className="actionables-textarea"
                      placeholder="Describe the actionable item"
                      value={form.description}
                      onChange={(event) =>
                        updateForm(form.key, "description", event.target.value)
                      }
                      rows={3}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="actionables-field-row">
                    <div className="actionables-field">
                      <label
                        className="actionables-label"
                        htmlFor={`timeline-${form.key}`}
                      >
                        Timeline*
                      </label>
                      <input
                        id={`timeline-${form.key}`}
                        type="date"
                        className="actionables-input"
                        value={form.timeline}
                        onChange={(event) =>
                          updateForm(form.key, "timeline", event.target.value)
                        }
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="actionables-field">
                      <label
                        className="actionables-label"
                        htmlFor={`responsible-${form.key}`}
                      >
                        Person/s responsible*
                      </label>
                      <input
                        id={`responsible-${form.key}`}
                        type="text"
                        className="actionables-input"
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

                  <div className="actionables-field">
                    <label
                      className="actionables-label"
                      htmlFor={`comments-${form.key}`}
                    >
                      Comments (if any)
                    </label>
                    <textarea
                      id={`comments-${form.key}`}
                      className="actionables-textarea"
                      placeholder="Additional notes"
                      value={form.comments}
                      onChange={(event) =>
                        updateForm(form.key, "comments", event.target.value)
                      }
                      rows={2}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              );
            })}
              </div>

              <div className="actionables-actions">
                <button
                  type="button"
                  className="user-btn-secondary actionables-add-btn"
                  onClick={addAnotherForm}
                  disabled={!canEdit || forms.length >= categories.length}
                >
                  <Plus size={18} strokeWidth={2} />
                  Add actionable items
                </button>

                <button
                  type="button"
                  className="user-btn-primary actionables-save-btn"
                  onClick={handleSubmit}
                  disabled={saving || loading || !canEdit}
                >
                  {saving ? "Saving..." : "Save & Submit"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="actionables-footer">
          Grow Your Business: Organization Development Workshop
        </div>
      </div>
    </UserLayout>
  );
}
