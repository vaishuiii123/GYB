import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import SearchableSelect from "../../components/SearchableSelect";
import AttachmentPreviewModal, {
  type AttachmentPreviewTarget,
} from "../../components/AttachmentPreviewModal";
import {
  Building2,
  CalendarDays,
  Eye,
  Folder,
  HelpCircle,
  LineChart,
  List,
  Search,
  SlidersHorizontal,
  StickyNote,
  Tags,
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

type TagOption = {
  id: string;
  tagName: string;
  tagColor?: string;
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
  note?: string;
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
  success?: boolean;
  message?: string;
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

const RESPONSES_POLL_MS = 10000;

type Category = {
  id: string;
  categoryName: string;
  fullPath?: string;
  tagId?: string;
  questions?: Array<{
    id: string;
    question: string;
    answerType?: string;
    tagId?: string;
  }>;
};

function resolveQuestionTagId(
  question: { tagId?: string },
  category: { tagId?: string }
) {
  return String(question.tagId || category.tagId || "").trim();
}

/** Single-hue blue family — darker → lighter by slice index. */
function shadeOfBase(index: number, total: number) {
  const steps = Math.max(total, 1);
  // Lightness from ~32% (dark) to ~78% (light)
  const t = steps === 1 ? 0.45 : index / Math.max(steps - 1, 1);
  const lightness = Math.round(32 + t * 46);
  return `hsl(210, 78%, ${lightness}%)`;
}

/** Traffic-light / Yes-No colors; everything else uses blue shades. */
function colorForPieSlice(label: string, index: number, total: number) {
  const lower = String(label || "")
    .trim()
    .toLowerCase();

  // Yellow / Green / Red option labels → those colors on the pie
  if (lower === "yellow" || lower === "ye" || lower === "gold") {
    return "#F7C948";
  }
  if (lower === "green" || lower === "g") {
    return "#00A651";
  }
  if (lower === "red" || lower === "r") {
    return "#ED1C24";
  }

  // Yes → green, No → red
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
  "gold",
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
  if (lower === "yellow" || lower === "ye" || lower === "gold") return "Yellow";
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
  const [tags, setTags] = useState<TagOption[]>([]);
  const [assignedCategoryIds, setAssignedCategoryIds] =  useState<string[]>([]);
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [templateCategories, setTemplateCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [exportType, setExportType] = useState<"preod" | "od">("od");

  const [selectedOrganization, setSelectedOrganization] =
    useState("");

  const [selectedWorkshop, setSelectedWorkshop] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [selectedTag, setSelectedTag] =
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

  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreviewTarget | null>(null);

  const [loadingInitial, setLoadingInitial] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadedWorkshopRef = useRef("");

  const [search, setSearch] =
    useState("");

  const [activeView, setActiveView] =
    useState<"all" | "summary" | "vision" | "notes" | "actionable">("all");

  const [exportingZip, setExportingZip] = useState(false);

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
          tagsResponse,
        ] = await Promise.all([
          fetch("/api/get-organizations"),
          fetch("/api/get-workshops"),
          fetch("/api/get-all-categories"),
          fetch("/api/get-tags"),
        ]);

        const organizationsData =
          await organizationsResponse.json();

        const workshopsData =
          await workshopsResponse.json();

        const categoriesData =
          await categoriesResponse.json();

        const tagsData = await tagsResponse.json().catch(() => null);

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

        if (tagsResponse.ok && tagsData?.success) {
          setTags(
            (tagsData.data || tagsData.tags || []).map(
              (tag: { id?: string; tagName?: string; tagColor?: string }) => ({
                id: String(tag.id || ""),
                tagName: String(tag.tagName || ""),
                tagColor: String(tag.tagColor || ""),
              })
            ).filter((tag: TagOption) => tag.id && tag.tagName)
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

  const questionMetaById = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        path: string;
        answerType: string;
        tagId: string;
      }
    >();

    for (const category of categories) {
      for (const question of category.questions || []) {
        map.set(String(question.id), {
          id: String(category.id || ""),
          name: String(category.categoryName || ""),
          path: category.fullPath || category.categoryName || "Category",
          answerType: String(question.answerType || ""),
          tagId: resolveQuestionTagId(question, category),
        });
      }
    }

    return map;
  }, [categories]);

  /*
   * --------------------------------------------------
   * Load responses for selected workshop (live poll)
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!selectedWorkshop) {
      setResponses([]);
      setVisionMissionRows([]);
      setActionableRows([]);
      setSelectedCategory("");
      setSelectedTag("");
      setSelectedQuestion("");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadResponses = async () => {
      const isFirstLoad = loadedWorkshopRef.current !== selectedWorkshop;
      try {
        if (isFirstLoad) {
          setLoading(true);
          setError("");
        }

        const response = await fetch(
          `/api/get-workshop-responses?workshopId=${encodeURIComponent(
            selectedWorkshop
          )}`
        );

        const data: ResponseData =
          await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || data.success === false) {
          throw new Error(
            data.message || "Unable to load workshop responses."
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
              workshops.find(
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
              const odAnswers = participant.odChart.answers || {};
              const odNotes = participant.odChart.notes || {};
              const odAttachments = participant.odChart.attachments || {};
              const odQuestionIds = new Set([
                ...Object.keys(odAnswers),
                ...Object.keys(odNotes),
                ...Object.keys(odAttachments),
              ]);

              odQuestionIds.forEach((questionId) => {
                const answer = odAnswers[questionId];
                const noteText = String(odNotes[questionId] || "").trim();
                const attachmentMeta = odAttachments[questionId];
                const hasAnswer =
                  answer !== undefined && String(answer).trim() !== "";
                const hasAttachment = Boolean(attachmentMeta?.blobPath);

                if (!hasAnswer && !hasAttachment && !noteText) {
                  return;
                }

                const attachmentUrl = hasAttachment
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
                  response: hasAnswer ? String(answer) : "",
                  note: noteText,
                  attachment: attachmentUrl,
                  attachmentFileName: hasAttachment
                    ? String(attachmentMeta?.fileName || "attachment")
                    : undefined,
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
        setError("");
        loadedWorkshopRef.current = selectedWorkshop;
      } catch (err) {
        console.error(err);

        if (cancelled) {
          return;
        }

        // Keep existing rows on background poll failures; only hard-fail
        // the first load so the table does not flicker empty.
        if (loadedWorkshopRef.current !== selectedWorkshop) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load workshop responses."
          );

          setResponses([]);
          setVisionMissionRows([]);
          setActionableRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadResponses();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void loadResponses();
    }, RESPONSES_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedWorkshop, categories, workshops]);

  /*
   * --------------------------------------------------
   * Find category for OD question
   * --------------------------------------------------
   */

  const getCategoryForQuestion = (
    questionId: string
  ) => questionMetaById.get(String(questionId))?.path || "OD Chart";

  const getCategoryMetaForQuestion = (questionId: string) => {
    const meta = questionMetaById.get(String(questionId));
    if (meta) {
      return {
        id: meta.id,
        name: meta.name,
        path: meta.path,
      };
    }
    return { id: "", name: "", path: "OD Chart" };
  };

  const getQuestionTypeForQuestion = (
    questionId: string
  ) => questionMetaById.get(String(questionId))?.answerType || "";

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

  // OD: only categories that own at least one question on this workshop's template.
  const templateQuestionIds = new Set(
    assignedQuestionIds.map((id) => String(id))
  );

  const fromTemplate =
    templateCategories.length > 0
      ? templateCategories
      : categories
          .filter((category) =>
            assignedCategoryIds.includes(String(category.id))
          )
          .map((category) => {
            const fullPath =
              category.fullPath || category.categoryName || "";
            const displayName =
              fullPath.split(">").pop()?.trim() || "";
            return { id: category.id, name: displayName };
          })
          .filter((category) => category.name);

  return fromTemplate
    .filter((category) => {
      if (templateQuestionIds.size === 0) {
        return true;
      }
      const match = categories.find(
        (item) => String(item.id) === String(category.id)
      );
      // Keep category only if it has a template question linked to it.
      return (match?.questions || []).some((question) =>
        templateQuestionIds.has(String(question.id))
      );
    })
    .filter((category) => {
      if (!selectedTag) {
        return true;
      }
      const match = categories.find(
        (item) => String(item.id) === String(category.id)
      );
      return (match?.questions || []).some(
        (question) =>
          templateQuestionIds.has(String(question.id)) &&
          resolveQuestionTagId(question, match) === String(selectedTag)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}, [
  categories,
  assignedCategoryIds,
  assignedQuestionIds,
  templateCategories,
  selectedWorkshop,
  selectedTag,
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

  const templateQuestionIds = new Set(
    assignedQuestionIds.map((id) => String(id))
  );

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
          .filter((question) => {
            if (
              templateQuestionIds.size > 0 &&
              !templateQuestionIds.has(String(question.id))
            ) {
              return false;
            }
            if (!selectedTag) {
              return true;
            }
            return (
              resolveQuestionTagId(question, category) === String(selectedTag)
            );
          })
          .map((question) => question.question)
          .filter(Boolean)
      )
    )
  ).sort();
}, [
  categories,
  selectedCategory,
  selectedTag,
  selectedWorkshop,
  assignedCategoryIds,
  assignedQuestionIds,
  exportType,
  responses,
]);

  const availableTags = useMemo(() => {
    if (!selectedWorkshop || exportType !== "od") {
      return [];
    }

    // Scope to workshop template categories, then to the selected category.
    const scopedCategories = categories.filter((category) => {
      if (
        assignedCategoryIds.length === 0 ||
        !assignedCategoryIds.includes(String(category.id))
      ) {
        return false;
      }
      if (
        selectedCategory &&
        String(category.id) !== String(selectedCategory)
      ) {
        return false;
      }
      return true;
    });

    // Question IDs that actually have OD responses in the current category scope.
    const selectedCategoryName = selectedCategory
      ? categories.find((c) => String(c.id) === String(selectedCategory))
          ?.categoryName ||
        availableCategories.find((c) => c.id === selectedCategory)?.name ||
        ""
      : "";

    const answeredQuestionIds = new Set<string>();
    for (const item of responses) {
      if (item.source !== "od") continue;
      const questionId = String(item.questionId || "").trim();
      if (!questionId) continue;
      if (selectedCategory) {
        const lastCategory =
          (item.category || "").split(">").pop()?.trim() || "";
        if (lastCategory !== selectedCategoryName) continue;
      }
      answeredQuestionIds.add(questionId);
    }

    const usedTagIds = new Set<string>();
    for (const category of scopedCategories) {
      for (const question of category.questions || []) {
        // When a category is selected, only show tags for questions that
        // already have at least one response in that category.
        if (
          selectedCategory &&
          !answeredQuestionIds.has(String(question.id))
        ) {
          continue;
        }
        const tagId = resolveQuestionTagId(question, category);
        if (tagId) {
          usedTagIds.add(tagId);
        }
      }
    }

    // No category selected: show tags from answered questions when any exist,
    // otherwise fall back to all tags used by template questions.
    if (!selectedCategory && answeredQuestionIds.size > 0) {
      usedTagIds.clear();
      for (const category of scopedCategories) {
        for (const question of category.questions || []) {
          if (!answeredQuestionIds.has(String(question.id))) continue;
          const tagId = resolveQuestionTagId(question, category);
          if (tagId) usedTagIds.add(tagId);
        }
      }
    }

    return tags
      .filter((tag) => usedTagIds.has(String(tag.id)))
      .sort((a, b) => a.tagName.localeCompare(b.tagName));
  }, [
    tags,
    categories,
    assignedCategoryIds,
    selectedCategory,
    selectedWorkshop,
    exportType,
    responses,
    availableCategories,
  ]);

  // Drop stale tag when it no longer belongs to the filtered list (e.g. after category change).
  useEffect(() => {
    if (!selectedTag || exportType !== "od") {
      return;
    }
    if (!availableTags.some((tag) => String(tag.id) === String(selectedTag))) {
      setSelectedTag("");
    }
  }, [availableTags, selectedTag, exportType]);

  // Drop stale category when it is not present in this workshop's responses.
  useEffect(() => {
    if (!selectedCategory || !selectedWorkshop) {
      return;
    }
    if (
      !availableCategories.some(
        (category) => String(category.id) === String(selectedCategory)
      )
    ) {
      setSelectedCategory("");
      setSelectedTag("");
      setSelectedQuestion("");
    }
  }, [availableCategories, selectedCategory, selectedWorkshop]);

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

    if (selectedTag && exportType === "od") {
      data = data.filter((item) => {
        const questionId = String(item.questionId || "").trim();
        if (!questionId) {
          return false;
        }
        return (
          String(questionMetaById.get(questionId)?.tagId || "") ===
          String(selectedTag)
        );
      });
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
          item.note,
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
    selectedTag,
    selectedQuestion,
    search,
    categories,
    availableCategories,
    questionMetaById,
  ]);

  const filteredNotes = useMemo(() => {
    if (exportType !== "od") {
      return [];
    }

    return filteredResponses.filter((item) =>
      Boolean(String(item.note || "").trim())
    );
  }, [filteredResponses, exportType]);

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
    setSelectedTag("");
    setSelectedQuestion("");
    setAssignedCategoryIds([]);
    setAssignedQuestionIds([]);
    setTemplateCategories([]);
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
  setSelectedTag("");
  setSelectedQuestion("");
  setAssignedCategoryIds([]);
  setAssignedQuestionIds([]);
  setTemplateCategories([]);
  setResponses([]);

  if (!workshopId) {
    return;
  }

  try {
    // Refresh workshops so TemplateId is current after template re-uploads.
    const workshopsResponse = await fetch("/api/get-workshops");
    const workshopsData = await workshopsResponse.json().catch(() => null);
    if (workshopsResponse.ok && workshopsData?.success) {
      setWorkshops(workshopsData.workshops || []);
    }

    const workshopList =
      workshopsData?.success && Array.isArray(workshopsData.workshops)
        ? workshopsData.workshops
        : organizationWorkshops;

    const workshop = workshopList.find(
      (item: Workshop) => String(item.id) === String(workshopId)
    );

    if (!workshop) {
      console.warn("Selected workshop was not found.");
      return;
    }

    if (!workshop.templateId) {
      console.warn("Selected workshop does not have a template.");
      return;
    }

    const response = await fetch(
      `/api/get-template-details?templateId=${encodeURIComponent(
        workshop.templateId
      )}`
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.template) {
      console.error("Could not load template details");
      return;
    }

    const templateQuestions = Array.isArray(data.template.questions)
      ? data.template.questions
      : [];

    const questionIds = (
      data.template.questionIds ||
      templateQuestions.map((item: { id?: string }) => item.id) ||
      []
    )
      .map((id: string) => String(id || "").trim())
      .filter(Boolean);

    // Categories of questions that are actually on this template.
    const categoryById = new Map<string, string>();
    for (const question of templateQuestions) {
      const categoryId = String(question.categoryId || "").trim();
      if (!categoryId) continue;
      const leaf =
        String(question.categoryName || "").trim() ||
        String(question.categoryPath || "")
          .split(">")
          .pop()
          ?.trim() ||
        "";
      if (!leaf) continue;
      if (!categoryById.has(categoryId)) {
        categoryById.set(categoryId, leaf);
      }
    }

    const derivedCategories = Array.from(categoryById.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setAssignedQuestionIds(questionIds);
    setTemplateCategories(derivedCategories);
    setAssignedCategoryIds(
      derivedCategories.length > 0
        ? derivedCategories.map((item) => item.id)
        : (data.template.categoryIds || [])
            .map((id: string) => String(id).trim())
            .filter(Boolean)
    );
  } catch (error) {
    console.error("Error loading workshop categories:", error);
    setAssignedCategoryIds([]);
    setAssignedQuestionIds([]);
    setTemplateCategories([]);
  }
};

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    // Cascading filters: category change always resets tag/question unless still valid.
    setSelectedTag("");
    setSelectedQuestion("");

    if (!value) {
      return;
    }
  };

  const handleTagChange = (value: string) => {
    setSelectedTag(value);

    if (value && selectedCategory) {
      const category = categories.find(
        (item) => String(item.id) === String(selectedCategory)
      );
      const categoryHasTag = category?.questions?.some(
        (question) =>
          resolveQuestionTagId(question, category) === String(value)
      );
      if (!categoryHasTag) {
        setSelectedCategory("");
      }
    }

    if (!value || !selectedQuestion) {
      return;
    }

    const stillValid = categories.some((category) =>
      (category.questions || []).some(
        (question) =>
          question.question === selectedQuestion &&
          resolveQuestionTagId(question, category) === String(value)
      )
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

    // Vice versa: selecting a question reveals its category (and tag for OD).
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
      const matchedQuestion = category.questions?.find(
        (question) => question.question === value
      );
      const tagId = matchedQuestion
        ? resolveQuestionTagId(matchedQuestion, category)
        : "";
      if (tagId) {
        setSelectedTag(tagId);
      } else {
        setSelectedTag("");
      }
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
      const [{ default: JSZip }, XLSX] = await Promise.all([
        import("jszip"),
        import("xlsx"),
      ]);

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
          Notes: item.note || "",
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

      if (exportType === "od" && filteredNotes.length > 0) {
        const notesSheet = XLSX.utils.json_to_sheet(
          filteredNotes.map((item) => ({
            Participant: item.participant,
            Organization: item.organization,
            Workshop: item.workshop,
            Category: item.category,
            Question: item.question,
            Notes: item.note || "",
            Response: item.response || "",
          }))
        );
        XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");
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
              setSelectedTag("");
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
              setSelectedTag("");
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
            <span className="export-filter-badge is-tag" aria-hidden>
              <Tags size={16} strokeWidth={2.2} />
            </span>
            <label htmlFor="export-tag">Select Tag</label>
          </div>
          <SearchableSelect
            id="export-tag"
            value={selectedTag}
            placeholder="Select Tag"
            searchPlaceholder="Search tag..."
            disabled={!selectedWorkshop}
            onChange={handleTagChange}
            options={availableTags.map((tag) => ({
              value: tag.id,
              label: tag.tagName,
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
                className={activeView === "notes" ? "active" : ""}
                onClick={() => setActiveView("notes")}
              >
                <StickyNote size={16} strokeWidth={2.2} />
                Notes
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
      {loadingInitial ? (

        <div className="export-message">
          Loading...
        </div>

      ) : error && responses.length === 0 ? (

        <div className="export-message error">
          {error}
        </div>

      ) : loading && responses.length === 0 ? (

        <div className="export-message">
          Loading responses...
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
      ) : activeView === "notes" ? (
        <section className="export-table-card">
          <div className="export-table-scroll">
            <table className="export-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Category</th>
                  <th>Question</th>
                  <th>Notes</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No notes found.</td>
                  </tr>
                ) : (
                  filteredNotes.map((item, index) => (
                    <tr key={`${item.participant}-note-${index}`}>
                      <td>{item.participant}</td>
                      <td>
                        {item.category?.split(">").pop()?.trim() || "-"}
                      </td>
                      <td>{item.question}</td>
                      <td className="export-text-cell">
                        {item.note || "-"}
                      </td>
                      <td className="export-text-cell">
                        {item.response || "-"}
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
                  <th>Notes</th>
                  <th>Attachment</th>
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


                        {/* NOTES */}
                        <td className="export-text-cell">
                          {item.note ? item.note : "-"}
                        </td>


                        {/* ATTACHMENT */}
                        <td>

                          {item.attachment &&
                          item.attachment !== "-" ? (
                            <div className="export-attachment-actions">
                              <button
                                type="button"
                                className="export-attachment-button"
                                title="Preview attachment"
                                onClick={() =>
                                  setAttachmentPreview({
                                    url: item.attachment,
                                    fileName:
                                      item.attachmentFileName || "attachment",
                                  })
                                }
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="export-attachment-button is-download"
                                title="Download attachment"
                                onClick={() => {
                                  if (
                                    item.attachment &&
                                    item.attachment !== "-"
                                  ) {
                                    window.open(
                                      `${item.attachment}${
                                        item.attachment.includes("?")
                                          ? "&"
                                          : "?"
                                      }inline=0`,
                                      "_blank"
                                    );
                                  }
                                }}
                              >
                                ↓
                              </button>
                            </div>
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

      <AttachmentPreviewModal
        target={attachmentPreview}
        onClose={() => setAttachmentPreview(null)}
      />

  </div>
);
}