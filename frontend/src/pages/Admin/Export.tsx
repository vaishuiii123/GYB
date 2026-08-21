import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import * as XLSX from "xlsx";
import "../../styles/Export.css";

type PageProps = {
  user?: any;
};

type Organization = {
  id: string;
  organizationName: string;
};

type Workshop = {
  id: string;
  workshopName?: string;
  organizationId?: string;
  organizationName?: string;
  templateId?: string;
};

type ExportRow = {
  participant: string;
  organization: string;
  workshop: string;
  category: string;
  question: string;
  questionId?: string;
  questionType?: string;
  response: string;
  attachment: string;
  source: "preod" | "od";
};

type ResponseData = {
  workshop?: {
    workshopName?: string;
    organizationName?: string;
  };
  participants?: any[];
  preOdQuestions?: Array<{
    srNo: number;
    category?: string;
    question: string;
  }>;
  questionLabels?: Record<string, string>;
  questionTypes?: Record<string, string>;
};

type Category = {
  id: string;
  categoryName: string;
  fullPath?: string;
  questions?: Array<{
    id: string;
    question: string;
    answerType?: string;
  }>;
};

const PIE_COLORS = [
  "#9B304A",
  "#00A88F",
  "#2563EB",
  "#CA8A04",
  "#7C3AED",
  "#DC2626",
  "#0891B2",
  "#EA580C",
  "#4F46E5",
  "#059669",
  "#DB2777",
  "#64748B",
];

const KNOWN_CHOICE_ANSWERS = new Set([
  "yes",
  "no",
  "y",
  "n",
  "true",
  "false",
  "red",
  "yellow",
  "green",
  "r",
  "ye",
  "g",
  "agree",
  "disagree",
  "neutral",
  "na",
  "n/a",
  "not applicable",
]);

function normalizeAnswerToken(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const lower = trimmed.toLowerCase();
  if (lower === "yes" || lower === "y") return "Yes";
  if (lower === "no" || lower === "n") return "No";
  if (lower === "true") return "True";
  if (lower === "false") return "False";
  if (lower === "red" || lower === "r") return "Red";
  if (lower === "yellow") return "Yellow";
  if (lower === "green" || lower === "g") return "Green";
  if (lower === "agree") return "Agree";
  if (lower === "disagree") return "Disagree";
  if (lower === "neutral") return "Neutral";
  if (lower === "na" || lower === "n/a" || lower === "not applicable") {
    return "N/A";
  }

  return trimmed;
}

function expandAnswerTokens(response: string) {
  return String(response || "")
    .split("|")
    .map((part) => normalizeAnswerToken(part))
    .filter(Boolean);
}

/** True when values look like choice/rating answers, not free text. */
function isLikelyCategoricalForPie(values: string[]) {
  const cleaned = values
    .map((value) => normalizeAnswerToken(value))
    .filter(Boolean);

  if (cleaned.length < 2) {
    return false;
  }

  const unique = Array.from(new Set(cleaned));
  if (unique.length < 2 || unique.length > 12) {
    return false;
  }

  if (unique.some((value) => value.length > 60)) {
    return false;
  }

  const allKnown = unique.every((value) =>
    KNOWN_CHOICE_ANSWERS.has(value.toLowerCase())
  );
  if (allKnown) {
    return true;
  }

  // Short repeated options (Single / Multiple / Rating labels).
  const avgLength =
    unique.reduce((sum, value) => sum + value.length, 0) / unique.length;
  if (avgLength <= 24 && unique.length <= 8) {
    return true;
  }

  // Mostly unique long answers → free text, skip pie.
  if (unique.length >= cleaned.length * 0.85 && avgLength > 20) {
    return false;
  }

  return avgLength <= 30;
}

function isChoiceQuestionType(questionType?: string) {
  const type = String(questionType || "").trim().toLowerCase();
  return (
    type.includes("multiple") ||
    type.includes("single") ||
    type.includes("rating")
  );
}

