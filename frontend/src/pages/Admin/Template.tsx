import { useState, useEffect, useMemo, useRef } from "react";
import ExcelJS from "exceljs";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CopyIconBtn,
  DeleteIconBtn,
  DownloadIconBtn,
  ViewIconBtn,
} from "../../components/AdminActionIcons";
import "../../styles/Template.css";
import { appConfirm } from "../../utils/appDialog";
import {
  ADMIN_CACHE_KEYS,
  clearAdminListCache,
  readAdminListCache,
  writeAdminListCache,
} from "../../utils/adminListCache";

type PageProps = {
  user?: any;
};

type CatalogQuestion = {
  id: string;
  question: string;
  questionNormalized: string;
  questionType: string;
  tagId: string;
  categoryId: string;
  categoryName: string;
  topCategoryName: string;
  middleCategoryName: string;
  parentCategoryName: string;
  fullPath: string;
};

const normalizeText = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[?]+$/g, "")
    .trim()
    .toLowerCase();

const normalizeAttachmentsApplicable = (value: unknown) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  return ["y", "yes", "true", "1"].includes(raw) ? "Y" : "N";
};

const normalizeTemplateType = (value: unknown): "OD" | "Pre OD" => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (
    raw === "pre od" ||
    raw === "pre-od" ||
    raw === "preod" ||
    raw === "pre_od"
  ) {
    return "Pre OD";
  }
  return "OD";
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

const cellText = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "text" in (value as any)) {
    return String((value as any).text || "").trim();
  }
  return String(value).trim();
};

const mergeTemplateLists = (odList: any[], preOdList: any[]) => {
  const od = (odList || []).map((item: any) => ({
    id: item.id,
    name: item.templateName || item.name,
    questionCount: item.questionCount,
    templateType: item.templateType || "OD",
    createdDate: item.createdDate || "",
    questionSrNos: [] as string[],
  }));

  const preOd = (preOdList || []).map((item: any) => ({
    id: item.id,
    name: item.templateName || item.name,
    questionCount: item.questionCount,
    templateType: item.templateType || "Pre OD",
    createdDate: item.createdDate || "",
    questionSrNos: (item.questionSrNos || []).map((sr: any) => String(sr)),
    questionAttachments: item.questionAttachments || {},
  }));

  return [...od, ...preOd].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    })
  );
};

