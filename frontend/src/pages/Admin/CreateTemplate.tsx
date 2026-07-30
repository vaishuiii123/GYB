import { useState, useEffect, useMemo, useRef } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";
import "../../styles/Template.css";

type PageProps = {
  user?: any;
};

type CategoryItem = {
  id: string;
  categoryName: string;
  fullPath: string;
  questions: any[];
};

function SelectAllCheckbox({
  questionIds,
  selectedQuestions,
  onToggleAll,
}: {
  questionIds: string[];
  selectedQuestions: string[];
  onToggleAll: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const selectedCount = questionIds.filter((id) =>
    selectedQuestions.includes(id)
  ).length;
  const allSelected =
    questionIds.length > 0 && selectedCount === questionIds.length;
  const someSelected =
    selectedCount > 0 && selectedCount < questionIds.length;

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      disabled={questionIds.length === 0}
      onChange={onToggleAll}
      title="Select all questions in this category"
    />
  );
}

export default function CreateTemplate({ user }: PageProps) {
  const navigate = useNavigate();

  const [templateName, setTemplateName] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/get-all-categories");
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId) || null;
  }, [categories, activeCategoryId]);

  const selectedCategoryData = useMemo(() => {
    return categories.filter((category) =>
      category.questions.some((q) => selectedQuestions.includes(q.id))
    );
  }, [categories, selectedQuestions]);

  const selectedQuestionsList = useMemo(() => {
    const list: { id: string; question: string; categoryName: string }[] = [];

    categories.forEach((category) => {
      category.questions.forEach((q) => {
        if (selectedQuestions.includes(q.id)) {
          list.push({
            id: q.id,
            question: q.question,
            categoryName: category.categoryName,
          });
        }
      });
    });

    return list;
  }, [categories, selectedQuestions]);

  const toggleCategoryAll = () => {
    if (!activeCategory) return;

    const questionIds = activeCategory.questions.map((q) => q.id);
    const allSelected = questionIds.every((id) =>
      selectedQuestions.includes(id)
    );

    if (allSelected) {
      setSelectedQuestions((prev) =>
        prev.filter((id) => !questionIds.includes(id))
      );
    } else {
      setSelectedQuestions((prev) => [
        ...new Set([...prev, ...questionIds]),
      ]);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const removeSelectedQuestion = (questionId: string) => {
    setSelectedQuestions((prev) => prev.filter((id) => id !== questionId));
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Template Name is required");
      return;
    }

    if (selectedQuestions.length === 0) {
      alert("Select at least one question");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/create-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName,
          categoryIds: selectedCategoryData.map((c) => c.id),
          categoryNames: selectedCategoryData.map((c) => c.categoryName),
          categoryPaths: selectedCategoryData.map((c) => c.fullPath),
          questionIds: selectedQuestions,
          createdBy: user?.email || user?.name || "Admin",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Template Created Successfully");
        navigate("/template");
      } else {
        alert(data.message || data.error || "Failed to create template");
      }
    } catch (error) {
      console.error(error);
      alert("Error creating template");
    } finally {
      setSaving(false);
    }
  };

  const activeQuestionIds =
    activeCategory?.questions.map((q) => q.id) || [];

  return (
    <div className="template-page">
      <Sidebar />

      <div className="template-content">
        <Header user={user} />

        <div className="template-body">
          <div className="breadcrumb">
            <span className="link" onClick={() => navigate("/template")}>
              Template
            </span>
            {" > "}
            <span>Create Template</span>
          </div>

          <h1 className="page-title">Create Template</h1>

          <div className="template-card">
            <div className="form-row">
              <div className="form-group">
                <label>Template Name *</label>
                <input
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Select Question Category</label>
                <select
                  value={activeCategoryId}
                  onChange={(e) => setActiveCategoryId(e.target.value)}
                >
                  <option value="">Select question category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.categoryName} ({category.questions.length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedQuestionsList.length > 0 && (
              <div className="selected-summary">
                <div className="selected-summary-title">
                  Selected for template ({selectedQuestionsList.length}{" "}
                  from {selectedCategoryData.length} categories)
                </div>
                <div className="selected-summary-list">
                  {selectedQuestionsList.map((item) => (
                    <span key={item.id} className="selected-chip">
                      {item.categoryName}: {item.question}
                      <button
                        type="button"
                        onClick={() => removeSelectedQuestion(item.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <table className="template-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Question</th>
                  <th>Question Category</th>
                  <th>
                    Include{" "}
                    {activeCategory && activeCategory.questions.length > 0 && (
                      <SelectAllCheckbox
                        questionIds={activeQuestionIds}
                        selectedQuestions={selectedQuestions}
                        onToggleAll={toggleCategoryAll}
                      />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!activeCategory ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Select a category from the dropdown to view its questions
                    </td>
                  </tr>
                ) : activeCategory.questions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      No questions in this category. Assign questions in
                      Category Management first.
                    </td>
                  </tr>
                ) : (
                  activeCategory.questions.map((question, index) => (
                    <tr key={question.id}>
                      <td>{index + 1}</td>
                      <td>{question.question}</td>
                      <td>{activeCategory.categoryName}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => toggleQuestion(question.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="card-footer">
              <button
                className="save-btn"
                onClick={saveTemplate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
