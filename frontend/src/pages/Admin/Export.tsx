import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import SearchableSelect from "../../components/SearchableSelect";
import AddActionableModal, {
  type AddActionablePreset,
} from "../../components/AddActionableModal";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  Building2,
  CalendarDays,
  ClipboardPlus,
  Eye,
  Folder,
  HelpCircle,
  LineChart,
  List,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
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
  participantId?: string;
  organization: string;
  organizationId?: string;
  workshop: string;
  workshopId?: string;
  category: string;
  categoryId?: string;
  categoryPath?: string;
  question: string;
  questionId?: string;
  questionType?: string;
  response: string;
  attachment: string;
  attachmentFileName?: string;
  source: "preod" | "od";
};

type VisionMissionRow = {
  participant: string;
  organization: string;
  workshop: string;
  visionText: string;
  missionText: string;
  visionKeywords: string[];
  missionKeywords: string[];
  submittedDate?: string;
};

type ActionableRow = {
  participant: string;
  organization: string;
  workshop: string;
  categoryName: string;
  categoryPath: string;
  description: string;
  timeline: string;
  responsiblePersons: string;
  comments: string;
};

function safeZipSegment(value: string, fallback = "item", maxLen = 80) {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

function categoryLeafName(category: string) {
  const parts = String(category || "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || category || "Category";
}

function uniqueZipPath(
  usedPaths: Set<string>,
  folderPath: string,
  fileName: string
) {
  let unique = `${folderPath}/${fileName}`;
  let suffix = 2;
  while (usedPaths.has(unique.toLowerCase())) {
    const dot = fileName.lastIndexOf(".");
    const base = dot > 0 ? fileName.slice(0, dot) : fileName;
    const ext = dot > 0 ? fileName.slice(dot) : "";
    unique = `${folderPath}/${base}_${suffix}${ext}`;
    suffix += 1;
  }
  usedPaths.add(unique.toLowerCase());
  return unique;
}

type ResponseData = {
  workshop?: {
    workshopName?: string;
    organizationName?: string;
    organizationId?: string;
    id?: string;
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

/** Single-hue blue family — darker → lighter by slice index. */
function shadeOfBase(index: number, total: number) {
  const steps = Math.max(total, 1);
  // Lightness from ~32% (dark) to ~78% (light)
  const t = steps === 1 ? 0.45 : index / Math.max(steps - 1, 1);
  const lightness = Math.round(32 + t * 46);
  return `hsl(210, 78%, ${lightness}%)`;
}

/** Yes → chart green, No → chart red (reference pie palette); other answers = blue shades. */
function colorForPieSlice(label: string, index: number, total: number) {
  const lower = String(label || "")
    .trim()
    .toLowerCase();

  if (
    lower === "yes" ||
    lower === "y" ||
    lower === "true" ||
    lower === "agree"
  ) {
    return "#00A651";
  }

  if (
    lower === "no" ||
    lower === "n" ||
    lower === "false" ||
    lower === "disagree"
  ) {
    return "#ED1C24";
  }

  return shadeOfBase(index, total);
}

type PieSlice = {
  label: string;
  value: number;
  participants: string[];
};

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
  if (!type || type.includes("text")) {
    return false;
  }
  return (
    type.includes("multiple") ||
    type.includes("single") ||
    type.includes("rating")
  );
}

function buildAnswerSlices(
  rows: Array<{ response: string; participant?: string }>,
  options?: { forceCategorical?: boolean }
): PieSlice[] | null {
  const responses = rows.map((row) => row.response);
  const tokens = responses.flatMap((response) => expandAnswerTokens(response));
  if (tokens.length === 0) {
    return null;
  }

  if (!options?.forceCategorical && !isLikelyCategoricalForPie(tokens)) {
    return null;
  }

  const counts = new Map<string, number>();
  const people = new Map<string, string[]>();

  rows.forEach((row) => {
    const name = String(row.participant || "").trim() || "Unknown";
    expandAnswerTokens(row.response).forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
      const list = people.get(token) || [];
      if (!list.includes(name)) {
        list.push(name);
      }
      people.set(token, list);
    });
  });

  const slices = Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      value,
      participants: (people.get(label) || []).sort((a, b) =>
        a.localeCompare(b)
      ),
    }))
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
  slices: PieSlice[];
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
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
      color: colorForPieSlice(slice.label, index, slices.length),
      percent: Math.round((slice.value / total) * 100),
    };
  });

  const hovered = arcs.find((arc) => arc.label === hoveredLabel) || null;

  return (
    <div className="export-pie-panel">
      <h3 className="export-pie-title">{title}</h3>
      <div className="export-pie-layout">
        <div className="export-pie-chart-wrap">
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
                  className="export-pie-slice"
                  onMouseEnter={() => setHoveredLabel(arc.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                />
              ) : (
                <path
                  key={arc.label}
                  d={arc.path}
                  fill={arc.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="export-pie-slice"
                  onMouseEnter={() => setHoveredLabel(arc.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                />
              )
            )}
          </svg>

          {hovered ? (
            <div className="export-pie-tooltip" role="status">
              <p className="export-pie-tooltip-title">
                {hovered.label}{" "}
                <span>
                  {hovered.value} ({hovered.percent}%)
                </span>
              </p>
              {hovered.participants.length === 0 ? (
                <p className="export-pie-tooltip-empty">No participants</p>
              ) : (
                <ul className="export-pie-tooltip-list">
                  {hovered.participants.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <ul className="export-pie-legend">
          {arcs.map((arc) => (
            <li
              key={arc.label}
              className={
                hoveredLabel === arc.label ? "is-hovered" : undefined
              }
              onMouseEnter={() => setHoveredLabel(arc.label)}
              onMouseLeave={() => setHoveredLabel(null)}
            >
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

  const [visionMissionRows, setVisionMissionRows] = useState<
    VisionMissionRow[]
  >([]);

  const [actionableRows, setActionableRows] = useState<ActionableRow[]>(
    []
  );

  const [loading, setLoading] =
    useState(false);

  const [loadingInitial, setLoadingInitial] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [activeView, setActiveView] =
    useState<"all" | "summary" | "vision" | "actionable">("all");

  const [exportingZip, setExportingZip] = useState(false);
  const [actionablePreset, setActionablePreset] =
    useState<AddActionablePreset | null>(null);

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
      setVisionMissionRows([]);
      setActionableRows([]);
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
        const visionRows: VisionMissionRow[] = [];
        const actionableList: ActionableRow[] = [];

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
            const organizationName =
              data.workshop?.organizationName || "";
            const workshopName =
              data.workshop?.workshopName || "";
            const organizationId =
              data.workshop?.organizationId ||
              organizationWorkshops.find(
                (item) => item.id === selectedWorkshop
              )?.organizationId ||
              "";
            const workshopId = selectedWorkshop;

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
                    organization: organizationName,
                    workshop: workshopName,
                    category:
                      question.category ||
                      "Pre-Organizational Development",
                    question: question.question,
                    response: hasAnswer ? String(answer) : "",
                    attachment: attachmentUrl,
                    attachmentFileName: hasAttachment
                      ? String(attachmentMeta?.fileName || "attachment")
                      : undefined,
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
                  const categoryMeta = getCategoryMetaForQuestion(questionId);

                  rows.push({
                    participant: participantName,
                    participantId: String(participant.participantId || ""),
                    organization: organizationName,
                    organizationId,
                    workshop: workshopName,
                    workshopId,
                    category: categoryMeta.path,
                    categoryId: categoryMeta.id,
                    categoryPath: categoryMeta.path,
                    question:
                      data.questionLabels?.[questionId] || questionId,
                    questionId,
                    questionType:
                      data.questionTypes?.[questionId] ||
                      getQuestionTypeForQuestion(questionId),
                    response: String(answer || ""),
                    attachment: attachmentUrl,
                    attachmentFileName: attachmentMeta?.blobPath
                      ? String(attachmentMeta?.fileName || "attachment")
                      : undefined,
                    source: "od",
                  });
                }
              );

              // Include OD attachments that exist without a text answer.
              Object.entries(
                participant.odChart.attachments || {}
              ).forEach(([questionId, attachmentMeta]: [string, any]) => {
                if (
                  !attachmentMeta?.blobPath ||
                  participant.odChart.answers?.[questionId] !== undefined
                ) {
                  return;
                }

                const categoryMeta = getCategoryMetaForQuestion(questionId);

                rows.push({
                  participant: participantName,
                  participantId: String(participant.participantId || ""),
                  organization: organizationName,
                  organizationId,
                  workshop: workshopName,
                  workshopId,
                  category: getCategoryForQuestion(questionId),
                  categoryId: categoryMeta.id,
                  categoryPath: categoryMeta.path,
                  question:
                    data.questionLabels?.[questionId] || questionId,
                  questionId,
                  questionType:
                    data.questionTypes?.[questionId] ||
                    getQuestionTypeForQuestion(questionId),
                  response: "",
                  attachment: `/api/get-od-attachment?participantId=${encodeURIComponent(
                    participant.participantId
                  )}&workshopId=${encodeURIComponent(
                    selectedWorkshop
                  )}&questionId=${encodeURIComponent(questionId)}`,
                  attachmentFileName: String(
                    attachmentMeta?.fileName || "attachment"
                  ),
                  source: "od",
                });
              });
            }

            /*
             * ----------------------------------------
             * Vision & Mission (OD workshop module)
             * ----------------------------------------
             */

            if (participant.visionMission) {
              const vm = participant.visionMission;
              const visionText = String(vm.visionText || "").trim();
              const missionText = String(vm.missionText || "").trim();
              const visionKeywords = Array.isArray(vm.visionKeywords)
                ? vm.visionKeywords.map(String)
                : [];
              const missionKeywords = Array.isArray(vm.missionKeywords)
                ? vm.missionKeywords.map(String)
                : [];

              if (visionText || missionText) {
                visionRows.push({
                  participant: participantName,
                  organization: organizationName,
                  workshop: workshopName,
                  visionText,
                  missionText,
                  visionKeywords,
                  missionKeywords,
                  submittedDate: vm.submittedDate || "",
                });
              }

              const visionResponse =
                visionKeywords.length > 0
                  ? visionKeywords.join(", ")
                  : visionText;
              const missionResponse =
                missionKeywords.length > 0
                  ? missionKeywords.join(", ")
                  : missionText;

              if (visionResponse) {
                rows.push({
                  participant: participantName,
                  organization: organizationName,
                  workshop: workshopName,
                  category: "Vision & Mission",
                  question: "Vision",
                  response: visionResponse,
                  attachment: "-",
                  source: "od",
                });
              }

              if (missionResponse) {
                rows.push({
                  participant: participantName,
                  organization: organizationName,
                  workshop: workshopName,
                  category: "Vision & Mission",
                  question: "Mission",
                  response: missionResponse,
                  attachment: "-",
                  source: "od",
                });
              }
            }

            /*
             * ----------------------------------------
             * Actionables
             * ----------------------------------------
             */

            (participant.actionables || []).forEach((item: any) => {
              actionableList.push({
                participant: participantName,
                organization: organizationName,
                workshop: workshopName,
                categoryName: String(item.categoryName || ""),
                categoryPath: String(item.categoryPath || ""),
                description: String(item.description || ""),
                timeline: String(item.timeline || ""),
                responsiblePersons: String(item.responsiblePersons || ""),
                comments: String(item.comments || ""),
              });
            });
          }
        );

        setResponses(rows);
        setVisionMissionRows(visionRows);
        setActionableRows(actionableList);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load workshop responses."
        );

        setResponses([]);
        setVisionMissionRows([]);
        setActionableRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [selectedWorkshop, categories, organizationWorkshops]);

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

  const getCategoryMetaForQuestion = (questionId: string) => {
    for (const category of categories) {
      if (
        category.questions?.some(
          (question) => String(question.id) === String(questionId)
        )
      ) {
        return {
          id: String(category.id || ""),
          name: String(category.categoryName || ""),
          path:
            category.fullPath ||
            category.categoryName ||
            "Category",
        };
      }
    }
    return { id: "", name: "", path: "OD Chart" };
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
  if (!selectedWorkshop) {
    return [];
  }

  if (exportType === "preod") {
    const rows = responses.filter((item) => item.source === "preod");
    const scoped = selectedCategory
      ? rows.filter((item) => item.category === selectedCategory)
      : rows;

    return Array.from(
      new Set(scoped.map((item) => item.question).filter(Boolean))
    ).sort();
  }

  const scopedCategories = categories.filter((category) => {
    if (
      assignedCategoryIds.length > 0 &&
      !assignedCategoryIds.includes(String(category.id))
    ) {
      return false;
    }
    if (selectedCategory) {
      return String(category.id) === String(selectedCategory);
    }
    return true;
  });

  return Array.from(
    new Set(
      scopedCategories.flatMap((category) =>
        (category.questions || [])
          .map((question) => question.question)
          .filter(Boolean)
      )
    )
  ).sort();
}, [
  categories,
  selectedCategory,
  selectedWorkshop,
  assignedCategoryIds,
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

  const filteredVisionMission = useMemo(() => {
    if (exportType !== "od") {
      return [];
    }

    const searchValue = search.trim().toLowerCase();
    if (!searchValue) {
      return visionMissionRows;
    }

    return visionMissionRows.filter((item) =>
      [
        item.participant,
        item.organization,
        item.workshop,
        item.visionText,
        item.missionText,
        item.visionKeywords.join(" "),
        item.missionKeywords.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [visionMissionRows, exportType, search]);

  const filteredActionables = useMemo(() => {
    if (exportType !== "od") {
      return [];
    }

    const searchValue = search.trim().toLowerCase();
    if (!searchValue) {
      return actionableRows;
    }

    return actionableRows.filter((item) =>
      [
        item.participant,
        item.organization,
        item.workshop,
        item.categoryName,
        item.categoryPath,
        item.description,
        item.timeline,
        item.responsiblePersons,
        item.comments,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [actionableRows, exportType, search]);

  useEffect(() => {
    if (
      exportType === "preod" &&
      activeView !== "all"
    ) {
      setActiveView("all");
    }
  }, [exportType, activeView]);

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
    setVisionMissionRows([]);
    setActionableRows([]);
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

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (!value) {
      setSelectedQuestion("");
      return;
    }

    // Keep question only if it still belongs to the newly selected category.
    if (!selectedQuestion) {
      return;
    }

    if (exportType === "preod") {
      const stillValid = responses.some(
        (item) =>
          item.source === "preod" &&
          item.category === value &&
          item.question === selectedQuestion
      );
      if (!stillValid) {
        setSelectedQuestion("");
      }
      return;
    }

    const category = categories.find(
      (item) => String(item.id) === String(value)
    );
    const stillValid = category?.questions?.some(
      (question) => question.question === selectedQuestion
    );
    if (!stillValid) {
      setSelectedQuestion("");
    }
  };

  const handleQuestionChange = (value: string) => {
    setSelectedQuestion(value);
    if (!value) {
      return;
    }

    // Vice versa: selecting a question reveals its category.
    if (exportType === "preod") {
      const match = responses.find(
        (item) =>
          item.source === "preod" && item.question === value
      );
      if (match?.category) {
        setSelectedCategory(match.category);
      }
      return;
    }

    const category = categories.find(
      (item) =>
        (assignedCategoryIds.length === 0 ||
          assignedCategoryIds.includes(String(item.id))) &&
        item.questions?.some((question) => question.question === value)
    );
    if (category) {
      setSelectedCategory(category.id);
    }
  };

  /*
   * --------------------------------------------------
   * ZIP export (Excel + attachment folders)
   * --------------------------------------------------
   */

  const handleExportZip = async () => {
    if (filteredResponses.length === 0 || exportingZip) {
      return;
    }

    try {
      setExportingZip(true);

      const workshopName =
        organizationWorkshops.find((item) => item.id === selectedWorkshop)
          ?.workshopName || "Workshop";
      const safeWorkshop = safeZipSegment(workshopName, "Workshop");
      const zip = new JSZip();
      const attachmentsRoot = zip.folder("Attachments");
      const usedPaths = new Set<string>();

      // Pre-assign ZIP paths so Excel can index participant + question + file.
      const zipPathByIndex = new Map<number, string>();
      const plannedFileNameByIndex = new Map<number, string>();

      filteredResponses.forEach((item, index) => {
        if (!item.attachment || item.attachment === "-") {
          return;
        }

        const sourceFolder = item.source === "preod" ? "PreOD" : "OD";
        const participantFolder = safeZipSegment(
          item.participant,
          "Participant"
        );
        const categoryFolder = safeZipSegment(
          categoryLeafName(item.category),
          "Category",
          60
        );
        const questionFolder = safeZipSegment(item.question, "Question", 70);
        const plannedName = safeZipSegment(
          item.attachmentFileName || `attachment_${index + 1}`,
          `attachment_${index + 1}`
        );
        const folderPath = `${sourceFolder}/${participantFolder}/${categoryFolder}/${questionFolder}`;
        const unique = uniqueZipPath(usedPaths, folderPath, plannedName);
        zipPathByIndex.set(index, `Attachments/${unique}`);
        plannedFileNameByIndex.set(
          index,
          unique.slice(unique.lastIndexOf("/") + 1)
        );
      });

      const worksheet = XLSX.utils.json_to_sheet(
        filteredResponses.map((item, index) => ({
          Participant: item.participant,
          Organization: item.organization,
          Workshop: item.workshop,
          Category: item.category,
          Question: item.question,
          Response: item.response,
          "Attachment File":
            plannedFileNameByIndex.get(index) ||
            item.attachmentFileName ||
            "-",
          "ZIP Path": zipPathByIndex.get(index) || "-",
        }))
      );

      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 35 },
        { wch: 50 },
        { wch: 40 },
        { wch: 28 },
        { wch: 70 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "All Responses");

      if (exportType === "od" && visionMissionRows.length > 0) {
        const visionSheet = XLSX.utils.json_to_sheet(
          visionMissionRows.map((item) => ({
            Participant: item.participant,
            Organization: item.organization,
            Workshop: item.workshop,
            Category: "Vision & Mission",
            Vision:
              item.visionKeywords.length > 0
                ? item.visionKeywords.join(", ")
                : item.visionText || "-",
            Mission:
              item.missionKeywords.length > 0
                ? item.missionKeywords.join(", ")
                : item.missionText || "-",
          }))
        );
        XLSX.utils.book_append_sheet(
          workbook,
          visionSheet,
          "Vision & Mission"
        );
      }

      if (exportType === "od" && actionableRows.length > 0) {
        const actionableSheet = XLSX.utils.json_to_sheet(
          actionableRows.map((item) => ({
            Participant: item.participant,
            Organization: item.organization,
            Workshop: item.workshop,
            Category: item.categoryName || item.categoryPath,
            Description: item.description,
            Timeline: item.timeline,
            Responsible: item.responsiblePersons,
            Comments: item.comments,
          }))
        );
        XLSX.utils.book_append_sheet(
          workbook,
          actionableSheet,
          "Actionable"
        );
      }

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      zip.file(`${safeWorkshop}_Responses.xlsx`, excelBuffer);

      await Promise.all(
        filteredResponses.map(async (item, index) => {
          const zipPath = zipPathByIndex.get(index);
          if (!zipPath || !item.attachment || item.attachment === "-") {
            return;
          }

          try {
            const response = await fetch(item.attachment);
            if (!response.ok) {
              return;
            }

            const blob = await response.blob();
            // Path inside ZIP is relative to Attachments/ folder.
            const relative = zipPath.replace(/^Attachments\//, "");
            attachmentsRoot?.file(relative, blob);
          } catch (error) {
            console.error("Failed to include attachment in ZIP", error);
          }
        })
      );

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeWorkshop}_Export.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Unable to create the export ZIP. Please try again.");
    } finally {
      setExportingZip(false);
    }
  };

  /*
   * --------------------------------------------------
   * Summary pies (choice / rating answers only)
   * --------------------------------------------------
   */

  /** Answer pies for Multiple/Single Choice & Rating across all participants. */
  const answerPieCharts = useMemo(() => {
    const byQuestion = new Map<
      string,
      {
        questionType: string;
        rows: Array<{ response: string; participant: string }>;
      }
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
        rows: [],
      };
      if (!existing.questionType && item.questionType) {
        existing.questionType = item.questionType;
      }
      existing.rows.push({
        response: String(item.response || ""),
        participant: String(item.participant || "Unknown"),
      });
      byQuestion.set(question, existing);
    });

    const charts: Array<{
      title: string;
      slices: PieSlice[];
    }> = [];

    byQuestion.forEach((entry, question) => {
      // Only Multiple Choice / Single Choice / Rating — never Text.
      if (!isChoiceQuestionType(entry.questionType)) {
        return;
      }

      const slices = buildAnswerSlices(entry.rows, {
        forceCategorical: true,
      });
      if (!slices || slices.length < 1) {
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
              setActiveView("all");
              setSelectedCategory("");
              setSelectedQuestion("");
            }}
          />

          <span>Pre-Organizational Development</span>
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
        <div className="export-filter-card">
          <div className="export-filter-card-top">
            <span className="export-filter-badge is-org" aria-hidden>
              <Building2 size={16} strokeWidth={2.2} />
            </span>
            <label htmlFor="export-org">Select Organization</label>
          </div>
          <SearchableSelect
            id="export-org"
            value={selectedOrganization}
            placeholder="Select Organization"
            searchPlaceholder="Search organization..."
            onChange={handleOrganizationChange}
            options={organizations.map((organization) => ({
              value: organization.id,
              label: organization.organizationName,
            }))}
          />
        </div>

        <div className="export-filter-card">
          <div className="export-filter-card-top">
            <span className="export-filter-badge is-workshop" aria-hidden>
              <CalendarDays size={16} strokeWidth={2.2} />
            </span>
            <label htmlFor="export-workshop">Select Workshop</label>
          </div>
          <SearchableSelect
            id="export-workshop"
            value={selectedWorkshop}
            placeholder="Select Workshop"
            searchPlaceholder="Search workshop..."
            disabled={!selectedOrganization}
            onChange={handleWorkshopChange}
            options={organizationWorkshops.map((workshop) => ({
              value: workshop.id,
              label: workshop.workshopName || workshop.id,
            }))}
          />
        </div>

        <div className="export-filter-card">
          <div className="export-filter-card-top">
            <span className="export-filter-badge is-category" aria-hidden>
              <Folder size={16} strokeWidth={2.2} />
            </span>
            <label htmlFor="export-category">Select Category</label>
          </div>
          <SearchableSelect
            id="export-category"
            value={selectedCategory}
            placeholder="Select Category"
            searchPlaceholder="Search category..."
            disabled={!selectedWorkshop}
            onChange={handleCategoryChange}
            options={availableCategories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
        </div>

        <div className="export-filter-card">
          <div className="export-filter-card-top">
            <span className="export-filter-badge is-question" aria-hidden>
              <HelpCircle size={16} strokeWidth={2.2} />
            </span>
            <label htmlFor="export-question">Select Question</label>
          </div>
          <SearchableSelect
            id="export-question"
            value={selectedQuestion}
            placeholder="Select Question"
            searchPlaceholder="Search question..."
            disabled={!selectedWorkshop}
            onChange={handleQuestionChange}
            options={availableQuestions.map((question) => ({
              value: question,
              label: question,
            }))}
          />
        </div>
      </div>


      {/* =========================================
          TABS + SEARCH + EXCEL
      ========================================= */}
      <div className="export-toolbar">
        <div className="export-tabs">
          <button
            type="button"
            className={activeView === "all" ? "active" : ""}
            onClick={() => setActiveView("all")}
          >
            <List size={16} strokeWidth={2.2} />
            All Responses
          </button>

          {exportType === "od" ? (
            <button
              type="button"
              className={activeView === "summary" ? "active" : ""}
              onClick={() => setActiveView("summary")}
            >
              <LineChart size={16} strokeWidth={2.2} />
              Summary View
            </button>
          ) : null}

          {exportType === "od" ? (
            <>
              <button
                type="button"
                className={activeView === "vision" ? "active" : ""}
                onClick={() => setActiveView("vision")}
              >
                <Eye size={16} strokeWidth={2.2} />
                Vision & Mission
              </button>

              <button
                type="button"
                className={activeView === "actionable" ? "active" : ""}
                onClick={() => setActiveView("actionable")}
              >
                <Zap size={16} strokeWidth={2.2} />
                Actionables
              </button>
            </>
          ) : null}
        </div>

        <div className="export-actions">
          <div className="export-search-wrapper">
            <span className="export-search-icon" aria-hidden>
              <Search size={16} strokeWidth={2.2} />
            </span>
            <input
              type="text"
              placeholder="Search by keyword or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="export-excel-button"
            onClick={handleExportZip}
            disabled={filteredResponses.length === 0 || exportingZip}
            title="Download ZIP (Excel + attachments)"
          >
            {exportingZip ? (
              "…"
            ) : (
              <SlidersHorizontal size={18} strokeWidth={2.2} />
            )}
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
           SUMMARY VIEW — pie charts only
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

        </section>


      ) : activeView === "vision" ? (
        <section className="export-table-card">
          <div className="export-table-scroll">
            <table className="export-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Category</th>
                  <th>Vision</th>
                  <th>Mission</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisionMission.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      No Vision & Mission responses found.
                    </td>
                  </tr>
                ) : (
                  filteredVisionMission.map((item, index) => (
                    <tr key={`${item.participant}-vm-${index}`}>
                      <td>{item.participant}</td>
                      <td>Vision & Mission</td>
                      <td className="export-text-cell">
                        {item.visionKeywords.length > 0
                          ? item.visionKeywords.join(", ")
                          : item.visionText || "-"}
                      </td>
                      <td className="export-text-cell">
                        {item.missionKeywords.length > 0
                          ? item.missionKeywords.join(", ")
                          : item.missionText || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeView === "actionable" ? (
        <section className="export-table-card">
          <div className="export-table-scroll">
            <table className="export-table export-table-wide">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Timeline</th>
                  <th>Responsible</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {filteredActionables.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No actionable items found.</td>
                  </tr>
                ) : (
                  filteredActionables.map((item, index) => (
                    <tr key={`${item.participant}-act-${index}`}>
                      <td>{item.participant}</td>
                      <td>
                        {item.categoryName ||
                          item.categoryPath
                            ?.split(">")
                            .pop()
                            ?.trim() ||
                          "-"}
                      </td>
                      <td className="export-text-cell">
                        {item.description || "-"}
                      </td>
                      <td>{item.timeline || "-"}</td>
                      <td>{item.responsiblePersons || "-"}</td>
                      <td className="export-text-cell">
                        {item.comments || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                  <th>Participant</th>
                  <th>Category</th>
                  <th>Question</th>
                  <th>Response</th>
                  <th>Attachment</th>
                  <th>Action</th>
                </tr>
              </thead>


              <tbody>

                {filteredResponses.length === 0 ? (

                  <tr>

                    <td colSpan={6}>
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
                        <td className="export-text-cell">
                          {item.response ? item.response : "-"}
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

                        <td>
                          {item.source === "od" &&
                          item.participantId &&
                          item.categoryId &&
                          item.workshopId ? (
                            <button
                              type="button"
                              className="export-add-actionable-btn"
                              title="Add as Actionable"
                              onClick={() =>
                                setActionablePreset({
                                  participantId: item.participantId!,
                                  workshopId: item.workshopId!,
                                  organizationId: item.organizationId || "",
                                  categoryId: item.categoryId!,
                                  categoryName:
                                    item.category
                                      ?.split(">")
                                      .pop()
                                      ?.trim() ||
                                    item.category ||
                                    "Category",
                                  categoryPath:
                                    item.categoryPath ||
                                    item.category ||
                                    "",
                                  participantLabel: item.participant,
                                  allowAfterEnd: true,
                                })
                              }
                            >
                              <ClipboardPlus size={15} strokeWidth={2.2} />
                              <span>Add as Actionable</span>
                            </button>
                          ) : (
                            <span className="export-no-attachment">-</span>
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

      <AddActionableModal
        open={Boolean(actionablePreset)}
        preset={actionablePreset}
        onClose={() => setActionablePreset(null)}
      />

    </main>

  </div>
);
}