export default function Template({ user }: PageProps) {
  const navigate = useNavigate();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const preOdUploadInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "OD" | "Pre OD">("OD");
  const [pageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRows, setUploadRows] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadTemplateName, setUploadTemplateName] = useState("");
  const [uploadTemplateType, setUploadTemplateType] = useState<"OD" | "Pre OD">(
    "OD"
  );
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const cachedOd = readAdminListCache<any[]>(ADMIN_CACHE_KEYS.templates);
    const cachedPreOd = readAdminListCache<any[]>(
      ADMIN_CACHE_KEYS.preOdTemplates
    );

    if (cachedOd || cachedPreOd) {
      setTemplates(
        mergeTemplateLists(cachedOd || [], cachedPreOd || [])
      );
    }
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const [odResponse, preOdResponse] = await Promise.all([
        fetch("/api/get-templates"),
        fetch("/api/get-pre-od-templates"),
      ]);
      const odData = await odResponse.json();
      const preOdData = await preOdResponse.json();

      const odList = odData.success ? odData.templates || [] : [];
      const preOdList = preOdData.success ? preOdData.templates || [] : [];

      if (odData.success) {
        writeAdminListCache(ADMIN_CACHE_KEYS.templates, odList);
      }
      if (preOdData.success) {
        writeAdminListCache(ADMIN_CACHE_KEYS.preOdTemplates, preOdList);
      }

      setTemplates(mergeTemplateLists(odList, preOdList));
    } catch (error) {
      console.error("Error loading templates", error);
    }
  };

  const filteredTemplates = useMemo(() => {
    let list =
      typeFilter === "All"
        ? templates
        : templates.filter(
            (t) => String(t.templateType || "OD") === typeFilter
          );

    if (!filter.trim()) {
      return list;
    }

    const query = filter.toLowerCase();
    return list.filter((t) => t.name.toLowerCase().includes(query));
  }, [templates, filter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTemplates.length / pageSize)
  );
  const paginatedTemplates = filteredTemplates.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const deleteTemplate = async (
    templateId: string,
    templateType: string = "OD"
  ) => {
    const confirmed = await appConfirm(
      "Are you sure you want to delete this template?"
    );
    if (!confirmed) return;

    try {
      const endpoint =
        templateType === "Pre OD"
          ? `/api/delete-pre-od-template?id=${encodeURIComponent(templateId)}`
          : `/api/delete-template?id=${encodeURIComponent(templateId)}`;

      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        setTemplates(templates.filter((item) => item.id !== templateId));
        if (templateType === "Pre OD") {
          clearAdminListCache(ADMIN_CACHE_KEYS.preOdTemplates);
        } else {
          clearAdminListCache(ADMIN_CACHE_KEYS.templates);
        }
        alert("Template deleted successfully");
      } else {
        alert(data.error || data.message || "Failed to delete template");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting template");
    }
  };

  const downloadTemplate = async (
    templateId: string,
    templateName: string,
    options?: { blank?: boolean }
  ) => {
    const isBlank = Boolean(options?.blank);

    try {
      setDownloadingId(isBlank ? "blank" : templateId);

      const [detailsResponse, tagsResponse, categoriesResponse, questionsResponse] =
        await Promise.all([
          isBlank
            ? Promise.resolve(null)
            : fetch(
                `/api/get-template-details?templateId=${encodeURIComponent(
                  templateId
                )}`
              ),
          fetch("/api/get-tags"),
          fetch("/api/get-all-categories"),
          fetch("/api/get-questions"),
        ]);

      const detailsData = detailsResponse
        ? await detailsResponse.json()
        : { success: true, template: { questions: [] } };
      const tagsData = await tagsResponse.json();
      const categoriesData = await categoriesResponse.json();
      const questionsData = await questionsResponse.json();

      if (!isBlank && (!detailsData.success || !detailsData.template)) {
        alert(detailsData.message || "Unable to load template details.");
        return;
      }

      const questions = isBlank ? [] : detailsData.template.questions || [];
      if (!isBlank && questions.length === 0) {
        alert("This template has no questions to download.");
        return;
      }

      if (!categoriesData.success) {
        alert("Unable to load categories for the Excel template.");
        return;
      }

      const allCategories = categoriesData.categories || [];
      const allTags = tagsData.success ? tagsData.data || [] : [];
      const allQuestions = questionsData.success ? questionsData.data || [] : [];

      const tagNameById = new Map(
        allTags.map((tag: any) => [
          String(tag.id || "").trim().toLowerCase(),
          tag.tagName,
        ])
      );

      const tagColorById = new Map(
        allTags.map((tag: any) => [
          String(tag.id || "").trim().toLowerCase(),
          String(tag.tagColor || "").trim(),
        ])
      );

      const questionTagById = new Map(
        allQuestions.map((item: any) => [
          String(item.id || "").trim(),
          String(item.tagId || "").trim(),
        ])
      );

      const categoryTagByQuestionId = new Map<string, string>();
      allCategories.forEach((category: any) => {
        const categoryTagId = String(category.tagId || "").trim();
        (category.questions || []).forEach((item: any) => {
          const questionId = String(item.id || "").trim();
          if (!questionId) return;
          const tagId = String(item.tagId || categoryTagId || "").trim();
          if (tagId) {
            categoryTagByQuestionId.set(questionId, tagId);
          }
        });
      });

      const resolveTagId = (question: any) => {
        const questionId = String(question.id || "").trim();
        return String(
          question.tagId ||
            questionTagById.get(questionId) ||
            categoryTagByQuestionId.get(questionId) ||
            ""
        ).trim();
      };

      const resolveTagName = (question: any) => {
        const tagId = resolveTagId(question);
        if (!tagId) return "";
        return tagNameById.get(tagId.toLowerCase()) || "";
      };

      const resolveTagColor = (question: any) => {
        const fromQuestion = String(question.tagColor || "").trim();
        if (fromQuestion) return fromQuestion;
        const tagId = resolveTagId(question);
        if (!tagId) return "";
        return tagColorById.get(tagId.toLowerCase()) || "";
      };

      const addToMapSet = (
        map: Map<string, Set<string>>,
        key: string,
        value: string
      ) => {
        if (!key || !value) return;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)?.add(value);
      };

      const middleByTop = new Map<string, Set<string>>();
      const parentByTopMiddle = new Map<string, Set<string>>();
      const categoryByPath = new Map<string, Set<string>>();

      allCategories.forEach((item: any) => {
        const top = String(item.topCategoryName || "").trim();
        const middle = String(item.middleCategoryName || "").trim();
        const parent = String(item.parentCategoryName || "").trim();
        const category = String(item.categoryName || "").trim();

        addToMapSet(middleByTop, top, middle);
        addToMapSet(parentByTopMiddle, `${top}|${middle}`, parent);
        addToMapSet(categoryByPath, `${top}|${middle}|${parent}`, category);
      });

      const topValues = Array.from(middleByTop.keys()).sort((a, b) =>
        a.localeCompare(b)
      );

      const tagValues = Array.from(
        new Set(
          allTags
            .map((tag: any) => String(tag.tagName || "").trim())
            .filter(Boolean)
        )
      ) as string[];
      tagValues.sort((a, b) => a.localeCompare(b));

      const defaultQuestionTypes = [
        "Multiple Choice",
        "Single Choice",
        "Text",
        "Rating",
      ];
      const questionTypeValues = Array.from(
        new Set([
          ...defaultQuestionTypes,
          ...allQuestions
            .map((item: any) => String(item.questionType || "").trim())
            .filter(Boolean),
        ])
      );

      const rows = questions.map((question: any) => {
        const pathParts = String(question.categoryPath || "")
          .split(">")
          .map((part: string) => part.trim())
          .filter(Boolean);

        const optionList = String(question.options || "")
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);

        return {
          topCategoryName:
            question.topCategoryName || pathParts[0] || "",
          middleCategoryName:
            question.middleCategoryName || pathParts[1] || "",
          parentCategoryName:
            question.parentCategoryName || pathParts[2] || "",
          categoryName:
            question.categoryName ||
            pathParts[3] ||
            pathParts[pathParts.length - 1] ||
            "",
          question: question.question || "",
          tagName: resolveTagName(question),
          tagColor: resolveTagColor(question),
          questionType: question.answerType || "",
          attachmentsApplicable: normalizeAttachmentsApplicable(
            question.attachmentsApplicable
          ),
          option1: optionList[0] || "",
          option2: optionList[1] || "",
          option3: optionList[2] || "",
          option4: optionList[3] || "",
          option5: optionList[4] || "",
          questionId: question.id || "",
        };
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Questions");
      const listsWorksheet = workbook.addWorksheet("Lists");
      const cascadeDataWorksheet = workbook.addWorksheet("CascadeData");
      const middleKeysWorksheet = workbook.addWorksheet("MiddleKeys");
      const parentKeysWorksheet = workbook.addWorksheet("ParentKeys");
      const categoryKeysWorksheet = workbook.addWorksheet("CategoryKeys");

      // "hidden" is safer than "veryHidden" for Excel compatibility
      listsWorksheet.state = "hidden";
      cascadeDataWorksheet.state = "hidden";
      middleKeysWorksheet.state = "hidden";
      parentKeysWorksheet.state = "hidden";
      categoryKeysWorksheet.state = "hidden";

      cascadeDataWorksheet.getCell("ZZ1").value = "";

      const writeCascadeList = (values: string[], startCol: number) => {
        const uniqueValues = Array.from(new Set(values.filter(Boolean))).sort(
          (a, b) => a.localeCompare(b)
        );
        const colValues = uniqueValues.length > 0 ? uniqueValues : [""];

        colValues.forEach((value, index) => {
          cascadeDataWorksheet.getCell(index + 1, startCol).value = value;
        });

        const colLetter = cascadeDataWorksheet.getColumn(startCol).letter;
        const endRow = Math.max(colValues.length, 1);
        // Store a direct range address (no named ranges) for INDIRECT
        return `CascadeData!$${colLetter}$1:$${colLetter}$${endRow}`;
      };

      let cascadeCol = 1;
      const emptyListAddress = "CascadeData!$ZZ$1:$ZZ$1";

      // Topmost list
      listsWorksheet.getCell("A1").value = "Topmost Categories";
      topValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 1).value = value;
      });

      // Middle lists keyed by topmost
      middleKeysWorksheet.getCell("A1").value = "Topmost";
      middleKeysWorksheet.getCell("B1").value = "RangeAddress";
      let middleKeyRow = 2;
      topValues.forEach((top) => {
        const rangeAddress = writeCascadeList(
          Array.from(middleByTop.get(top) || []),
          cascadeCol
        );
        middleKeysWorksheet.getCell(middleKeyRow, 1).value = top;
        middleKeysWorksheet.getCell(middleKeyRow, 2).value = rangeAddress;
        middleKeyRow += 1;
        cascadeCol += 1;
      });

      // Parent lists keyed by topmost + middle
      parentKeysWorksheet.getCell("A1").value = "TopMiddleKey";
      parentKeysWorksheet.getCell("B1").value = "RangeAddress";
      let parentKeyRow = 2;
      [...parentByTopMiddle.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, parents]) => {
          const rangeAddress = writeCascadeList(
            Array.from(parents),
            cascadeCol
          );
          parentKeysWorksheet.getCell(parentKeyRow, 1).value = key;
          parentKeysWorksheet.getCell(parentKeyRow, 2).value = rangeAddress;
          parentKeyRow += 1;
          cascadeCol += 1;
        });

      // Category lists keyed by topmost + middle + parent
      categoryKeysWorksheet.getCell("A1").value = "FullPathKey";
      categoryKeysWorksheet.getCell("B1").value = "RangeAddress";
      let categoryKeyRow = 2;
      [...categoryByPath.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, categories]) => {
          const rangeAddress = writeCascadeList(
            Array.from(categories),
            cascadeCol
          );
          categoryKeysWorksheet.getCell(categoryKeyRow, 1).value = key;
          categoryKeysWorksheet.getCell(categoryKeyRow, 2).value =
            rangeAddress;
          categoryKeyRow += 1;
          cascadeCol += 1;
        });

      // Independent lists
      listsWorksheet.getCell("E1").value = "Tags";
      tagValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 5).value = value;
      });

      listsWorksheet.getCell("F1").value = "Question Types";
      questionTypeValues.forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 6).value = value;
      });

      listsWorksheet.getCell("G1").value = "Attachments Applicable";
      ["Y", "N"].forEach((value, index) => {
        listsWorksheet.getCell(index + 2, 7).value = value;
      });

      worksheet.addRow([
        "Topmost category",
        "Middle Category",
        "Parent Category",
        "Category",
        "Question",
        "Tag",
        "Question type",
        "Attachments Applicable",
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4",
        "Option 5",
        "Question ID",
        "MiddleRange",
        "TopMiddleKey",
        "ParentRange",
        "FullPathKey",
        "CategoryRange",
      ]);

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      headerRow.height = 28;
      for (let col = 1; col <= 13; col++) {
        const cell = headerRow.getCell(col);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F4E79" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF9CA3AF" } },
          left: { style: "thin", color: { argb: "FF9CA3AF" } },
          bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
          right: { style: "thin", color: { argb: "FF9CA3AF" } },
        };
      }

      worksheet.columns = [
        { width: 28 },
        { width: 24 },
        { width: 36 },
        { width: 22 },
        { width: 70 },
        { width: 28 },
        { width: 18 },
        { width: 22 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18, hidden: true },
        { width: 18, hidden: true },
        { width: 18, hidden: true },
        { width: 18, hidden: true },
        { width: 18, hidden: true },
        { width: 18, hidden: true },
      ];

      const noOptionsTypes = new Set(["text", "rating"]);

      rows.forEach((row) => {
        const excelRow = worksheet.addRow([
          row.topCategoryName,
          row.middleCategoryName,
          row.parentCategoryName,
          row.categoryName,
          row.question,
          row.tagName,
          row.questionType,
          row.attachmentsApplicable || "N",
          row.option1,
          row.option2,
          row.option3,
          row.option4,
          row.option5,
          row.questionId,
        ]);

        excelRow.alignment = { vertical: "middle", wrapText: true };
        for (let col = 1; col <= 13; col++) {
          excelRow.getCell(col).border = {
            top: { style: "thin", color: { argb: "FF9CA3AF" } },
            left: { style: "thin", color: { argb: "FF9CA3AF" } },
            bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
            right: { style: "thin", color: { argb: "FF9CA3AF" } },
          };
          excelRow.getCell(col).protection = { locked: false };
        }

        // Static color only — baked in at download time for known tags.
        const tagArgb = cssColorToArgb(row.tagColor);
        if (tagArgb) {
          for (let col = 1; col <= 13; col++) {
            const cell = excelRow.getCell(col);
            cell.font = {
              ...(cell.font || {}),
              color: { argb: tagArgb },
            };
          }
        }

        if (noOptionsTypes.has(String(row.questionType || "").toLowerCase())) {
          for (let col = 9; col <= 13; col++) {
            const optionCell = excelRow.getCell(col);
            optionCell.value = "";
            optionCell.protection = { locked: true };
            optionCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE5E7EB" },
            };
          }
        }
      });

      const maxValidationRows = Math.max(rows.length + 50, 100);
      const middleKeyEnd = Math.max(middleKeyRow - 1, 2);
      const parentKeyEnd = Math.max(parentKeyRow - 1, 2);
      const categoryKeyEnd = Math.max(categoryKeyRow - 1, 2);
      const tagFormula =
        tagValues.length > 0
          ? `'Lists'!$E$2:$E$${tagValues.length + 1}`
          : "";
      const questionTypeFormula =
        questionTypeValues.length > 0
          ? `'Lists'!$F$2:$F$${questionTypeValues.length + 1}`
          : "";
      const attachmentsFormula = `'Lists'!$G$2:$G$3`;
      const topFormula =
        topValues.length > 0
          ? `'Lists'!$A$2:$A$${topValues.length + 1}`
          : "";

      for (let rowNumber = 2; rowNumber <= maxValidationRows; rowNumber++) {
        worksheet.getCell(rowNumber, 15).value = {
          formula: `IF(A${rowNumber}="","",IFERROR(VLOOKUP(A${rowNumber},MiddleKeys!$A$2:$B$${middleKeyEnd},2,FALSE),"${emptyListAddress}"))`,
        };
        worksheet.getCell(rowNumber, 16).value = {
          formula: `IF(OR(A${rowNumber}="",B${rowNumber}=""),"",A${rowNumber}&"|"&B${rowNumber})`,
        };
        worksheet.getCell(rowNumber, 17).value = {
          formula: `IF(P${rowNumber}="","",IFERROR(VLOOKUP(P${rowNumber},ParentKeys!$A$2:$B$${parentKeyEnd},2,FALSE),"${emptyListAddress}"))`,
        };
        worksheet.getCell(rowNumber, 18).value = {
          formula: `IF(OR(A${rowNumber}="",B${rowNumber}="",C${rowNumber}=""),"",A${rowNumber}&"|"&B${rowNumber}&"|"&C${rowNumber})`,
        };
        worksheet.getCell(rowNumber, 19).value = {
          formula: `IF(R${rowNumber}="","",IFERROR(VLOOKUP(R${rowNumber},CategoryKeys!$A$2:$B$${categoryKeyEnd},2,FALSE),"${emptyListAddress}"))`,
        };

        for (let col = 1; col <= 13; col++) {
          worksheet.getCell(rowNumber, col).protection = { locked: false };
        }

        if (topFormula) {
          worksheet.getCell(rowNumber, 1).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [topFormula],
            showErrorMessage: true,
            errorTitle: "Invalid Topmost category",
            error: "Please select a Topmost category from the dropdown.",
          };
        }

        worksheet.getCell(rowNumber, 2).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`INDIRECT(O${rowNumber})`],
          showErrorMessage: true,
          errorTitle: "Invalid Middle Category",
          error:
            "Please select a Middle Category that belongs to the selected Topmost category.",
        };

        worksheet.getCell(rowNumber, 3).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`INDIRECT(Q${rowNumber})`],
          showErrorMessage: true,
          errorTitle: "Invalid Parent Category",
          error:
            "Please select a Parent Category that belongs to the selected Middle Category.",
        };

        worksheet.getCell(rowNumber, 4).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`INDIRECT(S${rowNumber})`],
          showErrorMessage: true,
          errorTitle: "Invalid Category",
          error:
            "Please select a Category that belongs to the selected Parent Category.",
        };

        if (tagFormula) {
          worksheet.getCell(rowNumber, 6).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [tagFormula],
            showErrorMessage: true,
            errorTitle: "Invalid Tag",
            error: "Please select a Tag from the dropdown.",
          };
        }

        if (questionTypeFormula) {
          worksheet.getCell(rowNumber, 7).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [questionTypeFormula],
            showErrorMessage: true,
            errorTitle: "Invalid Question type",
            error: "Please select a Question type from the dropdown.",
          };
        }

        worksheet.getCell(rowNumber, 8).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [attachmentsFormula],
          showErrorMessage: true,
          errorTitle: "Invalid Attachments Applicable",
          error: "Please select Y or N.",
        };
      }

      rows.forEach((row, index) => {
        if (!noOptionsTypes.has(String(row.questionType || "").toLowerCase())) {
          return;
        }
        const rowNumber = index + 2;
        for (let col = 9; col <= 13; col++) {
          const optionCell = worksheet.getCell(rowNumber, col);
          optionCell.value = "";
          optionCell.protection = { locked: true };
          optionCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE5E7EB" },
          };
        }
      });

      await worksheet.protect("", {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: true,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
        sort: true,
        autoFilter: true,
        pivotTables: false,
      });

      worksheet.autoFilter = {
        from: "A1",
        to: "M1",
      };
      worksheet.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = String(templateName || "Template")
        .replace(/[<>:"/\\|?*]+/g, "_")
        .trim();

      link.href = url;
      link.download = isBlank
        ? "Blank_Template.xlsx"
        : `${safeName}_Template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading template:", error);
      alert(
        isBlank
          ? "Unable to download blank template."
          : "Unable to download template."
      );
    } finally {
      setDownloadingId("");
    }
  };

  const downloadBlankTemplate = async () => {
    await downloadTemplate("", "Blank Template", { blank: true });
  };

  const resetUploadState = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadRows([]);
    setUploadErrors([]);
    setUploadSuccess(false);
    setUploadTemplateName("");
    setUploadTemplateType(typeFilter === "Pre OD" ? "Pre OD" : "OD");
    setImporting(false);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    if (preOdUploadInputRef.current) {
      preOdUploadInputRef.current.value = "";
    }
  };

  const buildPreOdWorkbook = async (options?: {
    selectedSrNos?: Array<string | number>;
    questionAttachments?: Record<string, string>;
    blank?: boolean;
  }) => {
    const selected = new Set(
      (options?.selectedSrNos || []).map((item) => String(item))
    );
    const attachmentFlags = options?.questionAttachments || {};
    const isBlank = Boolean(options?.blank);

    const [bankResponse, categoriesResponse] = await Promise.all([
      fetch("/api/get-pre-od-questions"),
      fetch("/api/get-all-categories"),
    ]);
    const data = await bankResponse.json();
    const categoriesData = await categoriesResponse.json();

    if (!bankResponse.ok || !data.success) {
      throw new Error(data.message || "Unable to load Pre OD questions.");
    }

    if (!categoriesResponse.ok || !categoriesData.success) {
      throw new Error(
        categoriesData.message || "Unable to load topmost categories."
      );
    }

    const bankQuestions: Array<{
      srNo: number;
      category: string;
      question: string;
      section?: string;
    }> = data.questions || [];

    const questionsToExport = isBlank
      ? []
      : bankQuestions.filter((question) => selected.has(String(question.srNo)));

    // Topmost categories from DB (QuestionnaireTopCategory), same source as OD.
    const topmostCategories = Array.from(
      new Set(
        (categoriesData.categories || [])
          .map((item: any) => String(item.topCategoryName || "").trim())
          .filter(Boolean)
      )
    ) as string[];
    topmostCategories.sort((a, b) => a.localeCompare(b));

    const topmostSet = new Set(
      topmostCategories.map((name) => normalizeText(name))
    );

    const questionTypeValues = [
      "Multiple Choice",
      "Single Choice",
      "Text",
      "Rating",
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pre OD Questions");
    const listsWorksheet = workbook.addWorksheet("Lists");
    listsWorksheet.state = "hidden";

    listsWorksheet.getCell("A1").value = "Topmost category";
    topmostCategories.forEach((value, index) => {
      listsWorksheet.getCell(index + 2, 1).value = value;
    });

    listsWorksheet.getCell("B1").value = "Question Types";
    questionTypeValues.forEach((value, index) => {
      listsWorksheet.getCell(index + 2, 2).value = value;
    });

    listsWorksheet.getCell("C1").value = "Attachment";
    ["Y", "N"].forEach((value, index) => {
      listsWorksheet.getCell(index + 2, 3).value = value;
    });

    // Match blank template layout exactly:
    // S.No. | Questions | Topmost category | Question type | Option 1-4 | Attachment
    const visibleColCount = 9;
    worksheet.addRow([
      "S.No.",
      "Questions",
      "Topmost category",
      "Question type",
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4",
      "Attachment",
    ]);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    headerRow.height = 28;
    for (let col = 1; col <= visibleColCount; col++) {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E79" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF9CA3AF" } },
        left: { style: "thin", color: { argb: "FF9CA3AF" } },
        bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
        right: { style: "thin", color: { argb: "FF9CA3AF" } },
      };
    }

    worksheet.columns = [
      { width: 10 },
      { width: 70 },
      { width: 36 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
    ];

    const topmostFormula =
      topmostCategories.length > 0
        ? `'Lists'!$A$2:$A$${topmostCategories.length + 1}`
        : "";
    const questionTypeFormula = `'Lists'!$B$2:$B$${questionTypeValues.length + 1}`;
    const attachmentFormula = `'Lists'!$C$2:$C$3`;

    const applyRowValidations = (rowNumber: number) => {
      for (let col = 1; col <= visibleColCount; col++) {
        const cell = worksheet.getCell(rowNumber, col);
        cell.border = {
          top: { style: "thin", color: { argb: "FF9CA3AF" } },
          left: { style: "thin", color: { argb: "FF9CA3AF" } },
          bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
          right: { style: "thin", color: { argb: "FF9CA3AF" } },
        };
        cell.protection = { locked: false };
      }

      if (topmostFormula) {
        worksheet.getCell(rowNumber, 3).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [topmostFormula],
          showErrorMessage: true,
          errorTitle: "Invalid Topmost category",
          error: "Please select a Topmost category from the dropdown.",
        };
      }

      worksheet.getCell(rowNumber, 4).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [questionTypeFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Question type",
        error: "Please select a Question type from the dropdown.",
      };

      worksheet.getCell(rowNumber, 9).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [attachmentFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Attachment",
        error: "Please select Y or N.",
      };
    };

    questionsToExport.forEach((question) => {
      const attachmentFlag =
        String(attachmentFlags[String(question.srNo)] || "N").toUpperCase() ===
        "Y"
          ? "Y"
          : "N";
      const bankCategory = String(question.category || "").trim();
      const topmostCategory = topmostSet.has(normalizeText(bankCategory))
        ? bankCategory
        : "";
      const excelRow = worksheet.addRow([
        question.srNo,
        question.question,
        topmostCategory,
        "Text",
        "",
        "",
        "",
        "",
        attachmentFlag,
      ]);
      excelRow.alignment = { vertical: "middle", wrapText: true };
      applyRowValidations(excelRow.number);
    });

    // Blank (and padding rows for filled downloads): empty editable rows with dropdowns.
    const maxValidationRows = Math.max(questionsToExport.length + 50, 50);
    for (
      let rowNumber = questionsToExport.length + 2;
      rowNumber <= maxValidationRows + 1;
      rowNumber++
    ) {
      applyRowValidations(rowNumber);
    }

    await worksheet.protect("", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertColumns: false,
      insertRows: true,
      insertHyperlinks: false,
      deleteColumns: false,
      deleteRows: true,
      sort: true,
      autoFilter: true,
      pivotTables: false,
    });

    worksheet.autoFilter = { from: "A1", to: "I1" };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    return workbook;
  };

  const downloadPreOdBlankTemplate = async () => {
    try {
      setDownloadingId("pre-od-blank");
      const workbook = await buildPreOdWorkbook({ blank: true });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Blank_PreOD_Template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Unable to download Pre OD blank template.");
    } finally {
      setDownloadingId("");
    }
  };

  const downloadPreOdTemplate = async (
    templateId: string,
    templateName: string,
    questionSrNos: Array<string | number>,
    questionAttachments?: Record<string, string>
  ) => {
    try {
      setDownloadingId(templateId);
      const workbook = await buildPreOdWorkbook({
        selectedSrNos: questionSrNos,
        questionAttachments,
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = String(templateName || "PreOD_Template")
        .replace(/[<>:"/\\|?*]+/g, "_")
        .trim();
      link.href = url;
      link.download = `${safeName}_PreOD_Template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Unable to download Pre OD template.");
    } finally {
      setDownloadingId("");
    }
  };

  const handlePreOdExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Please upload an Excel (.xlsx) file.");
      event.target.value = "";
      return;
    }

    try {
      setUploadFile(file);
      setUploadErrors([]);
      setUploadRows([]);
      setUploadTemplateType("Pre OD");
      setUploadTemplateName(
        file.name
          .replace(/\.xlsx$/i, "")
          .replace(/_PreOD_Template$/i, "")
          .replace(/Blank_PreOD_Template/i, "")
          .trim() || "Pre OD Template"
      );

      const bankResponse = await fetch("/api/get-pre-od-questions");
      const bankData = await bankResponse.json();
      if (!bankResponse.ok || !bankData.success) {
        throw new Error(bankData.message || "Unable to load Pre OD questions.");
      }

      const categoriesResponse = await fetch("/api/get-all-categories");
      const categoriesData = await categoriesResponse.json();
      if (!categoriesResponse.ok || !categoriesData.success) {
        throw new Error(
          categoriesData.message || "Unable to load topmost categories."
        );
      }

      const topmostSet = new Set(
        (categoriesData.categories || [])
          .map((item: any) => normalizeText(item.topCategoryName))
          .filter(Boolean)
      );

      const bankQuestions: Array<{
        srNo: number;
        category: string;
        question: string;
      }> = bankData.questions || [];
      const bankBySrNo = new Map(
        bankQuestions.map((item) => [String(item.srNo), item])
      );
      const bankByText = new Map(
        bankQuestions.map((item) => [normalizeText(item.question), item])
      );

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet =
        workbook.getWorksheet("Pre OD Questions") || workbook.worksheets[0];

      if (!worksheet) {
        alert("Invalid Pre OD template Excel file.");
        event.target.value = "";
        return;
      }

      const rows: any[] = [];
      const errors: string[] = [];
      const seen = new Set<string>();
      const validQuestionTypes = new Set([
        "multiple choice",
        "single choice",
        "text",
        "rating",
      ]);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const srNo = cellText(row.getCell(1).value);
        const question = cellText(row.getCell(2).value);
        const topmostCategory = cellText(row.getCell(3).value);
        const questionType = cellText(row.getCell(4).value);
        const options = [5, 6, 7, 8]
          .map((col) => cellText(row.getCell(col).value))
          .filter(Boolean);
        const attachmentRaw = cellText(row.getCell(9).value);
        const attachmentsApplicable = attachmentRaw
          ? normalizeAttachmentsApplicable(attachmentRaw)
          : "N";

        if (
          !srNo &&
          !question &&
          !topmostCategory &&
          !questionType &&
          options.length === 0 &&
          !attachmentRaw
        ) {
          return;
        }

        const rowErrors: string[] = [];
        // Prefer exact bank text match. S.No. alone is not enough — wrong text + wrong
        // S.No. was mapping Attachment flags onto unrelated bank questions.
        const matchedByText = question
          ? bankByText.get(normalizeText(question))
          : undefined;
        const matchedBySrNo = srNo ? bankBySrNo.get(srNo) : undefined;
        let matched = matchedByText || undefined;

        if (matchedBySrNo && matchedByText) {
          if (String(matchedBySrNo.srNo) !== String(matchedByText.srNo)) {
            rowErrors.push(
              `S.No. ${srNo} does not match this question text in the Pre OD bank`
            );
          } else {
            matched = matchedBySrNo;
          }
        } else if (matchedBySrNo && !matchedByText) {
          rowErrors.push(
            `Question text does not match Pre OD bank S.No. ${srNo}. Use the exact bank question text (or leave S.No. blank and match by text).`
          );
          matched = undefined;
        } else if (!matchedByText && !matchedBySrNo) {
          rowErrors.push("Question is not in the Pre OD bank");
        }

        if (matched && seen.has(String(matched.srNo))) {
          rowErrors.push("Duplicate Pre OD question");
        } else if (matched) {
          seen.add(String(matched.srNo));
        }

        if (topmostCategory && !topmostSet.has(normalizeText(topmostCategory))) {
          rowErrors.push(
            `Topmost category "${topmostCategory}" does not exist`
          );
        }

        if (
          questionType &&
          !validQuestionTypes.has(questionType.toLowerCase())
        ) {
          rowErrors.push(`Question type "${questionType}" is invalid`);
        }

        if (
          attachmentRaw &&
          !["y", "n", "yes", "no"].includes(attachmentRaw.toLowerCase())
        ) {
          rowErrors.push(
            `Attachment "${attachmentRaw}" is invalid. Use Y or N.`
          );
        }

        rows.push({
          rowNumber,
          srNo: matched ? String(matched.srNo) : srNo,
          question: matched?.question || question,
          category: topmostCategory || matched?.category || "",
          questionType: questionType || "Text",
          options,
          attachmentsApplicable,
          include: true,
          valid: rowErrors.length === 0,
          errors: rowErrors,
          isNew: false,
          isExisting: true,
          templateType: "Pre OD",
        });

        if (rowErrors.length > 0) {
          errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`);
        }
      });

      if (rows.length === 0) {
        alert(
          "No Pre OD questions found. Keep only the rows you want, then upload again."
        );
        event.target.value = "";
        return;
      }

      setUploadRows(rows);
      setUploadErrors(errors);
      setUploadSuccess(true);
      setShowUploadModal(true);
    } catch (error) {
      console.error(error);
      alert("Unable to read the Pre OD Excel file.");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleTemplateExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      setUploadTemplateName(
        file.name.replace(/\.xlsx$/i, "").replace(/_Template$/i, "").trim()
      );

      const [categoriesResponse, tagsResponse, questionsResponse] =
        await Promise.all([
          fetch("/api/get-all-categories"),
          fetch("/api/get-tags"),
          fetch("/api/get-questions"),
        ]);

      const categoriesData = await categoriesResponse.json();
      const tagsData = await tagsResponse.json();
      const questionsData = await questionsResponse.json();

      if (!categoriesData.success) {
        alert("Unable to load categories from the database.");
        event.target.value = "";
        return;
      }

      const allCategories = categoriesData.categories || [];
      const allTags = tagsData.success ? tagsData.data || [] : [];
      const allQuestions = questionsData.success ? questionsData.data || [] : [];

      const tagNameById = new Map(
        allTags.map((tag: any) => [
          String(tag.id || "").trim().toLowerCase(),
          String(tag.tagName || "").trim(),
        ])
      );
      const tagIdByName = new Map(
        allTags.map((tag: any) => [
          normalizeText(tag.tagName),
          String(tag.id || "").trim(),
        ])
      );

      const catalogById = new Map<string, CatalogQuestion>();
      const catalogByText = new Map<string, CatalogQuestion[]>();

      allCategories.forEach((category: any) => {
        (category.questions || []).forEach((question: any) => {
          const questionId = String(question.id || "").trim();
          if (!questionId) return;

          const catalogItem: CatalogQuestion = {
            id: questionId,
            question: String(question.question || "").trim(),
            questionNormalized: normalizeText(question.question),
            questionType: String(question.answerType || "").trim(),
            tagId: String(question.tagId || category.tagId || "").trim(),
            categoryId: String(category.id || "").trim(),
            categoryName: String(category.categoryName || "").trim(),
            topCategoryName: String(category.topCategoryName || "").trim(),
            middleCategoryName: String(category.middleCategoryName || "").trim(),
            parentCategoryName: String(category.parentCategoryName || "").trim(),
            fullPath: String(category.fullPath || "").trim(),
          };

          catalogById.set(questionId, catalogItem);

          if (!catalogByText.has(catalogItem.questionNormalized)) {
            catalogByText.set(catalogItem.questionNormalized, []);
          }
          catalogByText.get(catalogItem.questionNormalized)?.push(catalogItem);
        });
      });

      // Include any questions not linked to a category yet.
      allQuestions.forEach((question: any) => {
        const questionId = String(question.id || "").trim();
        if (!questionId || catalogById.has(questionId)) return;

        const catalogItem: CatalogQuestion = {
          id: questionId,
          question: String(question.questionText || "").trim(),
          questionNormalized: normalizeText(question.questionText),
          questionType: String(question.questionType || "").trim(),
          tagId: String(question.tagId || "").trim(),
          categoryId: "",
          categoryName: "",
          topCategoryName: "",
          middleCategoryName: "",
          parentCategoryName: "",
          fullPath: "",
        };

        catalogById.set(questionId, catalogItem);
        if (!catalogByText.has(catalogItem.questionNormalized)) {
          catalogByText.set(catalogItem.questionNormalized, []);
        }
        catalogByText.get(catalogItem.questionNormalized)?.push(catalogItem);
      });

      const topSet = new Set(
        allCategories
          .map((item: any) => String(item.topCategoryName || "").trim())
          .filter(Boolean)
          .map((value: string) => value.toLowerCase())
      );
      const middleSet = new Set(
        allCategories
          .map((item: any) => String(item.middleCategoryName || "").trim())
          .filter(Boolean)
          .map((value: string) => value.toLowerCase())
      );
      const parentSet = new Set(
        allCategories
          .map((item: any) => String(item.parentCategoryName || "").trim())
          .filter(Boolean)
          .map((value: string) => value.toLowerCase())
      );
      const categorySet = new Set(
        allCategories
          .map((item: any) => String(item.categoryName || "").trim())
          .filter(Boolean)
          .map((value: string) => value.toLowerCase())
      );
      const tagSet = new Set(
        allTags
          .map((tag: any) => String(tag.tagName || "").trim())
          .filter(Boolean)
          .map((value: string) => value.toLowerCase())
      );
      const questionTypeSet = new Set(
        [
          "Multiple Choice",
          "Single Choice",
          "Text",
          "Rating",
          ...allQuestions.map((item: any) =>
            String(item.questionType || "").trim()
          ),
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase())
      );

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet =
        workbook.getWorksheet("Template Questions") || workbook.worksheets[0];

      if (!worksheet) {
        alert("Invalid template. Please upload a template Excel file.");
        event.target.value = "";
        return;
      }

      let detectedTemplateType: "OD" | "Pre OD" =
        typeFilter === "Pre OD" ? "Pre OD" : "OD";

      const rows: any[] = [];
      const errors: string[] = [];
      const seenInFile = new Set<string>();

      const resolveCategory = (
        top: string,
        middle: string,
        parent: string,
        category: string
      ) => {
        return (
          allCategories.find(
            (item: any) =>
              normalizeText(item.topCategoryName) === normalizeText(top) &&
              normalizeText(item.middleCategoryName) === normalizeText(middle) &&
              normalizeText(item.parentCategoryName) === normalizeText(parent) &&
              normalizeText(item.categoryName) === normalizeText(category)
          ) ||
          allCategories.find(
            (item: any) =>
              normalizeText(item.categoryName) === normalizeText(category) &&
              (!top ||
                normalizeText(item.topCategoryName) === normalizeText(top)) &&
              (!middle ||
                normalizeText(item.middleCategoryName) ===
                  normalizeText(middle)) &&
              (!parent ||
                normalizeText(item.parentCategoryName) === normalizeText(parent))
          ) ||
          null
        );
      };

      const headerRow = worksheet.getRow(1);
      let attachmentsCol = 0;
      let questionIdCol = 0;
      const optionCols: number[] = [];

      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = normalizeText(cellText(cell.value));
        if (header.includes("attachment")) {
          attachmentsCol = colNumber;
        }
        if (header === "question id" || header.includes("question id")) {
          questionIdCol = colNumber;
        }
        if (/^option\s*\d+$/.test(header)) {
          optionCols.push(colNumber);
        }
      });

      const hasAttachmentsColumn = attachmentsCol > 0;
      optionCols.sort((a, b) => a - b);

      // Legacy layout fallback when headers are the older fixed positions.
      if (!hasAttachmentsColumn && optionCols.length === 0) {
        optionCols.push(8, 9, 10, 11, 12);
        questionIdCol = questionIdCol || 13;
      } else if (hasAttachmentsColumn && optionCols.length === 0) {
        optionCols.push(9, 10, 11, 12, 13);
        questionIdCol = questionIdCol || 14;
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const topCategoryName = cellText(row.getCell(1).value);
        const middleCategoryName = cellText(row.getCell(2).value);
        const parentCategoryName = cellText(row.getCell(3).value);
        const categoryName = cellText(row.getCell(4).value);
        const question = cellText(row.getCell(5).value);
        const tagName = cellText(row.getCell(6).value);
        const questionType = cellText(row.getCell(7).value);
        const attachmentsApplicable = hasAttachmentsColumn
          ? normalizeAttachmentsApplicable(
              cellText(row.getCell(attachmentsCol).value)
            )
          : "N";
        const rowTemplateType = detectedTemplateType;
        const options = optionCols
          .map((col) => cellText(row.getCell(col).value))
          .filter(Boolean);
        const questionId = questionIdCol
          ? cellText(row.getCell(questionIdCol).value)
          : "";

        const isEmpty =
          !topCategoryName &&
          !middleCategoryName &&
          !parentCategoryName &&
          !categoryName &&
          !question &&
          !tagName &&
          !questionType &&
          options.length === 0 &&
          !questionId;

        if (isEmpty) return;

        const rowErrors: string[] = [];
        let matched: CatalogQuestion | undefined;
        let isNew = false;

        if (!question) {
          rowErrors.push("Question is required");
        }

        if (hasAttachmentsColumn) {
          const rawAttachment = cellText(row.getCell(attachmentsCol).value);
          if (
            rawAttachment &&
            !["y", "n", "yes", "no"].includes(rawAttachment.toLowerCase())
          ) {
            rowErrors.push(
              `Attachments Applicable "${rawAttachment}" is invalid. Use Y or N.`
            );
          }
        }

        const isPreOdRow = rowTemplateType === "Pre OD";

        if (!isPreOdRow) {
          if (topCategoryName && !topSet.has(topCategoryName.toLowerCase())) {
            rowErrors.push(
              `Topmost category "${topCategoryName}" does not exist`
            );
          }
          if (
            middleCategoryName &&
            !middleSet.has(middleCategoryName.toLowerCase())
          ) {
            rowErrors.push(
              `Middle Category "${middleCategoryName}" does not exist`
            );
          }
          if (
            parentCategoryName &&
            !parentSet.has(parentCategoryName.toLowerCase())
          ) {
            rowErrors.push(
              `Parent Category "${parentCategoryName}" does not exist`
            );
          }
          if (categoryName && !categorySet.has(categoryName.toLowerCase())) {
            rowErrors.push(`Category "${categoryName}" does not exist`);
          }
          if (tagName && !tagSet.has(tagName.toLowerCase())) {
            rowErrors.push(`Tag "${tagName}" does not exist`);
          }

          const typeLower = questionType.toLowerCase();
          if (typeLower === "text" || typeLower === "rating") {
            if (options.length > 0) {
              rowErrors.push(
                `${questionType} questions should not have options`
              );
            }
          } else if (
            typeLower === "multiple choice" ||
            typeLower === "single choice"
          ) {
            if (options.length < 2) {
              rowErrors.push("At least 2 options are required");
            }
          }
        }

        if (!isPreOdRow) {
          if (!questionType) {
            rowErrors.push("Question type is required");
          } else if (!questionTypeSet.has(questionType.toLowerCase())) {
            rowErrors.push(`Question type "${questionType}" is invalid`);
          }
        }

        const questionKey = normalizeText(question);
        if (questionKey && seenInFile.has(questionKey)) {
          rowErrors.push("Duplicate question in the Excel file");
        } else if (questionKey) {
          seenInFile.add(questionKey);
        }

        if (questionId) {
          matched = catalogById.get(questionId);
        }

        if (!matched && questionKey) {
          const candidates = catalogByText.get(questionKey) || [];
          matched =
            candidates.find(
              (item) =>
                (!categoryName ||
                  normalizeText(item.categoryName) ===
                    normalizeText(categoryName)) &&
                (!topCategoryName ||
                  normalizeText(item.topCategoryName) ===
                    normalizeText(topCategoryName)) &&
                (!middleCategoryName ||
                  normalizeText(item.middleCategoryName) ===
                    normalizeText(middleCategoryName)) &&
                (!parentCategoryName ||
                  normalizeText(item.parentCategoryName) ===
                    normalizeText(parentCategoryName))
            ) || candidates[0];
        }

        const resolvedCategory = resolveCategory(
          topCategoryName || matched?.topCategoryName || "",
          middleCategoryName || matched?.middleCategoryName || "",
          parentCategoryName || matched?.parentCategoryName || "",
          categoryName || matched?.categoryName || ""
        );

        if (!matched && !isPreOdRow) {
          isNew = true;
          if (!resolvedCategory?.id) {
            rowErrors.push(
              "Could not resolve category. Select a valid category hierarchy."
            );
          }
        }

        if (isPreOdRow) {
          isNew = false;
        }

        const resolvedTagName =
          tagName ||
          (matched?.tagId
            ? tagNameById.get(matched.tagId.toLowerCase()) || ""
            : "");

        const parsedRow = {
          rowNumber,
          categoryId: resolvedCategory?.id || matched?.categoryId || "",
          categoryPath:
            resolvedCategory?.fullPath || matched?.fullPath || "",
          categoryName:
            categoryName ||
            resolvedCategory?.categoryName ||
            matched?.categoryName ||
            "",
          topCategoryName:
            topCategoryName ||
            resolvedCategory?.topCategoryName ||
            matched?.topCategoryName ||
            "",
          middleCategoryName:
            middleCategoryName ||
            resolvedCategory?.middleCategoryName ||
            matched?.middleCategoryName ||
            "",
          parentCategoryName:
            parentCategoryName ||
            resolvedCategory?.parentCategoryName ||
            matched?.parentCategoryName ||
            "",
          question: question || matched?.question || "",
          tagName: resolvedTagName,
          tagId:
            tagIdByName.get(normalizeText(resolvedTagName)) ||
            matched?.tagId ||
            "",
          questionType: questionType || matched?.questionType || "",
          attachmentsApplicable,
          templateType: rowTemplateType,
          options,
          questionId: matched?.id || "",
          isNew,
          isExisting: Boolean(matched),
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
      setUploadTemplateType(detectedTemplateType);

      if (rows.length === 0) {
        alert("No questions found in the Excel file.");
        return;
      }

      setUploadTemplateType("OD");
      setUploadSuccess(true);
      setShowUploadModal(true);
    } catch (error) {
      console.error("Error reading template Excel file:", error);
      alert("Unable to read the Excel file. Please use a downloaded template.");
    }
  };

  const handleImportTemplate = async () => {
    const validRows = uploadRows.filter((row) => row.valid);

    if (validRows.length === 0) {
      alert("There are no valid questions to import.");
      return;
    }

    if (!uploadTemplateName.trim()) {
      alert("Please enter a template name.");
      return;
    }

    const duplicateName = templates.some(
      (item) =>
        normalizeText(item.name) === normalizeText(uploadTemplateName.trim())
    );
    if (duplicateName) {
      alert("A template with this name already exists. Please choose another name.");
      return;
    }

    try {
      setImporting(true);

      const createdBy = user?.email || user?.name || "Admin";

      if (uploadTemplateType === "Pre OD") {
        const matchedSrNos: string[] = [];
        const questionAttachments: Record<string, string> = {};
        for (const row of validRows) {
          const srNo = String(row.srNo || "").trim();
          if (srNo && !matchedSrNos.includes(srNo)) {
            matchedSrNos.push(srNo);
            questionAttachments[srNo] =
              String(row.attachmentsApplicable || "N").toUpperCase() === "Y"
                ? "Y"
                : "N";
          }
        }

        if (matchedSrNos.length === 0) {
          throw new Error("No valid Pre OD bank questions found in the file.");
        }

        const response = await fetch("/api/create-pre-od-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: uploadTemplateName.trim(),
            questionSrNos: matchedSrNos,
            questionAttachments,
            createdBy,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(
            data.message || data.error || "Failed to create Pre OD template."
          );
        }

        clearAdminListCache(ADMIN_CACHE_KEYS.preOdTemplates);
        clearAdminListCache(ADMIN_CACHE_KEYS.templates);
        setTypeFilter("Pre OD");
        alert(
          `Pre OD template "${uploadTemplateName.trim()}" created successfully.\n${matchedSrNos.length} question(s) included.`
        );
        await loadTemplates();
        resetUploadState();
        return;
      }

      const uniqueQuestionIds: string[] = [];
      const categoryMap = new Map<
        string,
        { id: string; name: string; path: string }
      >();
      let createdQuestionCount = 0;
      let reusedQuestionCount = 0;

      for (const row of validRows) {
        let questionId = String(row.questionId || "").trim();

        if (!questionId) {
          const createResponse = await fetch("/api/create-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionText: row.question,
              questionType: row.questionType,
              tagId: row.tagId || "",
              attachmentsApplicable: row.attachmentsApplicable || "N",
              createdBy,
            }),
          });
          const createResult = await createResponse.json();

          if (!createResponse.ok || !createResult.success) {
            throw new Error(
              createResult.message ||
                `Failed to create question for Excel row ${row.rowNumber}`
            );
          }

          questionId = String(
            createResult.data?.rowKey || createResult.data?.id || ""
          ).trim();

          if (!questionId) {
            throw new Error(
              `Question was created but no ID was returned for Excel row ${row.rowNumber}`
            );
          }

          if (
            row.options?.length > 0 &&
            (row.questionType === "Multiple Choice" ||
              row.questionType === "Single Choice")
          ) {
            const optionsResponse = await fetch("/api/create-question-options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId,
                options: row.options,
                createdBy,
              }),
            });
            const optionsResult = await optionsResponse.json();
            if (!optionsResponse.ok || !optionsResult.success) {
              throw new Error(
                optionsResult.message ||
                  `Failed to create options for Excel row ${row.rowNumber}`
              );
            }
          }

          if (row.categoryId) {
            const assignResponse = await fetch("/api/assign-category-question", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                categoryId: row.categoryId,
                questionId,
                modifiedBy: createdBy,
              }),
            });
            const assignResult = await assignResponse.json();
            // Ignore "already assigned" style failures for safety
            if (
              !assignResponse.ok &&
              !String(assignResult.message || "")
                .toLowerCase()
                .includes("already")
            ) {
              throw new Error(
                assignResult.message ||
                  `Failed to assign question to category for Excel row ${row.rowNumber}`
              );
            }
          }

          createdQuestionCount += 1;
        } else {
          reusedQuestionCount += 1;

          // Keep question fields in sync when reusing an existing question.
          await fetch("/api/update-question", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId,
              questionText: row.question,
              questionType: row.questionType,
              tagId: row.tagId || "",
              attachmentsApplicable: row.attachmentsApplicable || "N",
              modifiedBy: createdBy,
            }),
          });

          if (
            row.options?.length > 0 &&
            (row.questionType === "Multiple Choice" ||
              row.questionType === "Single Choice")
          ) {
            await fetch("/api/create-question-options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId,
                options: row.options,
                createdBy,
                replaceExisting: true,
              }),
            });
          }
        }

        if (!uniqueQuestionIds.includes(questionId)) {
          uniqueQuestionIds.push(questionId);
        }

        if (row.categoryId && !categoryMap.has(row.categoryId)) {
          categoryMap.set(row.categoryId, {
            id: row.categoryId,
            name: row.categoryName,
            path: row.categoryPath,
          });
        }
      }

      if (uniqueQuestionIds.length === 0) {
        alert("No questions available to create the template.");
        return;
      }

      if (categoryMap.size === 0) {
        alert("Could not resolve categories for the uploaded questions.");
        return;
      }

      const categories = [...categoryMap.values()];
      const response = await fetch("/api/create-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: uploadTemplateName.trim(),
          categoryIds: categories.map((item) => item.id),
          categoryNames: categories.map((item) => item.name),
          categoryPaths: categories.map((item) => item.path),
          questionIds: uniqueQuestionIds,
          createdBy,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || data.error || "Failed to create template.");
        return;
      }

      clearAdminListCache(ADMIN_CACHE_KEYS.questions);
      clearAdminListCache(ADMIN_CACHE_KEYS.templates);
      clearAdminListCache(ADMIN_CACHE_KEYS.preOdTemplates);
      setTypeFilter("OD");

      alert(
        `OD template "${uploadTemplateName.trim()}" created successfully.\n` +
          `${uniqueQuestionIds.length} unique question(s) in template` +
          (createdQuestionCount
            ? `\n${createdQuestionCount} new question(s) added to Question Management`
            : "") +
          (reusedQuestionCount
            ? `\n${reusedQuestionCount} existing question(s) reused (no duplicates)`
            : "")
      );

      await loadTemplates();
      resetUploadState();
    } catch (error) {
      console.error("Error importing template:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while importing the template."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="template-page">
      <Sidebar />

      <div className="template-content">
        <Header user={user} />

        <div className="template-body">
          <div className="breadcrumb">Template</div>

          <div className="template-page-header">
            <h1 className="page-title">Template</h1>
            <div className="template-page-actions">
              {typeFilter === "OD" && (
                <>
                  <button
                    className="create-btn"
                    type="button"
                    onClick={downloadBlankTemplate}
                    disabled={downloadingId === "blank"}
                  >
                    {downloadingId === "blank"
                      ? "Preparing..."
                      : "Download Blank Template"}
                  </button>
                  <button
                    className="create-btn"
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
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
                </>
              )}
              {typeFilter === "Pre OD" && (
                <>
                  <button
                    className="create-btn"
                    type="button"
                    onClick={downloadPreOdBlankTemplate}
                    disabled={downloadingId === "pre-od-blank"}
                  >
                    {downloadingId === "pre-od-blank"
                      ? "Preparing..."
                      : "Download Blank Template"}
                  </button>
                  <button
                    className="create-btn"
                    type="button"
                    onClick={() => preOdUploadInputRef.current?.click()}
                  >
                    Upload Template
                  </button>
                  <input
                    ref={preOdUploadInputRef}
                    type="file"
                    accept=".xlsx"
                    style={{ display: "none" }}
                    onChange={handlePreOdExcelUpload}
                  />
                </>
              )}
              {typeFilter === "OD" || typeFilter === "All" ? (
                <button
                  className="create-btn"
                  onClick={() => navigate("/create-template")}
                >
                  + Create New Template
                </button>
              ) : null}
              {typeFilter === "Pre OD" ? (
                <button
                  className="create-btn"
                  onClick={() => navigate("/create-pre-od-template")}
                >
                  + Create New Template
                </button>
              ) : null}
            </div>
          </div>

          <div className="template-card">
            <div className="filter-box template-filters">
              <Search size={18} className="filter-icon" />
              <input
                placeholder="Filter templates..."
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="template-type-select"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as "All" | "OD" | "Pre OD");
                  setPage(1);
                }}
                aria-label="Template type"
              >
                <option value="All">All</option>
                <option value="OD">OD</option>
                <option value="Pre OD">Pre OD</option>
              </select>
            </div>

            <table className="template-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Template Name</th>
                  <th>Type</th>
                  <th>Question Count</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No{" "}
                      {typeFilter === "All" ? "" : `${typeFilter} `}
                      templates found
                    </td>
                  </tr>
                ) : (
                  paginatedTemplates.map((template, index) => (
                    <tr key={`${template.templateType}-${template.id}`}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td>{template.name}</td>
                      <td>{template.templateType || "OD"}</td>
                      <td>{template.questionCount}</td>
                      <td>
                        <div className="action-icons">
                          {template.templateType !== "Pre OD" ? (
                            <>
                              <ViewIconBtn
                                onClick={() =>
                                  navigate(`/template-details/${template.id}`)
                                }
                              />
                              <CopyIconBtn
                                title="Use as new template"
                                onClick={() =>
                                  navigate(
                                    `/create-template?from=${template.id}`
                                  )
                                }
                              />
                              <DownloadIconBtn
                                title="Download OD template"
                                disabled={downloadingId === template.id}
                                onClick={() =>
                                  downloadTemplate(template.id, template.name)
                                }
                              />
                            </>
                          ) : (
                            <>
                              <ViewIconBtn
                                onClick={() =>
                                  navigate(
                                    `/pre-od-template-details/${template.id}`
                                  )
                                }
                              />
                              <CopyIconBtn
                                title="Use as new template"
                                onClick={() =>
                                  navigate(
                                    `/create-pre-od-template?from=${template.id}`
                                  )
                                }
                              />
                              <DownloadIconBtn
                                title="Download Pre OD template"
                                disabled={downloadingId === template.id}
                                onClick={() =>
                                  downloadPreOdTemplate(
                                    template.id,
                                    template.name,
                                    template.questionSrNos || [],
                                    template.questionAttachments || {}
                                  )
                                }
                              />
                            </>
                          )}
                          <DeleteIconBtn
                            onClick={() =>
                              deleteTemplate(
                                template.id,
                                template.templateType || "OD"
                              )
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="pagination">
              <span>
                Items per page: {pageSize}
              </span>
              <span>
                {filteredTemplates.length === 0
                  ? "0 of 0"
                  : `${(page - 1) * pageSize + 1} - ${Math.min(
                      page * pageSize,
                      filteredTemplates.length
                    )} of ${filteredTemplates.length}`}
              </span>
              <span>
                <button
                  className="icon-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ‹
                </button>
                <button
                  className="icon-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{ marginLeft: "8px" }}
                >
                  ›
                </button>
              </span>
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
            <h2>
              {uploadTemplateType === "Pre OD"
                ? "Upload Pre OD Template"
                : "Upload OD Template"}
            </h2>

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

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>Template Name *</label>
              <input
                value={uploadTemplateName}
                onChange={(e) => setUploadTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "30px",
                marginBottom: "20px",
              }}
            >
              <div>
                <strong>Questions Found</strong>
                <div>{uploadRows.length}</div>
              </div>
              <div>
                <strong>Valid</strong>
                <div>{uploadRows.filter((row) => row.valid).length}</div>
              </div>
              <div>
                <strong>New</strong>
                <div>
                  {uploadRows.filter((row) => row.valid && row.isNew).length}
                </div>
              </div>
              <div>
                <strong>Existing</strong>
                <div>
                  {
                    uploadRows.filter((row) => row.valid && row.isExisting)
                      .length
                  }
                </div>
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
                  {uploadTemplateType === "Pre OD" ? (
                    <>
                      <th>S.No.</th>
                      <th>Question</th>
                      <th>Q Type</th>
                      <th>Options</th>
                      <th>Topmost category</th>
                      <th>Attach</th>
                      <th>Status</th>
                    </>
                  ) : (
                    <>
                      <th>Category</th>
                      <th>Question</th>
                      <th>Tag</th>
                      <th>Q Type</th>
                      <th>Attach</th>
                      <th>Options</th>
                      <th>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {uploadRows.map((item, index) => (
                  <tr key={index}>
                    <td>{item.rowNumber}</td>
                    {uploadTemplateType === "Pre OD" ? (
                      <>
                        <td>{item.srNo || "-"}</td>
                        <td>{item.question || "-"}</td>
                        <td>{item.questionType || "-"}</td>
                        <td>
                          {item.options?.length
                            ? item.options.join(", ")
                            : "-"}
                        </td>
                        <td>{item.category || "-"}</td>
                        <td>{item.attachmentsApplicable || "N"}</td>
                        <td>{item.valid ? "Included" : "Invalid"}</td>
                      </>
                    ) : (
                      <>
                        <td>{item.categoryName || "-"}</td>
                        <td>{item.question || "-"}</td>
                        <td>{item.tagName || "-"}</td>
                        <td>{item.questionType || "-"}</td>
                        <td>{item.attachmentsApplicable || "N"}</td>
                        <td>
                          {item.options?.length
                            ? item.options.join(", ")
                            : "-"}
                        </td>
                        <td>
                          {!item.valid
                            ? "Invalid"
                            : item.isNew
                              ? "New question"
                              : "Existing (no duplicate)"}
                        </td>
                      </>
                    )}
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
                onClick={handleImportTemplate}
                disabled={
                  importing ||
                  uploadRows.length === 0 ||
                  uploadErrors.length > 0 ||
                  !uploadTemplateName.trim()
                }
              >
                {importing ? "Importing..." : "Import Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
