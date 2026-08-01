import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { EditIconBtn, ViewIconBtn } from "../../components/AdminActionIcons";
import "../../styles/PreOD.css";

type PreOdQuestion = {
  srNo: number;
  category: string;
  question: string;
  section: "A" | "B";
};

type CustomQuestion = {
  question: string;
  category: string;
};

type AssignedQuestion = {
  srNo?: number;
  category: string;
  question: string;
  isCustom?: boolean;
};

type Workshop = {
  id: string;
  workshopName: string;
  organizationName: string;
  startDate?: string;
  preOdQuestionSrNos?: string;
  preOdCustomQuestions?: string;
  preOdQuestionCount?: number;
};

type FormMode = "create" | "edit";

type PageProps = {
  user?: any;
};

function parseSrNos(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function parseCustomQuestions(value?: string): CustomQuestion[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        question: String(item?.question || "").trim(),
        category: String(item?.category || "Custom").trim() || "Custom",
      }))
      .filter((item) => item.question);
  } catch {
    return [];
  }
}

function canEditPreOd(startDate?: string) {
  if (!startDate) {
    return true;
  }

  const startMs = new Date(startDate).getTime();
  if (Number.isNaN(startMs)) {
    return true;
  }

  return Date.now() < startMs;
}

export default function PreOD({ user }: PageProps) {
  const [questions, setQuestions] = useState<PreOdQuestion[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedWorkshopId, setSelectedWorkshopId] = useState("");
  const [selectedSrNos, setSelectedSrNos] = useState<number[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newCustomQuestion, setNewCustomQuestion] = useState("");
  const [newCustomCategory, setNewCustomCategory] = useState("Custom");
  const [statusMessage, setStatusMessage] = useState("");
  const [viewWorkshopId, setViewWorkshopId] = useState("");

  const questionMap = useMemo(
    () => new Map(questions.map((item) => [item.srNo, item])),
    [questions]
  );

  const assignedWorkshops = useMemo(() => {
    return workshops
      .filter((workshop) => (workshop.preOdQuestionCount || 0) > 0)
      .map((workshop) => {
        const bankQuestions: AssignedQuestion[] = parseSrNos(
          workshop.preOdQuestionSrNos
        )
          .map((srNo) => questionMap.get(srNo))
          .filter(Boolean)
          .map((item) => ({
            srNo: item!.srNo,
            category: item!.category,
            question: item!.question,
            isCustom: false,
          }));

        const custom: AssignedQuestion[] = parseCustomQuestions(
          workshop.preOdCustomQuestions
        ).map((item) => ({
          category: item.category,
          question: item.question,
          isCustom: true,
        }));

        return {
          ...workshop,
          assignedQuestions: [...bankQuestions, ...custom],
        };
      });
  }, [workshops, questionMap]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [questionsRes, workshopsRes] = await Promise.all([
        fetch("/api/get-pre-od-questions"),
        fetch("/api/get-workshops"),
      ]);

      const questionsData = await questionsRes.json();
      const workshopsData = await workshopsRes.json();

      if (questionsData.success) {
        setQuestions(questionsData.questions || []);
      }

      if (workshopsData.success) {
        setWorkshops(workshopsData.workshops || []);
      }
    } catch (error) {
      console.error("Error loading Pre OD data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!showCreateForm || !selectedWorkshopId) {
      return;
    }

    const workshop = workshops.find((item) => item.id === selectedWorkshopId);
    setSelectedSrNos(parseSrNos(workshop?.preOdQuestionSrNos));
    setCustomQuestions(parseCustomQuestions(workshop?.preOdCustomQuestions));
  }, [selectedWorkshopId, workshops, showCreateForm]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(questions.map((item) => item.category)));
    return ["All", ...unique];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((item) => {
      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;
      const matchesSearch =
        !term ||
        item.question.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        String(item.srNo).includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [questions, search, categoryFilter]);

  const selectedWorkshop = workshops.find(
    (item) => item.id === selectedWorkshopId
  );

  const toggleQuestion = (srNo: number) => {
    setSelectedSrNos((current) =>
      current.includes(srNo)
        ? current.filter((item) => item !== srNo)
        : [...current, srNo]
    );
  };

  const toggleAllFiltered = () => {
    const filteredSrNos = filteredQuestions.map((item) => item.srNo);
    const allSelected = filteredSrNos.every((srNo) =>
      selectedSrNos.includes(srNo)
    );

    if (allSelected) {
      setSelectedSrNos((current) =>
        current.filter((srNo) => !filteredSrNos.includes(srNo))
      );
      return;
    }

    setSelectedSrNos((current) =>
      Array.from(new Set([...current, ...filteredSrNos]))
    );
  };

  const viewingWorkshop = useMemo(
    () => assignedWorkshops.find((item) => item.id === viewWorkshopId) || null,
    [assignedWorkshops, viewWorkshopId]
  );

  const openCreateForm = () => {
    setFormMode("create");
    setShowCreateForm(true);
    setViewWorkshopId("");
    setSelectedWorkshopId("");
    setSelectedSrNos([]);
    setCustomQuestions([]);
    setNewCustomQuestion("");
    setNewCustomCategory("Custom");
    setSearch("");
    setCategoryFilter("All");
    setStatusMessage("");
  };

  const openEditForm = (workshopId: string) => {
    const workshop = workshops.find((item) => item.id === workshopId);
    if (!workshop || !canEditPreOd(workshop.startDate)) {
      return;
    }

    setFormMode("edit");
    setShowCreateForm(true);
    setViewWorkshopId("");
    setSelectedWorkshopId(workshopId);
    setSelectedSrNos(parseSrNos(workshop.preOdQuestionSrNos));
    setCustomQuestions(parseCustomQuestions(workshop.preOdCustomQuestions));
    setNewCustomQuestion("");
    setNewCustomCategory("Custom");
    setSearch("");
    setCategoryFilter("All");
    setStatusMessage("");
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setFormMode("create");
    setSelectedWorkshopId("");
    setSelectedSrNos([]);
    setCustomQuestions([]);
    setNewCustomQuestion("");
    setStatusMessage("");
  };

  const openWorkshopView = (workshopId: string) => {
    setViewWorkshopId(workshopId);
    setShowCreateForm(false);
    setStatusMessage("");
  };

  const closeWorkshopView = () => {
    setViewWorkshopId("");
  };

  const addCustomQuestion = () => {
    const question = newCustomQuestion.trim();
    if (!question) {
      setStatusMessage("Enter a custom question before adding.");
      return;
    }

    setCustomQuestions((current) => [
      ...current,
      {
        question,
        category: newCustomCategory.trim() || "Custom",
      },
    ]);
    setNewCustomQuestion("");
    setNewCustomCategory("Custom");
    setStatusMessage("");
  };

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions((current) => current.filter((_, i) => i !== index));
  };

  const handleSavePreOd = async () => {
    if (!selectedWorkshopId) {
      setStatusMessage("Select a workshop first.");
      return;
    }

    const workshop = workshops.find((item) => item.id === selectedWorkshopId);
    if (workshop && !canEditPreOd(workshop.startDate)) {
      setStatusMessage(
        "This workshop has started. Pre OD can no longer be edited."
      );
      return;
    }

    if (selectedSrNos.length === 0 && customQuestions.length === 0) {
      setStatusMessage("Select at least one question or add a custom question.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage("");

      const response = await fetch("/api/save-workshop-pre-od", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workshopId: selectedWorkshopId,
          questionSrNos: selectedSrNos,
          customQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatusMessage(data.message || "Failed to save Pre OD.");
        return;
      }

      await loadData();
      closeCreateForm();
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to save Pre OD.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pre-od-page">
      <Sidebar />
      <div className="pre-od-content">
        <Header user={user} />

        <div className="pre-od-body">
          <div className="pre-od-header">
            <div>
              <h1 className="pre-od-title">Pre OD</h1>
              <p className="pre-od-subtitle">
                Pre OD questions assigned to each workshop.
              </p>
            </div>

            {!showCreateForm && !viewWorkshopId && (
              <button
                type="button"
                className="pre-od-save-btn pre-od-create-btn"
                onClick={openCreateForm}
              >
                Create Pre OD
              </button>
            )}
          </div>

          {showCreateForm ? (
            <div className="pre-od-create-panel">
              <div className="pre-od-create-panel-header">
                <h2>{formMode === "edit" ? "Edit Pre OD" : "Create Pre OD"}</h2>
                <div className="pre-od-create-panel-actions">
                  <button
                    type="button"
                    className="pre-od-cancel-btn"
                    onClick={closeCreateForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pre-od-save-btn"
                    onClick={handleSavePreOd}
                    disabled={saving || !selectedWorkshopId}
                  >
                    {saving ? "Saving..." : "Save Pre OD"}
                  </button>
                </div>
              </div>

              <div className="pre-od-assign-form">
                <div className="pre-od-workshop-field">
                  <label className="pre-od-field-label">Workshop</label>
                  <select
                    className="pre-od-filter pre-od-workshop-select"
                    value={selectedWorkshopId}
                    onChange={(e) => setSelectedWorkshopId(e.target.value)}
                    disabled={formMode === "edit"}
                  >
                    <option value="">Select Workshop</option>
                    {workshops.map((workshop) => (
                      <option
                        key={workshop.id}
                        value={workshop.id}
                        disabled={!canEditPreOd(workshop.startDate)}
                      >
                        {workshop.workshopName}
                        {workshop.organizationName
                          ? ` — ${workshop.organizationName}`
                          : ""}
                        {!canEditPreOd(workshop.startDate) ? " (started)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formMode === "edit" ? (
                <p className="pre-od-panel-help">
                  You can edit Pre OD until the workshop starts.
                </p>
              ) : selectedWorkshop?.preOdQuestionCount ? (
                <p className="pre-od-panel-help">
                  This workshop already has {selectedWorkshop.preOdQuestionCount}{" "}
                  Pre OD questions. Saving will replace them.
                </p>
              ) : null}

              {statusMessage && (
                <div className="pre-od-error">{statusMessage}</div>
              )}

              <div className="pre-od-custom-panel">
                <div className="pre-od-custom-header">
                  <h3>Extra questions</h3>
                  <p>Add custom questions that are not in the bank below.</p>
                </div>

                <div className="pre-od-custom-form">
                  <input
                    type="text"
                    className="pre-od-search"
                    placeholder="Enter custom question..."
                    value={newCustomQuestion}
                    onChange={(e) => setNewCustomQuestion(e.target.value)}
                  />
                  <input
                    type="text"
                    className="pre-od-filter"
                    placeholder="Category"
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pre-od-select-all-btn"
                    onClick={addCustomQuestion}
                  >
                    Add Question
                  </button>
                </div>

                {customQuestions.length > 0 ? (
                  <ul className="pre-od-custom-list">
                    {customQuestions.map((item, index) => (
                      <li key={`${item.question}-${index}`}>
                        <div>
                          <strong>{item.category}</strong>
                          <p>{item.question}</p>
                        </div>
                        <button
                          type="button"
                          className="pre-od-custom-remove"
                          onClick={() => removeCustomQuestion(index)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pre-od-panel-help">No extra questions added yet.</p>
                )}
              </div>

              <div className="pre-od-toolbar">
                <input
                  type="text"
                  className="pre-od-search"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="pre-od-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="pre-od-select-all-btn"
                  onClick={toggleAllFiltered}
                >
                  Select / Unselect Filtered
                </button>
              </div>

              <div className="pre-od-table-card">
                {loading ? (
                  <p>Loading questions...</p>
                ) : (
                  <table className="pre-od-table">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Sr No</th>
                        <th>Questions</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.map((item) => (
                        <tr
                          key={item.srNo}
                          className={
                            item.section === "A" ? "section-a" : "section-b"
                          }
                        >
                          <td className="pre-od-check">
                            <input
                              type="checkbox"
                              checked={selectedSrNos.includes(item.srNo)}
                              onChange={() => toggleQuestion(item.srNo)}
                            />
                          </td>
                          <td className="pre-od-sr">{item.srNo}</td>
                          <td>{item.question}</td>
                          <td className="pre-od-category">{item.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : viewingWorkshop ? (
            <section className="pre-od-assignment-card">
              <div className="pre-od-assignment-header">
                <div>
                  <h2 className="pre-od-workshop-name">
                    {viewingWorkshop.workshopName}
                  </h2>
                  {viewingWorkshop.organizationName ? (
                    <p className="pre-od-workshop-org">
                      {viewingWorkshop.organizationName}
                    </p>
                  ) : null}
                  <p className="pre-od-assigned-label">
                    {viewingWorkshop.assignedQuestions.length} question
                    {viewingWorkshop.assignedQuestions.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="pre-od-create-panel-actions">
                  <button
                    type="button"
                    className="pre-od-cancel-btn"
                    onClick={closeWorkshopView}
                  >
                    Back
                  </button>
                  {canEditPreOd(viewingWorkshop.startDate) ? (
                    <EditIconBtn
                      onClick={() => openEditForm(viewingWorkshop.id)}
                    />
                  ) : (
                    <p className="pre-od-locked-label">Workshop started</p>
                  )}
                </div>
              </div>

              <ol className="pre-od-assigned-questions">
                {viewingWorkshop.assignedQuestions.map((item, index) => (
                  <li key={`${viewingWorkshop.id}-${item.srNo || index}`}>
                    <span className="pre-od-assigned-meta">
                      {item.isCustom ? "Custom" : `Q${item.srNo}`} ·{" "}
                      {item.category}
                    </span>
                    <p>{item.question}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <div className="pre-od-list">
              {loading ? (
                <p className="pre-od-empty">Loading Pre OD assignments...</p>
              ) : assignedWorkshops.length === 0 ? (
                <div className="pre-od-empty-card">
                  <p>
                    No Pre OD questions have been assigned to any workshop yet.
                  </p>
                  <button
                    type="button"
                    className="pre-od-save-btn"
                    onClick={openCreateForm}
                  >
                    Create Pre OD
                  </button>
                </div>
              ) : (
                assignedWorkshops.map((workshop) => (
                  <div
                    key={workshop.id}
                    className="pre-od-workshop-card pre-od-workshop-tab"
                  >
                    <div className="pre-od-workshop-card-main">
                      <h2 className="pre-od-workshop-name">
                        {workshop.workshopName}
                      </h2>
                      {workshop.organizationName ? (
                        <p className="pre-od-workshop-org">
                          {workshop.organizationName}
                        </p>
                      ) : null}
                      <p className="pre-od-assigned-label">
                        {workshop.assignedQuestions.length} question
                        {workshop.assignedQuestions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="admin-action-group">
                      <ViewIconBtn
                        onClick={() => openWorkshopView(workshop.id)}
                        title="View questions"
                      />
                      {canEditPreOd(workshop.startDate) ? (
                        <EditIconBtn
                          onClick={() => openEditForm(workshop.id)}
                        />
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
