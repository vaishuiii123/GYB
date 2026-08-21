import { useState, useEffect, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
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
  tagId?: string;
  tagName?: string;
  tagColor?: string;
};

type SourceCategoryMeta = {
  categoryIds: string[];
  categoryNames: string[];
  categoryPaths: string[];
};

type TagItem = {
  id: string;
  tagName: string;
  tagColor?: string;
};

const cssColorToArgb = (value: unknown): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const hexMatch = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    return `FF${hexMatch[1].toUpperCase()}`;
  }

  const shortHex = raw.match(/^#?([0-9a-fA-F]{3})$/);
  if (shortHex) {
    const expanded = shortHex[1]
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase();
    return `FF${expanded}`;
  }

  const rgbMatch = raw.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
  );
  if (rgbMatch) {
    const toHex = (part: string) =>
      Math.max(0, Math.min(255, Number(part)))
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    return `FF${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  return null;
};

type TemplateQuestionRow = {
  serialNumber: number;
  questionId: string;
  question: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  questionType: string;
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
  const [tags, setTags] = useState<TagItem[]>([]);
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
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingSource, setLoadingSource] = useState(Boolean(sourceTemplateId));
  const [sourceLabel, setSourceLabel] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRows, setUploadRows] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

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

    const loadTags = async () => {
      try {
        const response = await fetch("/api/get-tags");
        const data = await response.json();
        if (cancelled || !data.success) {
          return;
        }

        setTags(data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoadingTags(false);
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
              tagId?: string;
              tagName?: string;
              tagColor?: string;
            }) => ({
              id: String(question.id || "").trim(),
              question: String(question.question || "").trim(),
              categoryName: String(question.categoryName || "General").trim(),
              categoryPath: String(question.categoryPath || "").trim(),
              tagId: String(question.tagId || "").trim(),
              tagName: String(question.tagName || "").trim(),
              tagColor: String(question.tagColor || "").trim(),
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
    loadTags();
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
    const tagColorById = new Map(
      tags.map((tag) => [tag.id, tag.tagColor || ""])
    );
    const tagNameById = new Map(tags.map((tag) => [tag.id, tag.tagName || ""]));

    if (activeCategory) {
      return activeCategory.questions.map((question) => {
        const tagId = String(question.tagId || "").trim();
        return {
          id: question.id,
          question: question.question,
          categoryName: activeCategory.categoryName,
          tagId,
          tagName: tagId ? tagNameById.get(tagId) || "" : "",
          tagColor: tagId ? tagColorById.get(tagId) || "" : "",
        };
      });
    }

    if (sourceTemplateId && sourceQuestions.length > 0) {
      return sourceQuestions.map((question) => {
        const tagId = String(question.tagId || "").trim();
        return {
          ...question,
          tagName:
            question.tagName ||
            (tagId ? tagNameById.get(tagId) || "" : ""),
          tagColor:
            question.tagColor ||
            (tagId ? tagColorById.get(tagId) || "" : ""),
        };
      });
    }

    return [];
  }, [activeCategory, sourceTemplateId, sourceQuestions, tags]);

  const templateQuestionRows = useMemo(() => {
    const tagNameById = new Map(tags.map((tag) => [tag.id, tag.tagName]));
    const tagColorById = new Map(
      tags.map((tag) => [tag.id, tag.tagColor || ""])
    );
    let serialNumber = 1;

    return categories.flatMap((category) =>
      category.questions.map((question) => ({
        serialNumber: serialNumber++,
        questionId: question.id,
        question: question.question || "",
        categoryId: category.id,
        categoryName: category.categoryName || "",
        categoryPath: category.fullPath || category.categoryName || "",
        tagId: question.tagId || "",
        tagName: question.tagId ? tagNameById.get(question.tagId) || "" : "",
        tagColor: question.tagId
          ? tagColorById.get(question.tagId) || ""
          : "",
        questionType: question.answerType || "",
      }))
    );
  }, [categories, tags]);

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

  const resetUploadState = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadRows([]);
    setUploadErrors([]);
    setUploadSuccess(false);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const downloadSelectionTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Questions");
      const listsWorksheet = workbook.addWorksheet("Lists");

      listsWorksheet.state = "veryHidden";

      const categoryValues = Array.from(
        new Set(
          templateQuestionRows
            .map((row) => row.categoryPath || row.categoryName)
            .filter(Boolean)
        )
      );
      const tagValues = Array.from(
        new Set(tags.map((tag) => tag.tagName).filter(Boolean))
      );
      const questionTypeValues = Array.from(
        new Set(templateQuestionRows.map((row) => row.questionType).filter(Boolean))
      );
      const includeValues = ["Yes", "No"];

      listsWorksheet.getCell("A1").value = "Categories";
      categoryValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 1).value = value;
      });

      listsWorksheet.getCell("B1").value = "Tags";
      tagValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 2).value = value;
      });

      listsWorksheet.getCell("C1").value = "Question Types";
      questionTypeValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 3).value = value;
      });

      listsWorksheet.getCell("D1").value = "Include";
      includeValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 4).value = value;
      });

      worksheet.addRow([
        "Sr. No.",
        "Category",
        "Tag",
        "Question Type",
        "Question",
        "Include",
        "Question ID",
      ]);

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      worksheet.columns = [
        { width: 12 },
        { width: 40 },
        { width: 24 },
        { width: 20 },
        { width: 60 },
        { width: 14 },
        { width: 18, hidden: true },
      ];

      templateQuestionRows.forEach((row) => {
        const excelRow = worksheet.addRow([
          row.serialNumber,
          row.categoryPath || row.categoryName,
          row.tagName,
          row.questionType,
          row.question,
          selectedQuestions.includes(row.questionId) ? "Yes" : "No",
          row.questionId,
        ]);

        const tagArgb = cssColorToArgb(row.tagColor);
        if (tagArgb) {
          for (let col = 1; col <= 6; col++) {
            const cell = excelRow.getCell(col);
            cell.font = {
              ...(cell.font || {}),
              color: { argb: tagArgb },
            };
          }
        }
      });

      const categoryFormula =
        categoryValues.length > 0
          ? `='Lists'!$A$2:$A$${categoryValues.length + 1}`
          : "";
      const tagFormula =
        tagValues.length > 0 ? `='Lists'!$B$2:$B$${tagValues.length + 1}` : "";
      const questionTypeFormula =
        questionTypeValues.length > 0
          ? `='Lists'!$C$2:$C$${questionTypeValues.length + 1}`
          : "";
      const includeFormula = `='Lists'!$D$2:$D$${includeValues.length + 1}`;

      for (let rowNumber = 2; rowNumber <= Math.max(templateQuestionRows.length + 1, 500); rowNumber++) {
        if (categoryFormula) {
          worksheet.getCell(rowNumber, 2).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [categoryFormula],
            showErrorMessage: true,
            errorTitle: "Invalid Category",
            error: "Please select a category from the dropdown.",
          };
        }

        if (tagFormula) {
          worksheet.getCell(rowNumber, 3).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [tagFormula],
            showErrorMessage: true,
            errorTitle: "Invalid Tag",
            error: "Please select a tag from the dropdown.",
          };
        }

        if (questionTypeFormula) {
          worksheet.getCell(rowNumber, 4).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [questionTypeFormula],
            showErrorMessage: true,
            errorTitle: "Invalid Question Type",
            error: "Please select a question type from the dropdown.",
          };
        }

        worksheet.getCell(rowNumber, 6).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [includeFormula],
          showErrorMessage: true,
          errorTitle: "Invalid Include Value",
          error: 'Please select either "Yes" or "No".',
        };
      }

      worksheet.autoFilter = {
        from: "A1",
        to: "G1",
      };
      worksheet.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Question_Selection.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating template selection Excel:", error);
      alert("Unable to create template selection Excel.");
    }
  };

  const handleTemplateExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadSuccess(false);

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Please upload an Excel (.xlsx) file.");
      event.target.value = "";
      return;
    }

    try {
      setUploadFile(file);
      setUploadErrors([]);
      setUploadRows([]);

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet("Template Questions");
      if (!worksheet) {
        alert(
          'Invalid template. Please upload the "Template_Question_Selection.xlsx" file.'
        );
        event.target.value = "";
        return;
      }

      const questionsById = new Map(
        templateQuestionRows.map((row) => [row.questionId, row])
      );
      const questionsBySerial = new Map(
        templateQuestionRows.map((row) => [String(row.serialNumber), row])
      );

      const rows: any[] = [];
      const errors: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }

        const serialNumber = row.getCell(1).value?.toString().trim() || "";
        const category = row.getCell(2).value?.toString().trim() || "";
        const tag = row.getCell(3).value?.toString().trim() || "";
        const questionType = row.getCell(4).value?.toString().trim() || "";
        const question = row.getCell(5).value?.toString().trim() || "";
        const includeValue = row.getCell(6).value?.toString().trim() || "";
        const questionId = row.getCell(7).value?.toString().trim() || "";

        const isEmpty =
          !serialNumber &&
          !category &&
          !tag &&
          !questionType &&
          !question &&
          !includeValue &&
          !questionId;

        if (isEmpty) {
          return;
        }

        const shouldInclude = includeValue.toLowerCase() === "yes";
        if (!shouldInclude) {
          return;
        }

        const matchedQuestion =
          (questionId ? questionsById.get(questionId) : undefined) ||
          (serialNumber ? questionsBySerial.get(serialNumber) : undefined);

        const rowErrors: string[] = [];

        if (!matchedQuestion) {
          rowErrors.push("Question not found in current template catalog");
        } else {
          const expectedCategory =
            matchedQuestion.categoryPath || matchedQuestion.categoryName;
          if (serialNumber && serialNumber !== String(matchedQuestion.serialNumber)) {
            rowErrors.push("Serial number does not match the question");
          }
          if (question && question !== matchedQuestion.question) {
            rowErrors.push("Question text does not match the serial number");
          }
          if (category && category !== expectedCategory) {
            rowErrors.push("Category does not match the serial number");
          }
          if (tag && tag !== matchedQuestion.tagName) {
            rowErrors.push("Tag does not match the serial number");
          }
          if (questionType && questionType !== matchedQuestion.questionType) {
            rowErrors.push("Question type does not match the serial number");
          }
        }

        const parsedRow = {
          rowNumber,
          serialNumber,
          category,
          tag,
          questionType,
          question,
          includeValue,
          questionId: matchedQuestion?.questionId || questionId,
          valid: rowErrors.length === 0,
          errors: rowErrors,
        };

        rows.push(parsedRow);

        if (rowErrors.length > 0) {
          errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`);
        }
      });

      setUploadRows(rows);
      setUploadErrors(errors);

      if (rows.length === 0) {
        alert('No rows marked as "Yes" were found in the Excel file.');
        return;
      }

      setUploadSuccess(true);
      setShowUploadModal(true);
    } catch (error) {
      console.error("Error reading template Excel file:", error);
      alert("Unable to read the Excel file. Please use the downloaded template.");
    }
  };

  const handleImportTemplateSelection = () => {
    const validRows = uploadRows.filter((row) => row.valid && row.questionId);

    if (validRows.length === 0) {
      alert("There are no valid questions to import.");
      return;
    }

    setSelectedQuestions((prev) => [
      ...new Set([...prev, ...validRows.map((row) => row.questionId)]),
    ]);

    alert(
      `${validRows.length} question${
        validRows.length === 1 ? "" : "s"
      } added to the template selection.`
    );

    resetUploadState();
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

            <div
              className="page-actions"
              style={{ display: "flex", gap: "12px", marginBottom: "18px" }}
            >
              <button
                type="button"
                className="create-btn"
                onClick={downloadSelectionTemplate}
                disabled={loadingCategories || loadingTags || templateQuestionRows.length === 0}
              >
                Download Template
              </button>
              <button
                type="button"
                className="create-btn"
                onClick={() => uploadInputRef.current?.click()}
                disabled={loadingCategories || templateQuestionRows.length === 0}
              >
                Upload Template
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: "none" }}
                onChange={handleTemplateExcelUpload}
              />
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
                  <th>Tag</th>
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
                    <td colSpan={5} className="empty-row">
                      Loading template questions...
                    </td>
                  </tr>
                ) : visibleQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {loadingCategories
                        ? "Loading categories..."
                        : "Select a category from the dropdown to view its questions"}
                    </td>
                  </tr>
                ) : (
                  visibleQuestions.map((question, index) => {
                    const tagColor = String(question.tagColor || "").trim();
                    return (
                      <tr
                        key={question.id}
                        className={tagColor ? "tag-colored-row" : undefined}
                        style={
                          tagColor
                            ? {
                                color: tagColor,
                                borderLeft: `4px solid ${tagColor}`,
                              }
                            : undefined
                        }
                      >
                        <td>{index + 1}</td>
                        <td>{question.question}</td>
                        <td>{question.categoryName}</td>
                        <td>{question.tagName || "-"}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question.id)}
                            onChange={() => toggleQuestion(question.id)}
                          />
                        </td>
                      </tr>
                    );
                  })
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

      {showUploadModal && (
        <div className="modal-overlay">
          <div
            className="modal question-modal"
            style={{
              width: "90%",
              maxWidth: "1100px",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h2>Upload Template Selection</h2>

            {uploadSuccess && (
              <div
                style={{
                  padding: "12px 16px",
                  marginBottom: "15px",
                  borderRadius: "6px",
                  backgroundColor: "#e8f7ee",
                  border: "1px solid #28a745",
                  color: "#1f7a3d",
                }}
              >
                <strong>Excel file loaded successfully</strong>
                <div style={{ marginTop: "5px", fontSize: "14px" }}>
                  {uploadFile?.name}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "30px",
                marginBottom: "20px",
              }}
            >
              <div>
                <strong>Rows Selected</strong>
                <div>{uploadRows.length}</div>
              </div>
              <div>
                <strong>Valid Rows</strong>
                <div>{uploadRows.filter((row) => row.valid).length}</div>
              </div>
              <div>
                <strong>Errors</strong>
                <div>{uploadErrors.length}</div>
              </div>
            </div>

            {uploadErrors.length > 0 && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "20px",
                  border: "1px solid #dc3545",
                  borderRadius: "6px",
                  color: "#842029",
                  backgroundColor: "#f8d7da",
                }}
              >
                <strong>Please fix the following errors:</strong>
                <ul>
                  {uploadErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "20px",
              }}
            >
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Sr. No.</th>
                  <th>Category</th>
                  <th>Tag</th>
                  <th>Question Type</th>
                  <th>Question</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploadRows.map((item, index) => (
                  <tr key={index}>
                    <td>{item.rowNumber}</td>
                    <td>{item.serialNumber}</td>
                    <td>{item.category || "-"}</td>
                    <td>{item.tag || "-"}</td>
                    <td>{item.questionType || "-"}</td>
                    <td>{item.question || "-"}</td>
                    <td>{item.valid ? "Valid" : "Invalid"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={resetUploadState}>
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={handleImportTemplateSelection}
                disabled={uploadRows.length === 0 || uploadErrors.length > 0}
              >
                Import Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
