import { useState, useEffect, useMemo, useRef } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useNavigate, useSearchParams } from "react-router-dom";
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

type SourceQuestion = {
  id: string;
  question: string;
  categoryName: string;
  categoryPath?: string;
};

type SourceCategoryMeta = {
  categoryIds: string[];
  categoryNames: string[];
  categoryPaths: string[];
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

function buildCopyName(name: string) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^copy of /i.test(trimmed)) {
    return trimmed;
  }
  return `Copy of ${trimmed}`;
}

export default function CreateTemplate({ user }: PageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceTemplateId = searchParams.get("from") || "";

  const [templateName, setTemplateName] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [sourceQuestions, setSourceQuestions] = useState<SourceQuestion[]>([]);
  const [sourceCategoryMeta, setSourceCategoryMeta] =
    useState<SourceCategoryMeta>({
      categoryIds: [],
      categoryNames: [],
      categoryPaths: [],
    });
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSource, setLoadingSource] = useState(Boolean(sourceTemplateId));
  const [sourceLabel, setSourceLabel] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/get-all-categories");
        const data = await response.json();
        if (cancelled || !data.success) {
          return;
        }

        setCategories(data.categories || []);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    };

    const loadSourceTemplate = async () => {
      if (!sourceTemplateId) {
        setLoadingSource(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/get-template-details?templateId=${encodeURIComponent(
            sourceTemplateId
          )}`
        );
        const data = await response.json();
        if (cancelled) {
          return;
        }

        if (!data.success || !data.template) {
          alert(data.message || "Could not load the selected template.");
          return;
        }

        const source = data.template;
        const questions: SourceQuestion[] = (source.questions || [])
          .map(
            (question: {
              id?: string;
              question?: string;
              categoryName?: string;
              categoryPath?: string;
            }) => ({
              id: String(question.id || "").trim(),
              question: String(question.question || "").trim(),
              categoryName: String(question.categoryName || "General").trim(),
              categoryPath: String(question.categoryPath || "").trim(),
            })
          )
          .filter((question: SourceQuestion) => question.id);

        const preselected =
          questions.length > 0
            ? questions.map((question) => question.id)
            : (source.questionIds || [])
                .map((id: string) => String(id).trim())
                .filter(Boolean);

        setTemplateName(buildCopyName(source.templateName || ""));
        setSelectedQuestions(preselected);
        setSourceQuestions(questions);
        setSourceLabel(source.templateName || "selected template");
        setSourceCategoryMeta({
          categoryIds: (source.categoryIds || [])
            .map((id: string) => String(id).trim())
            .filter(Boolean),
          categoryNames: (source.categoryNames || [])
            .map((name: string) => String(name).trim())
            .filter(Boolean),
          categoryPaths: (source.categoryPaths || [])
            .map((path: string) => String(path).trim())
            .filter(Boolean),
        });
        // Keep category empty so all source questions stay visible.
        setActiveCategoryId("");
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          alert("Error loading template to copy.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSource(false);
        }
      }
    };

    loadCategories();
    loadSourceTemplate();

    return () => {
      cancelled = true;
    };
  }, [sourceTemplateId]);

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId) || null;
  }, [categories, activeCategoryId]);

  const selectedCategoryData = useMemo(() => {
    return categories.filter((category) =>
      category.questions.some((q) => selectedQuestions.includes(q.id))
    );
  }, [categories, selectedQuestions]);

  const selectedQuestionsList = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; question: string; categoryName: string }
    >();

    categories.forEach((category) => {
      category.questions.forEach((q) => {
        if (selectedQuestions.includes(q.id)) {
          byId.set(q.id, {
            id: q.id,
            question: q.question,
            categoryName: category.categoryName,
          });
        }
      });
    });

    sourceQuestions.forEach((question) => {
      if (selectedQuestions.includes(question.id) && !byId.has(question.id)) {
        byId.set(question.id, {
          id: question.id,
          question: question.question || question.id,
          categoryName: question.categoryName || "General",
        });
      }
    });

    return selectedQuestions
      .map((id) => byId.get(id))
      .filter(Boolean) as {
      id: string;
      question: string;
      categoryName: string;
    }[];
  }, [categories, selectedQuestions, sourceQuestions]);

  const browsableCategories = useMemo(
    () =>
      categories
        .filter((category) => category.questions.length > 0)
        .sort((a, b) =>
          a.categoryName.localeCompare(b.categoryName, undefined, {
            sensitivity: "base",
          })
        ),
    [categories]
  );

  const visibleQuestions = useMemo(() => {
    if (activeCategory) {
      return activeCategory.questions.map((question) => ({
        id: question.id,
        question: question.question,
        categoryName: activeCategory.categoryName,
      }));
    }

    if (sourceTemplateId && sourceQuestions.length > 0) {
      return sourceQuestions;
    }

    return [];
  }, [activeCategory, sourceTemplateId, sourceQuestions]);

  const toggleCategoryAll = () => {
    const questionIds = visibleQuestions.map((q) => q.id);
    if (questionIds.length === 0) return;

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

    const categoryIds =
      selectedCategoryData.length > 0
        ? selectedCategoryData.map((c) => c.id)
        : sourceCategoryMeta.categoryIds;
    const categoryNames =
      selectedCategoryData.length > 0
        ? selectedCategoryData.map((c) => c.categoryName)
        : sourceCategoryMeta.categoryNames;
    const categoryPaths =
      selectedCategoryData.length > 0
        ? selectedCategoryData.map((c) => c.fullPath)
        : sourceCategoryMeta.categoryPaths;

    if (categoryIds.length === 0) {
      alert(
        "Could not resolve categories for the selected questions. Pick at least one question from a category."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/create-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: templateName.trim(),
          categoryIds,
          categoryNames,
          categoryPaths,
          questionIds: selectedQuestions,
          createdBy: user?.email || user?.name || "Admin",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          sourceTemplateId
            ? "New template created from the selected template"
            : "Template Created Successfully"
        );
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

  const visibleQuestionIds = visibleQuestions.map((q) => q.id);
  const pageTitle = sourceTemplateId
    ? "Create Template from Existing"
    : "Create Template";
  const isLoading = loadingSource;

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
            <span>{pageTitle}</span>
          </div>

          <h1 className="page-title">{pageTitle}</h1>

          {sourceTemplateId ? (
            <p className="template-copy-hint">
              {loadingSource
                ? "Loading selected template questions..."
                : `Started from “${sourceLabel}”. ${selectedQuestions.length} question(s) pre-selected. Change the name or selection, then save as a new template.`}
            </p>
          ) : null}

          <div className="template-card">
            <div className="form-row">
              <div className="form-group">
                <label>Template Name *</label>
                <input
                  placeholder="Enter a new template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  disabled={loadingSource}
                />
              </div>

              <div className="form-group">
                <label>Browse Question Category</label>
                <select
                  value={activeCategoryId}
                  onChange={(e) => setActiveCategoryId(e.target.value)}
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading categories..."
                      : sourceTemplateId
                        ? "All questions from source template"
                        : "Select question category"}
                  </option>
                  {browsableCategories.map((category) => (
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
                  Selected for template ({selectedQuestionsList.length}
                  {selectedCategoryData.length > 0
                    ? ` from ${selectedCategoryData.length} categories`
                    : ""}
                  )
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
                    {visibleQuestions.length > 0 && (
                      <SelectAllCheckbox
                        questionIds={visibleQuestionIds}
                        selectedQuestions={selectedQuestions}
                        onToggleAll={toggleCategoryAll}
                      />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Loading template questions...
                    </td>
                  </tr>
                ) : visibleQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      {loadingCategories
                        ? "Loading categories..."
                        : "Select a category from the dropdown to view its questions"}
                    </td>
                  </tr>
                ) : (
                  visibleQuestions.map((question, index) => (
                    <tr key={question.id}>
                      <td>{index + 1}</td>
                      <td>{question.question}</td>
                      <td>{question.categoryName}</td>
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
                disabled={saving || loadingSource}
              >
                {saving
                  ? "Saving..."
                  : sourceTemplateId
                    ? "Save as New Template"
                    : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