function buildAnswerSlices(
  responses: string[],
  options?: { forceCategorical?: boolean }
) {
  const tokens = responses.flatMap((response) => expandAnswerTokens(response));
  if (tokens.length === 0) {
    return null;
  }

  if (!options?.forceCategorical && !isLikelyCategoricalForPie(tokens)) {
    return null;
  }

  // Forced choice types: need at least one answer; prefer 2+ distinct for a real pie.
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  const slices = Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (slices.length < 1) {
    return null;
  }

  // Skip free-text noise accidentally forced; keep single-slice for unanimous Yes/No.
  if (!options?.forceCategorical && slices.length < 2) {
    return null;
  }

  return slices;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function SummaryPieChart({
  title,
  slices,
}: {
  title: string;
  slices: Array<{ label: string; value: number }>;
}) {
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0 || slices.length < 1) {
    return null;
  }

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 96;
  let angle = 0;

  const arcs = slices.map((slice, index) => {
    const sweep = (slice.value / total) * 360;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;

    return {
      ...slice,
      path:
        sweep >= 359.999
          ? undefined
          : describeSlice(cx, cy, radius, startAngle, endAngle),
      fullCircle: sweep >= 359.999,
      color: PIE_COLORS[index % PIE_COLORS.length],
      percent: Math.round((slice.value / total) * 100),
    };
  });

  return (
    <div className="export-pie-panel">
      <h3 className="export-pie-title">{title}</h3>
      <div className="export-pie-layout">
        <svg
          className="export-pie-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={title}
        >
          {arcs.map((arc) =>
            arc.fullCircle ? (
              <circle
                key={arc.label}
                cx={cx}
                cy={cy}
                r={radius}
                fill={arc.color}
              />
            ) : (
              <path
                key={arc.label}
                d={arc.path}
                fill={arc.color}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            )
          )}
        </svg>
        <ul className="export-pie-legend">
          {arcs.map((arc) => (
            <li key={arc.label}>
              <span
                className="export-pie-swatch"
                style={{ background: arc.color }}
              />
              <span className="export-pie-label">{arc.label}</span>
              <span className="export-pie-meta">
                {arc.value} ({arc.percent}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Export({ user }: PageProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignedCategoryIds, setAssignedCategoryIds] =  useState<string[]>([]);
  const [exportType, setExportType] = useState<"preod" | "od">("od");

  const [selectedOrganization, setSelectedOrganization] =
    useState("");

  const [selectedWorkshop, setSelectedWorkshop] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [selectedQuestion, setSelectedQuestion] =
    useState("");

  const [responses, setResponses] =
    useState<ExportRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [loadingInitial, setLoadingInitial] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [activeView, setActiveView] =
    useState<"all" | "summary">("all");

  /*
   * --------------------------------------------------
   * Load organizations, workshops and categories
   * --------------------------------------------------
   */

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingInitial(true);

        const [
          organizationsResponse,
          workshopsResponse,
          categoriesResponse,
        ] = await Promise.all([
          fetch("/api/get-organizations"),
          fetch("/api/get-workshops"),
          fetch("/api/get-all-categories"),
        ]);

        const organizationsData =
          await organizationsResponse.json();

        const workshopsData =
          await workshopsResponse.json();

        const categoriesData =
          await categoriesResponse.json();

        if (
          organizationsResponse.ok &&
          organizationsData.success
        ) {
          setOrganizations(
            organizationsData.organizations || []
          );
        }

        if (
          workshopsResponse.ok &&
          workshopsData.success
        ) {
          setWorkshops(
            workshopsData.workshops || []
          );
        }

        if (
          categoriesResponse.ok &&
          categoriesData.success
        ) {
          setCategories(
            categoriesData.categories || []
          );
        }
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load export data."
        );
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  /*
   * --------------------------------------------------
   * Workshops for selected organization
   * --------------------------------------------------
   */

  const organizationWorkshops = useMemo(() => {
  if (!selectedOrganization) {
    return [];
  }

  const selectedOrg = organizations.find(
    (org) =>
      String(org.id) === String(selectedOrganization)
  );

  if (!selectedOrg) {
    return [];
  }

  return workshops.filter((workshop) => {
    return (
      String(workshop.organizationId || "") ===
      String(selectedOrg.id)
    );
  });
}, [
  organizations,
  workshops,
  selectedOrganization,
]);

  /*
   * --------------------------------------------------
   * Load responses for selected workshop
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!selectedWorkshop) {
      setResponses([]);
      setSelectedCategory("");
      setSelectedQuestion("");
      return;
    }

    const loadResponses = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/get-workshop-responses?workshopId=${encodeURIComponent(
            selectedWorkshop
          )}`
        );

        const data: ResponseData =
          await response.json();

        if (!response.ok) {
          throw new Error(
            "Unable to load workshop responses."
          );
        }

        const rows: ExportRow[] = [];

        /*
         * --------------------------------------------
         * Pre OD responses
         * --------------------------------------------
         */

        const preOdQuestions =
          data.preOdQuestions || [];

        (data.participants || []).forEach(
          (participant: any) => {
            const participantName =
              participant.participantName ||
              "Unknown";

            /*
             * Pre OD
             */
            if (participant.preOd) {
              preOdQuestions.forEach(
                (question) => {
                  const key = String(question.srNo);
                  const answer =
                    participant.preOd.answers?.[key] ??
                    participant.preOd.answers?.[question.srNo];
                  const attachmentMeta =
                    participant.preOd.attachments?.[key] ||
                    participant.preOd.attachments?.[question.srNo];
                  const hasAnswer =
                    answer !== undefined && String(answer).trim() !== "";
                  const hasAttachment = Boolean(attachmentMeta?.blobPath);

                  if (!hasAnswer && !hasAttachment) {
                    return;
                  }

                  const attachmentUrl = hasAttachment
                    ? `/api/get-pre-od-attachment?participantId=${encodeURIComponent(
                        participant.participantId
                      )}&workshopId=${encodeURIComponent(
                        selectedWorkshop
                      )}&questionSrNo=${encodeURIComponent(key)}`
                    : "-";

                  rows.push({
                    participant: participantName,
                    organization:
                      data.workshop?.organizationName || "",
                    workshop: data.workshop?.workshopName || "",
                    category:
                      question.category ||
                      "Pre Organization Development",
                    question: question.question,
                    response: hasAnswer ? String(answer) : "",
                    attachment: attachmentUrl,
                    source: "preod",
                  });
                }
              );
            }

            /*
             * ----------------------------------------
             * OD Chart responses
             * ----------------------------------------
             */

            if (participant.odChart) {
              Object.entries(
                participant.odChart.answers || {}
              ).forEach(
                ([questionId, answer]) => {
                  const attachmentMeta =
                    participant.odChart.attachments?.[questionId];
                  const attachmentUrl = attachmentMeta?.blobPath
                    ? `/api/get-od-attachment?participantId=${encodeURIComponent(
                        participant.participantId
                      )}&workshopId=${encodeURIComponent(
                        selectedWorkshop
                      )}&questionId=${encodeURIComponent(questionId)}`
                    : "-";

                  rows.push({
                    participant:
                      participantName,

                    organization:
                      data.workshop
                        ?.organizationName || "",

                    workshop:
                      data.workshop
                        ?.workshopName || "",

                    category:
                      getCategoryForQuestion(
                        questionId
                      ),

                    question:
                      data.questionLabels?.[
                        questionId
                      ] || questionId,

                    questionId,
                    questionType:
                      data.questionTypes?.[questionId] ||
                      getQuestionTypeForQuestion(
                        questionId
                      ),

                    response:
                      String(answer || ""),

                    attachment: attachmentUrl,
                    source: "od",
                  });
                }
              );
            }

            /*
             * ----------------------------------------
             * Vision & Mission (OD workshop module)
             * ----------------------------------------
             */

            if (
              participant.visionMission
            ) {
              const vm =
                participant.visionMission;

              if (vm.visionText) {
                rows.push({
                  participant:
                    participantName,

                  organization:
                    data.workshop
                      ?.organizationName || "",

                  workshop:
                    data.workshop
                      ?.workshopName || "",

                  category:
                    "Vision & Mission",

                  question:
                    "Vision",

                  response:
                    vm.visionText,

                  attachment: "-",
                  source: "od",
                });
              }

              if (vm.missionText) {
                rows.push({
                  participant:
                    participantName,

                  organization:
                    data.workshop
                      ?.organizationName || "",

                  workshop:
                    data.workshop
                      ?.workshopName || "",

                  category:
                    "Vision & Mission",

                  question:
                    "Mission",

                  response:
                    vm.missionText,

                  attachment: "-",
                  source: "od",
                });
              }
            }

          }
        );

        setResponses(rows);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load workshop responses."
        );

        setResponses([]);
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [selectedWorkshop, categories]);

  /*
   * --------------------------------------------------
   * Find category for OD question
   * --------------------------------------------------
   */

  const getCategoryForQuestion = (
    questionId: string
  ) => {
    for (const category of categories) {
      if (
        category.questions?.some(
          (question) =>
            String(question.id) ===
            String(questionId)
        )
      ) {
        return (
          category.fullPath ||
          category.categoryName ||
          "Category"
        );
      }
    }

    return "OD Chart";
  };

  const getQuestionTypeForQuestion = (
    questionId: string
  ) => {
    for (const category of categories) {
      const match = category.questions?.find(
        (question) =>
          String(question.id) === String(questionId)
      );
      if (match?.answerType) {
        return String(match.answerType);
      }
    }
    return "";
  };

  /*
   * --------------------------------------------------
   * Available categories
   * --------------------------------------------------
   */

const availableCategories = useMemo(() => {
  if (!selectedWorkshop) {
    return [];
  }

  // Pre-OD: categories come from Pre OD bank questions in the loaded rows.
  if (exportType === "preod") {
    const names = Array.from(
      new Set(
        responses
          .filter((item) => item.source === "preod")
          .map((item) => String(item.category || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return names.map((name) => ({
      id: name,
      name,
    }));
  }

  if (assignedCategoryIds.length === 0) {
    return [];
  }

  return categories
    .filter((category) =>
      assignedCategoryIds.includes(
        String(category.id)
      )
    )
    .map((category) => {
      const fullPath =
        category.fullPath ||
        category.categoryName ||
        "";

      const displayName =
        fullPath
          .split(">")
          .pop()
          ?.trim() || "";

      return {
        id: category.id,
        name: displayName,
      };
    })
    .filter((category) => category.name)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}, [
  categories,
  assignedCategoryIds,
  selectedWorkshop,
  exportType,
  responses,
]);

  /*
   * --------------------------------------------------
   * Available questions
   * --------------------------------------------------
   */
const availableQuestions = useMemo(() => {
  if (!selectedCategory) {
    return [];
  }

  if (exportType === "preod") {
    return Array.from(
      new Set(
        responses
          .filter(
            (item) =>
              item.source === "preod" &&
              item.category === selectedCategory
          )
          .map((item) => item.question)
          .filter(Boolean)
      )
    ).sort();
  }

  const selectedCategoryData =
    categories.find(
      (category) =>
        String(category.id) ===
        String(selectedCategory)
    );

  if (
    !selectedCategoryData ||
    !selectedCategoryData.questions
  ) {
    return [];
  }

  return selectedCategoryData.questions
    .map(
      (question) =>
        question.question
    )
    .filter(Boolean)
    .sort();
}, [
  categories,
  selectedCategory,
  exportType,
  responses,
]);

  /*
   * --------------------------------------------------
   * Filtered table data
   * --------------------------------------------------
   */

  const filteredResponses = useMemo(() => {
    let data = responses.filter(
      (item) => item.source === exportType
    );

   if (selectedCategory) {
  if (exportType === "preod") {
    data = data.filter(
      (item) => item.category === selectedCategory
    );
  } else {
  const selectedCategoryData =
    categories.find(
      (category) =>
        category.id ===
        selectedCategory
    );

  const selectedCategoryName =
    selectedCategoryData?.categoryName ||
    availableCategories.find(
      (item) => item.id === selectedCategory
    )?.name ||
    "";

  data = data.filter((item) => {
    const lastCategory =
      (item.category || "")
        .split(">")
        .pop()
        ?.trim() || "";

    return (
      lastCategory ===
      selectedCategoryName
    );
  });
  }
}

    if (selectedQuestion) {
      data = data.filter(
        (item) =>
          item.question ===
          selectedQuestion
      );
    }

    if (search.trim()) {
      const searchValue =
        search.toLowerCase();

      data = data.filter((item) =>
        [
          item.participant,
          item.organization,
          item.workshop,
          item.category,
          item.question,
          item.response,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchValue)
      );
    }

    return data;
  }, [
    responses,
    exportType,
    selectedCategory,
    selectedQuestion,
    search,
    categories,
    availableCategories,
  ]);

  /*
   * --------------------------------------------------
   * Reset dependent dropdowns
   * --------------------------------------------------
   */

  const handleOrganizationChange = (
    value: string
  ) => {
    setSelectedOrganization(value);
    setSelectedWorkshop("");
    setSelectedCategory("");
    setSelectedQuestion("");
    setResponses([]);
  };

 const handleWorkshopChange = async (
  workshopId: string
) => {
  setSelectedWorkshop(workshopId);

  // Reset dependent dropdowns
  setSelectedCategory("");
  setSelectedQuestion("");
  setAssignedCategoryIds([]);
  setResponses([]);

  if (!workshopId) {
    return;
  }

  const workshop = organizationWorkshops.find(
    (item) =>
      String(item.id) === String(workshopId)
  );

  if (!workshop) {
    console.warn(
      "Selected workshop was not found."
    );
    return;
  }

  if (!workshop.templateId) {
    console.warn(
      "Selected workshop does not have a template."
    );
    return;
  }

  try {
    const response = await fetch(
      `/api/get-template-details?templateId=${encodeURIComponent(
        workshop.templateId
      )}`
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.template
    ) {
      console.error(
        "Could not load template details"
      );
      return;
    }

    const categoryIds = (
      data.template.categoryIds || []
    )
      .map((id: string) =>
        String(id).trim()
      )
      .filter(Boolean);

    setAssignedCategoryIds(categoryIds);

  } catch (error) {
    console.error(
      "Error loading workshop categories:",
      error
    );

    setAssignedCategoryIds([]);
  }
};

  const handleCategoryChange = (
    value: string
  ) => {
    setSelectedCategory(value);
    setSelectedQuestion("");
  };

  /*
   * --------------------------------------------------
   * Excel export
   * --------------------------------------------------
   */

  const handleExportExcel = () => {
    if (
      filteredResponses.length === 0
    ) {
      return;
    }

    const worksheet =
      XLSX.utils.json_to_sheet(
        filteredResponses.map(
          (item) => ({
            Participant:
              item.participant,

            Organization:
              item.organization,

            Workshop:
              item.workshop,

            Category:
              item.category,

            Question:
              item.question,

            Response:
              item.response,

            Attachment:
              item.attachment,
          })
        )
      );

    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 35 },
      { wch: 50 },
      { wch: 40 },
      { wch: 20 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "All Responses"
    );

    const workshopName =
      organizationWorkshops.find(
        (item) =>
          item.id === selectedWorkshop
      )?.workshopName ||
      "Workshop";

    XLSX.writeFile(
      workbook,
      `${workshopName}_Export.xlsx`
    );
  };

  /*
   * --------------------------------------------------
   * Summary
   * --------------------------------------------------
   */

  const summary = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    filteredResponses.forEach(
      (item) => {
        map.set(
          item.category,
          (map.get(item.category) || 0) +
            1
        );
      }
    );

    return Array.from(
      map.entries()
    ).map(
      ([category, count]) => ({
        category,
        count,
      })
    );
  }, [filteredResponses]);

  /** Answer pies for Multiple/Single Choice & Rating across all participants. */
  const answerPieCharts = useMemo(() => {
    const byQuestion = new Map<
      string,
      { questionType: string; responses: string[] }
    >();

    filteredResponses.forEach((item) => {
      const question = String(item.question || "").trim();
      if (!question) {
        return;
      }
      if (selectedQuestion && question !== selectedQuestion) {
        return;
      }
      if (!String(item.response || "").trim()) {
        return;
      }

      const existing = byQuestion.get(question) || {
        questionType: item.questionType || "",
        responses: [],
      };
      if (!existing.questionType && item.questionType) {
        existing.questionType = item.questionType;
      }
      existing.responses.push(String(item.response || ""));
      byQuestion.set(question, existing);
    });

    const charts: Array<{
      title: string;
      slices: Array<{ label: string; value: number }>;
    }> = [];

    byQuestion.forEach((entry, question) => {
      const forceCategorical = isChoiceQuestionType(entry.questionType);
      // Only chart real choice questions (or clearly categorical answers).
      if (!forceCategorical && !isLikelyCategoricalForPie(
        entry.responses.flatMap((r) => expandAnswerTokens(r))
      )) {
        return;
      }

      const slices = buildAnswerSlices(entry.responses, {
        forceCategorical,
      });
      if (!slices || slices.length < 1) {
        return;
      }
      // Need at least 2 slices OR a forced choice type with answers.
      if (slices.length < 2 && !forceCategorical) {
        return;
      }
      charts.push({ title: question, slices });
    });

    return charts;
  }, [filteredResponses, selectedQuestion]);

   return (
  <div className="export-page">
    <Header user={user} />
    <Sidebar />

    <main className="export-content">

      {/* =========================================
          PAGE TITLE
      ========================================= */}
      <h1 className="export-title">
        Export
      </h1>


      {/* =========================================
          PRE-OD / OD
      ========================================= */}
      <div className="export-type-selector">

        <label className="export-radio">
          <input
            type="radio"
            name="exportType"
            value="preod"
            checked={exportType === "preod"}
            onChange={() => {
              setExportType("preod");
              setSelectedCategory("");
              setSelectedQuestion("");
            }}
          />

          <span>Pre-OD</span>
        </label>


        <label className="export-radio">
          <input
            type="radio"
            name="exportType"
            value="od"
            checked={exportType === "od"}
            onChange={() => {
              setExportType("od");
              setSelectedCategory("");
              setSelectedQuestion("");
            }}
          />

          <span>OD</span>
        </label>

      </div>


      {/* =========================================
          FILTERS
      ========================================= */}
      <div className="export-filters">


        {/* =====================================
            ORGANIZATION
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Organization
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              🏢
            </span>

            <select
              value={selectedOrganization}
              onChange={(e) =>
                handleOrganizationChange(
                  e.target.value
                )
              }
            >

              <option value="">
                Select Organization
              </option>

              {organizations.map(
                (organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.organizationName}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* =====================================
            WORKSHOP
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Workshop
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              📅
            </span>

            <select
              value={selectedWorkshop}
              onChange={(e) =>
                handleWorkshopChange(
                  e.target.value
                )
              }
              disabled={!selectedOrganization}
            >

              <option value="">
                Select Workshop
              </option>

              {organizationWorkshops.map(
                (workshop) => (
                  <option
                    key={workshop.id}
                    value={workshop.id}
                  >
                    {workshop.workshopName}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* =====================================
            CATEGORY
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Category
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              📁
            </span>

            <select
              value={selectedCategory}
              onChange={(e) =>
                handleCategoryChange(
                  e.target.value
                )
              }
              disabled={!selectedWorkshop}
            >

              <option value="">
                Select Category
              </option>

              {availableCategories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* =====================================
            QUESTION
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Question
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              ❓
            </span>

            <select
              value={selectedQuestion}
              onChange={(e) =>
                setSelectedQuestion(
                  e.target.value
                )
              }
              disabled={!selectedCategory}
            >

              <option value="">
                Select Question
              </option>

              {availableQuestions.map(
                (question, index) => (
                  <option
                    key={`${question}-${index}`}
                    value={question}
                  >
                    {question}
                  </option>
                )
              )}

            </select>

          </div>

        </div>

      </div>


      {/* =========================================
          TABS + SEARCH + EXCEL
      ========================================= */}
      <div className="export-toolbar">


        {/* =====================================
            TABS
        ===================================== */}
        <div className="export-tabs">

          <button
            type="button"
            className={
              activeView === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView("all")
            }
          >
            All Responses
          </button>


          <button
            type="button"
            className={
              activeView === "summary"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView("summary")
            }
          >
            Summary View
          </button>

        </div>


        {/* =====================================
            SEARCH + EXCEL
        ===================================== */}
        <div className="export-actions">

          <div className="export-search-wrapper">

            <span className="export-search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search by Keyword or type..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>


          <button
            type="button"
            className="export-excel-button"
            onClick={handleExportExcel}
            disabled={
              filteredResponses.length === 0
            }
            title="Export to Excel"
          >
            📊
          </button>

        </div>

      </div>


      {/* =========================================
          LOADING / ERROR
      ========================================= */}
      {loadingInitial || loading ? (

        <div className="export-message">
          Loading...
        </div>

      ) : error ? (

        <div className="export-message error">
          {error}
        </div>

      ) : activeView === "summary" ? (


        /* =========================================
           SUMMARY VIEW
        ========================================= */
        <section className="export-table-card">

          {answerPieCharts.length > 0 ? (
            <div className="export-pie-list">
              {answerPieCharts.map((chart) => (
                <SummaryPieChart
                  key={chart.title}
                  title={chart.title}
                  slices={chart.slices}
                />
              ))}
            </div>
          ) : null}

          <table className="export-table">

            <thead>

              <tr>

                <th>
                  Category
                </th>

                <th>
                  Responses
                </th>

              </tr>

            </thead>


            <tbody>

              {summary.length === 0 ? (

                <tr>

                  <td colSpan={2}>
                    No data
                  </td>

                </tr>

              ) : (

                summary.map((item) => (

                  <tr
                    key={item.category}
                  >

                    <td>
                      {item.category
                        ?.split(">")
                        .pop()
                        ?.trim() || "-"}
                    </td>

                    <td>
                      {item.count}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </section>


      ) : (


        /* =========================================
           ALL RESPONSES VIEW
        ========================================= */
        <section className="export-table-card">

          <div className="export-table-scroll">

            <table className="export-table">

              <thead>

                <tr>

                  <th>
                    Participant
                  </th>

                  <th>
                    Organization
                  </th>

                  <th>
                    Workshop
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Question
                  </th>

                  <th>
                    Response
                  </th>

                  <th>
                    Attachment
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredResponses.length === 0 ? (

                  <tr>

                    <td colSpan={7}>
                      No responses found.
                    </td>

                  </tr>

                ) : (

                  filteredResponses.map(
                    (item, index) => (

                      <tr
                        key={`${item.participant}-${item.question}-${index}`}
                      >

                        {/* PARTICIPANT */}
                        <td>
                          {item.participant}
                        </td>


                        {/* ORGANIZATION */}
                        <td>
                          {item.organization}
                        </td>


                        {/* WORKSHOP */}
                        <td>
                          {item.workshop}
                        </td>


                        {/* CATEGORY */}
                        <td>
                          {item.category
                            ?.split(">")
                            .pop()
                            ?.trim() || "-"}
                        </td>


                        {/* QUESTION */}
                        <td>
                          {item.question}
                        </td>


                        {/* RESPONSE */}
                        <td>

                          {item.response ? (

                            <span className="export-response-pill">

                              <span className="export-response-check">
                                ✓
                              </span>

                              <span>
                                {item.response}
                              </span>

                            </span>

                          ) : (

                            <span>
                              -
                            </span>

                          )}

                        </td>


                        {/* ATTACHMENT */}
                        <td>

                          {item.attachment &&
                          item.attachment !== "-" ? (

                            <button
                              type="button"
                              className="export-attachment-button"
                              title="Download attachment"
                              onClick={() => {
                                if (
                                  item.attachment &&
                                  item.attachment !== "-"
                                ) {
                                  window.open(item.attachment, "_blank");
                                }
                              }}
                            >
                              ↓
                            </button>

                          ) : (

                            <span className="export-no-attachment">
                              -
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>

      )}

    </main>

  </div>
);
}