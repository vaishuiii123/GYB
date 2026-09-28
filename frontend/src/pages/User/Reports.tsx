import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Eye,
  FileSpreadsheet,
  Filter,
  LineChart,
  List,
  Search,
  Zap,
} from "lucide-react";
import {
  getActiveWorkshopContext,
  getWorkshopModuleAccessStatus,
} from "../../utils/workshopCache";
import AttachmentPreviewModal, {
  type AttachmentPreviewTarget,
} from "../../components/AttachmentPreviewModal";
import UserLayout from "./UserLayout";
import {
  markReportsReturnFromQuestions,
  readReportsReturn,
} from "../../utils/reportsReturn";
import "../../styles/Export.css";
import "../../styles/UserReports.css";

type ReportRow = {
  participant: string;
  participantId?: string;
  category: string;
  tag?: string;
  question: string;
  questionId?: string;
  questionType?: string;
  response: string;
  note?: string;
  attachment: string;
  attachmentFileName?: string;
};

type VisionMissionRow = {
  participant: string;
  visionText: string;
  missionText: string;
  visionKeywords: string[];
  missionKeywords: string[];
};

type ActionableRow = {
  participant: string;
  categoryName: string;
  categoryPath: string;
  description: string;
  timeline: string;
  responsiblePersons: string;
  comments: string;
};

type TagOption = {
  id: string;
  tagName: string;
  tagColor?: string;
};

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

type PieSlice = {
  label: string;
  value: number;
  participants: string[];
};

const REPORTS_POLL_MS = 10000;

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

function shadeOfBase(index: number, total: number) {
  const steps = Math.max(total, 1);
  const t = steps === 1 ? 0.45 : index / Math.max(steps - 1, 1);
  const lightness = Math.round(32 + t * 46);
  return `hsl(210, 78%, ${lightness}%)`;
}

function colorForPieSlice(label: string, index: number, total: number) {
  const lower = String(label || "")
    .trim()
    .toLowerCase();
  if (lower === "yellow" || lower === "ye" || lower === "gold") return "#F7C948";
  if (lower === "green" || lower === "g") return "#00A651";
  if (lower === "red" || lower === "r") return "#ED1C24";
  if (lower === "yes" || lower === "y" || lower === "true" || lower === "agree") {
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

function normalizeAnswerToken(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
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

function isChoiceQuestionType(questionType?: string) {
  const type = String(questionType || "").trim().toLowerCase();
  if (!type || type.includes("text")) return false;
  return (
    type.includes("multiple") ||
    type.includes("single") ||
    type.includes("rating")
  );
}

function buildAnswerSlices(
  rows: Array<{ response: string; participant?: string }>
): PieSlice[] | null {
  const counts = new Map<string, number>();
  const people = new Map<string, string[]>();

  rows.forEach((row) => {
    const name = String(row.participant || "").trim() || "Unknown";
    expandAnswerTokens(row.response).forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
      const list = people.get(token) || [];
      if (!list.includes(name)) list.push(name);
      people.set(token, list);
    });
  });

  const slices = Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      value,
      participants: (people.get(label) || []).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.value - a.value);

  return slices.length > 0 ? slices : null;
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

function resolveQuestionTagId(
  question: { tagId?: string },
  category: { tagId?: string }
) {
  return String(question.tagId || category.tagId || "").trim();
}

function categoryLeafName(category: string) {
  const parts = String(category || "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || category || "-";
}

function responseTone(response: string) {
  return String(response || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function isColorRatingResponse(tone: string) {
  return (
    tone === "red" ||
    tone === "r" ||
    tone === "yellow" ||
    tone === "ye" ||
    tone === "gold" ||
    tone === "amber" ||
    tone === "green" ||
    tone === "g"
  );
}

function ResponseValue({ response }: { response: string }) {
  const tone = responseTone(response);
  if (isColorRatingResponse(tone)) {
    return (
      <span
        className={`user-reports-response-dot is-${tone}`}
        title={response}
        aria-label={response}
      />
    );
  }
  return (
    <span className={`user-reports-response-pill is-${tone}`}>{response}</span>
  );
}

function SummaryPieChart({
  title,
  category,
  tag,
  slices,
}: {
  title: string;
  category?: string;
  tag?: string;
  slices: PieSlice[];
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0 || slices.length < 1) return null;

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 124;
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
      <div className="export-pie-columns">
        <div className="export-pie-column">
          <span className="export-pie-column-label">Category</span>
          <span className="export-pie-column-value">
            {categoryLeafName(category || "")}
          </span>
        </div>
        <div className="export-pie-column">
          <span className="export-pie-column-label">Tag</span>
          <span className="export-pie-column-value">{tag || "-"}</span>
        </div>
      </div>
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
            <li key={arc.label} title={arc.label}>
              <span
                className="export-pie-swatch"
                style={{ background: arc.color }}
                aria-label={arc.label}
              />
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

type ReportView = "summary" | "questions" | "vision" | "actionable";

type ReportsLocationState = {
  view?: ReportView;
  question?: string;
  returnTo?: "question";
};

type QuestionColumnKey =
  | "participant"
  | "category"
  | "tag"
  | "question"
  | "response"
  | "notes"
  | "attachment";

const QUESTION_COLUMN_KEYS: QuestionColumnKey[] = [
  "participant",
  "category",
  "tag",
  "question",
  "response",
  "notes",
  "attachment",
];

function questionRowValue(
  item: ReportRow,
  key: QuestionColumnKey
): string {
  switch (key) {
    case "participant":
      return String(item.participant || "");
    case "category":
      return categoryLeafName(item.category || "");
    case "tag":
      return String(item.tag || "");
    case "question":
      return String(item.question || "");
    case "response":
      return String(item.response || "");
    case "notes":
      return String(item.note || "");
    case "attachment":
      return item.attachment && item.attachment !== "-"
        ? item.attachmentFileName || "attachment"
        : "-";
    default:
      return "";
  }
}

type VisionColumnKey = "participant" | "vision" | "mission";

const VISION_COLUMN_KEYS: VisionColumnKey[] = [
  "participant",
  "vision",
  "mission",
];

function visionRowValue(item: VisionMissionRow, key: VisionColumnKey): string {
  switch (key) {
    case "participant":
      return String(item.participant || "").trim() || "-";
    case "vision":
      return (
        (item.visionKeywords.length > 0
          ? item.visionKeywords.join(", ")
          : item.visionText) || "-"
      ).trim() || "-";
    case "mission":
      return (
        (item.missionKeywords.length > 0
          ? item.missionKeywords.join(", ")
          : item.missionText) || "-"
      ).trim() || "-";
    default:
      return "-";
  }
}

type ActionableColumnKey =
  | "participant"
  | "category"
  | "description"
  | "timeline"
  | "responsible"
  | "comments";

const ACTIONABLE_COLUMN_KEYS: ActionableColumnKey[] = [
  "participant",
  "category",
  "description",
  "timeline",
  "responsible",
  "comments",
];

function actionableRowValue(
  item: ActionableRow,
  key: ActionableColumnKey
): string {
  switch (key) {
    case "participant":
      return String(item.participant || "").trim() || "-";
    case "category":
      return (
        String(item.categoryName || "").trim() ||
        categoryLeafName(item.categoryPath || "") ||
        "-"
      );
    case "description":
      return String(item.description || "").trim() || "-";
    case "timeline":
      return String(item.timeline || "").trim() || "-";
    case "responsible":
      return String(item.responsiblePersons || "").trim() || "-";
    case "comments":
      return String(item.comments || "").trim() || "-";
    default:
      return "-";
  }
}

function ExcelHeaderFilter({
  label,
  columnKey,
  value,
  options,
  onChange,
}: {
  label: string;
  columnKey: string;
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const isActive = value.length > 0;

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const selected = new Set(value);
  const allVisibleSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((option) => selected.has(option));

  return (
    <div className="excel-header-filter" ref={rootRef}>
      <span>{label}</span>
      <button
        type="button"
        className={`excel-header-filter-btn${isActive ? " is-active" : ""}${
          open ? " is-open" : ""
        }`}
        aria-label={`Filter ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Filter size={13} strokeWidth={2.4} />
      </button>
      {open ? (
        <div className="excel-header-filter-menu" role="dialog">
          <div className="excel-header-filter-search">
            <Search size={14} strokeWidth={2.2} aria-hidden />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder={`Search ${label.toLowerCase()}...`}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="excel-header-filter-actions">
            <button
              type="button"
              onClick={() => {
                const next = new Set(selected);
                if (allVisibleSelected) {
                  filteredOptions.forEach((option) => next.delete(option));
                } else {
                  filteredOptions.forEach((option) => next.add(option));
                }
                onChange(Array.from(next));
              }}
            >
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>
            <button type="button" onClick={() => onChange([])}>
              Clear filter
            </button>
          </div>
          <div className="excel-header-filter-options">
            {filteredOptions.length === 0 ? (
              <p className="excel-header-filter-empty">No values found</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selected.has(option);
                const optionId = `excel-filter-${columnKey}-${option}`;
                return (
                  <label key={option} htmlFor={optionId}>
                    <input
                      id={optionId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selected);
                        if (checked) next.delete(option);
                        else next.add(option);
                        onChange(Array.from(next));
                      }}
                    />
                    <span title={option}>{option || "-"}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategorySearchDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const label = value || "All categories";

  return (
    <div className="user-reports-category-dropdown" ref={rootRef}>
      <span className="user-reports-category-dropdown-label">Category</span>
      <button
        type="button"
        className={`user-reports-category-trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{label}</span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>
      {open ? (
        <div className="user-reports-category-menu" role="listbox">
          <div className="user-reports-category-search">
            <Search size={14} strokeWidth={2.2} aria-hidden />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder="Search category..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={!value ? "is-selected" : ""}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            All categories
          </button>
          {filteredOptions.length === 0 ? (
            <p className="user-reports-category-empty">No categories found</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === option}
                className={value === option ? "is-selected" : ""}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const reportState = (location.state || {}) as ReportsLocationState;
  const [fromQuestion, setFromQuestion] = useState(
    () =>
      reportState.returnTo === "question" || readReportsReturn() === "question"
  );
  const {
    participant,
    workshop: selectedWorkshop,
  } = getActiveWorkshopContext();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreviewTarget | null>(null);
  const [workshopName, setWorkshopName] = useState(
    selectedWorkshop?.workshopName || ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [responses, setResponses] = useState<ReportRow[]>([]);
  const [visionMissionRows, setVisionMissionRows] = useState<VisionMissionRow[]>(
    []
  );
  const [actionableRows, setActionableRows] = useState<ActionableRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [headerFilters, setHeaderFilters] = useState<
    Record<QuestionColumnKey, string[]>
  >({
    participant: [],
    category: [],
    tag: [],
    question: [],
    response: [],
    notes: [],
    attachment: [],
  });
  const [visionHeaderFilters, setVisionHeaderFilters] = useState<
    Record<VisionColumnKey, string[]>
  >({
    participant: [],
    vision: [],
    mission: [],
  });
  const [actionableHeaderFilters, setActionableHeaderFilters] = useState<
    Record<ActionableColumnKey, string[]>
  >({
    participant: [],
    category: [],
    description: [],
    timeline: [],
    responsible: [],
    comments: [],
  });
  const [activeView, setActiveView] = useState<ReportView>(
    reportState.view || "questions"
  );
  const loadedWorkshopRef = useRef("");

  useEffect(() => {
    if (reportState.returnTo === "question") {
      markReportsReturnFromQuestions();
      setFromQuestion(true);
      return;
    }
    setFromQuestion(readReportsReturn() === "question");
  }, [reportState.returnTo, location.key]);

  const tagNameById = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach((tag) => {
      const id = String(tag.id || "").trim();
      const name = String(tag.tagName || "").trim();
      if (!id || !name) return;
      map.set(id, name);
      map.set(id.toLowerCase(), name);
    });
    return map;
  }, [tags]);

  const resolveTagName = (tagId?: string) => {
    const id = String(tagId || "").trim();
    if (!id) {
      return "";
    }
    return tagNameById.get(id) || tagNameById.get(id.toLowerCase()) || "";
  };

  const questionMetaById = useMemo(() => {
    const map = new Map<
      string,
      { path: string; answerType: string; tagId: string; tagName: string }
    >();
    for (const category of categories) {
      for (const question of category.questions || []) {
        const questionId = String(question.id || "").trim();
        if (!questionId) continue;
        const tagId = resolveQuestionTagId(question, category);
        const existing = map.get(questionId);
        // Keep a previously resolved tag if this category has none.
        if (existing?.tagId && !tagId) {
          continue;
        }
        map.set(questionId, {
          path: category.fullPath || category.categoryName || "Category",
          answerType: String(question.answerType || ""),
          tagId,
          tagName: resolveTagName(tagId) || existing?.tagName || "",
        });
      }
    }
    return map;
  }, [categories, tagNameById]);

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }
    if (!selectedWorkshop?.id) {
      navigate("/userdashboard", { replace: true });
      return;
    }
    if (!getWorkshopModuleAccessStatus(selectedWorkshop).enabled) {
      navigate("/userdashboard", { replace: true });
    }
  }, [navigate, participant?.id, selectedWorkshop]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [categoriesResponse, tagsResponse] = await Promise.all([
          fetch("/api/get-all-categories"),
          fetch("/api/get-tags"),
        ]);
        const categoriesData = await categoriesResponse.json();
        const tagsData = await tagsResponse.json().catch(() => null);
        if (cancelled) return;
        if (categoriesResponse.ok && categoriesData.success) {
          setCategories(categoriesData.categories || []);
        }
        if (tagsResponse.ok && tagsData?.success) {
          setTags(
            (tagsData.data || tagsData.tags || [])
              .map(
                (tag: { id?: string; tagName?: string; tagColor?: string }) => ({
                  id: String(tag.id || ""),
                  tagName: String(tag.tagName || ""),
                  tagColor: tag.tagColor,
                })
              )
              .filter((tag: TagOption) => tag.id && tag.tagName)
          );
        }
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!participant?.id || !selectedWorkshop?.id) {
      setErrorMessage("Please select a workshop and try again.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadReport = async () => {
      const isFirstLoad = loadedWorkshopRef.current !== selectedWorkshop.id;
      try {
        if (isFirstLoad) {
          setLoading(true);
          setErrorMessage("");
        }

        const response = await fetch(
          `/api/get-workshop-responses?workshopId=${encodeURIComponent(
            selectedWorkshop.id
          )}`
        );
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok || data.success === false) {
          throw new Error(
            data.message || "Unable to load workshop report."
          );
        }

        const rows: ReportRow[] = [];
        const visionRows: VisionMissionRow[] = [];
        const actionableList: ActionableRow[] = [];

        setWorkshopName(
          data.workshop?.workshopName || selectedWorkshop.workshopName || ""
        );

        (data.participants || []).forEach((entry: any) => {
          const participantName = entry.participantName || "Unknown";
          const participantId = String(entry.participantId || "");

          if (entry.odChart) {
            const odAnswers = entry.odChart.answers || {};
            const odNotes = entry.odChart.notes || {};
            const odAttachments = entry.odChart.attachments || {};
            const odQuestionIds = new Set([
              ...Object.keys(odAnswers),
              ...Object.keys(odNotes),
              ...Object.keys(odAttachments),
            ]);

            odQuestionIds.forEach((questionId) => {
              const answer = odAnswers[questionId];
              const noteText = String(odNotes[questionId] || "").trim();
              const attachmentList = Array.isArray(odAttachments[questionId])
                ? odAttachments[questionId]
                : odAttachments[questionId]?.blobPath
                  ? [odAttachments[questionId]]
                  : [];
              const hasAnswer =
                answer !== undefined && String(answer).trim() !== "";
              const hasAttachment = attachmentList.length > 0;

              if (!hasAnswer && !hasAttachment && !noteText) {
                return;
              }

              const meta = questionMetaById.get(String(questionId));
              const tagName =
                meta?.tagName || resolveTagName(meta?.tagId) || "";
              if (!hasAttachment) {
                rows.push({
                  participant: participantName,
                  participantId,
                  category: meta?.path || "OD Chart",
                  tag: tagName,
                  question:
                    data.questionLabels?.[questionId] || String(questionId),
                  questionId,
                  questionType:
                    data.questionTypes?.[questionId] || meta?.answerType || "",
                  response: hasAnswer ? String(answer) : "",
                  note: noteText,
                  attachment: "-",
                  attachmentFileName: undefined,
                });
                return;
              }

              attachmentList.forEach((attachmentMeta: any, attachIndex: number) => {
                const blobPath = String(attachmentMeta?.blobPath || "").trim();
                rows.push({
                  participant: participantName,
                  participantId,
                  category: meta?.path || "OD Chart",
                  tag: tagName,
                  question:
                    data.questionLabels?.[questionId] || String(questionId),
                  questionId,
                  questionType:
                    data.questionTypes?.[questionId] || meta?.answerType || "",
                  response:
                    attachIndex === 0 && hasAnswer ? String(answer) : "",
                  note: attachIndex === 0 ? noteText : "",
                  attachment: blobPath
                    ? `/api/get-od-attachment?participantId=${encodeURIComponent(
                        participantId
                      )}&workshopId=${encodeURIComponent(
                        selectedWorkshop.id
                      )}&questionId=${encodeURIComponent(
                        questionId
                      )}&blobPath=${encodeURIComponent(blobPath)}`
                    : "-",
                  attachmentFileName: String(
                    attachmentMeta?.fileName || "attachment"
                  ),
                });
              });
            });
          }

          if (entry.visionMission) {
            const vm = entry.visionMission;
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
                visionText,
                missionText,
                visionKeywords,
                missionKeywords,
              });
            }
          }

          (entry.actionables || []).forEach((item: any) => {
            actionableList.push({
              participant: participantName,
              categoryName: String(item.categoryName || ""),
              categoryPath: String(item.categoryPath || ""),
              description: String(item.description || ""),
              timeline: String(item.timeline || ""),
              responsiblePersons: String(item.responsiblePersons || ""),
              comments: String(item.comments || ""),
            });
          });
        });

        setResponses(rows);
        setVisionMissionRows(visionRows);
        setActionableRows(actionableList);
        setErrorMessage("");
        loadedWorkshopRef.current = selectedWorkshop.id;
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        if (loadedWorkshopRef.current !== selectedWorkshop.id) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading the report."
          );
          setResponses([]);
          setVisionMissionRows([]);
          setActionableRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadReport();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadReport();
    }, REPORTS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    participant?.id,
    selectedWorkshop?.id,
    selectedWorkshop?.workshopName,
    questionMetaById,
    tagNameById,
  ]);

  const responsesWithTags = useMemo(() => {
    if (questionMetaById.size === 0 && tagNameById.size === 0) {
      return responses;
    }
    return responses.map((item) => {
      const meta = questionMetaById.get(String(item.questionId || ""));
      const tag =
        meta?.tagName ||
        resolveTagName(meta?.tagId) ||
        item.tag ||
        "";
      const category = meta?.path || item.category || "";
      if (tag === item.tag && category === item.category) {
        return item;
      }
      return { ...item, tag, category };
    });
  }, [responses, questionMetaById, tagNameById]);

  const filteredResponses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return responsesWithTags;
    return responsesWithTags.filter((item) =>
      [
        item.participant,
        item.category,
        item.tag,
        item.question,
        item.response,
        item.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [responsesWithTags, search]);

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    responsesWithTags.forEach((item) => {
      const category = categoryLeafName(item.category || "");
      if (category && category !== "-") {
        names.add(category);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [responsesWithTags]);

  const categoryScopedResponses = useMemo(() => {
    if (!categoryFilter) {
      return filteredResponses;
    }
    return filteredResponses.filter(
      (item) => categoryLeafName(item.category || "") === categoryFilter
    );
  }, [filteredResponses, categoryFilter]);

  const headerFilterOptions = useMemo(() => {
    const maps: Record<QuestionColumnKey, Set<string>> = {
      participant: new Set(),
      category: new Set(),
      tag: new Set(),
      question: new Set(),
      response: new Set(),
      notes: new Set(),
      attachment: new Set(),
    };
    categoryScopedResponses.forEach((item) => {
      QUESTION_COLUMN_KEYS.forEach((key) => {
        const value = questionRowValue(item, key).trim() || "-";
        maps[key].add(value);
      });
    });
    return QUESTION_COLUMN_KEYS.reduce(
      (acc, key) => {
        acc[key] = Array.from(maps[key]).sort((a, b) => a.localeCompare(b));
        return acc;
      },
      {} as Record<QuestionColumnKey, string[]>
    );
  }, [categoryScopedResponses]);

  const questionTableResponses = useMemo(() => {
    return categoryScopedResponses.filter((item) =>
      QUESTION_COLUMN_KEYS.every((key) => {
        const selected = headerFilters[key];
        if (!selected || selected.length === 0) return true;
        const value = questionRowValue(item, key).trim() || "-";
        return selected.includes(value);
      })
    );
  }, [categoryScopedResponses, headerFilters]);

  const searchedVisionMission = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return visionMissionRows;
    return visionMissionRows.filter((item) =>
      [
        item.participant,
        item.visionText,
        item.missionText,
        item.visionKeywords.join(" "),
        item.missionKeywords.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [visionMissionRows, search]);

  const visionHeaderFilterOptions = useMemo(() => {
    const maps: Record<VisionColumnKey, Set<string>> = {
      participant: new Set(),
      vision: new Set(),
      mission: new Set(),
    };
    searchedVisionMission.forEach((item) => {
      VISION_COLUMN_KEYS.forEach((key) => {
        maps[key].add(visionRowValue(item, key));
      });
    });
    return VISION_COLUMN_KEYS.reduce(
      (acc, key) => {
        acc[key] = Array.from(maps[key]).sort((a, b) => a.localeCompare(b));
        return acc;
      },
      {} as Record<VisionColumnKey, string[]>
    );
  }, [searchedVisionMission]);

  const filteredVisionMission = useMemo(() => {
    return searchedVisionMission.filter((item) =>
      VISION_COLUMN_KEYS.every((key) => {
        const selected = visionHeaderFilters[key];
        if (!selected || selected.length === 0) return true;
        return selected.includes(visionRowValue(item, key));
      })
    );
  }, [searchedVisionMission, visionHeaderFilters]);

  const searchedActionables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return actionableRows;
    return actionableRows.filter((item) =>
      [
        item.participant,
        item.categoryName,
        item.categoryPath,
        item.description,
        item.timeline,
        item.responsiblePersons,
        item.comments,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [actionableRows, search]);

  const actionableHeaderFilterOptions = useMemo(() => {
    const maps: Record<ActionableColumnKey, Set<string>> = {
      participant: new Set(),
      category: new Set(),
      description: new Set(),
      timeline: new Set(),
      responsible: new Set(),
      comments: new Set(),
    };
    searchedActionables.forEach((item) => {
      ACTIONABLE_COLUMN_KEYS.forEach((key) => {
        maps[key].add(actionableRowValue(item, key));
      });
    });
    return ACTIONABLE_COLUMN_KEYS.reduce(
      (acc, key) => {
        acc[key] = Array.from(maps[key]).sort((a, b) => a.localeCompare(b));
        return acc;
      },
      {} as Record<ActionableColumnKey, string[]>
    );
  }, [searchedActionables]);

  const filteredActionables = useMemo(() => {
    return searchedActionables.filter((item) =>
      ACTIONABLE_COLUMN_KEYS.every((key) => {
        const selected = actionableHeaderFilters[key];
        if (!selected || selected.length === 0) return true;
        return selected.includes(actionableRowValue(item, key));
      })
    );
  }, [searchedActionables, actionableHeaderFilters]);

  const answerPieCharts = useMemo(() => {
    const byQuestion = new Map<
      string,
      {
        questionType: string;
        category: string;
        tag: string;
        rows: Array<{ response: string; participant: string }>;
      }
    >();

    categoryScopedResponses.forEach((item) => {
      const question = String(item.question || "").trim();
      if (!question || !String(item.response || "").trim()) return;
      const existing = byQuestion.get(question) || {
        questionType: item.questionType || "",
        category: item.category || "",
        tag: item.tag || "",
        rows: [],
      };
      if (!existing.questionType && item.questionType) {
        existing.questionType = item.questionType;
      }
      if (!existing.category && item.category) {
        existing.category = item.category;
      }
      if (!existing.tag && item.tag) {
        existing.tag = item.tag;
      }
      existing.rows.push({
        response: String(item.response || ""),
        participant: String(item.participant || "Unknown"),
      });
      byQuestion.set(question, existing);
    });

    const charts: Array<{
      title: string;
      category: string;
      tag: string;
      slices: PieSlice[];
    }> = [];
    byQuestion.forEach((entry, question) => {
      if (!isChoiceQuestionType(entry.questionType)) return;
      const slices = buildAnswerSlices(entry.rows);
      if (!slices || slices.length < 1) return;
      charts.push({
        title: question,
        category: entry.category,
        tag: entry.tag,
        slices,
      });
    });
    return charts;
  }, [categoryScopedResponses]);

  const itemCount =
    activeView === "vision"
      ? filteredVisionMission.length
      : activeView === "actionable"
        ? filteredActionables.length
        : activeView === "summary"
          ? answerPieCharts.length
          : questionTableResponses.length;

  return (
    <UserLayout
      contentClassName="user-layout-main-reports"
      showBackButton
      backTo={fromQuestion ? "/od-chart/questions" : "/userdashboard"}
      backLabel={
        fromQuestion ? "← Back to questions" : "← Back to Dashboard"
      }
    >
      <div className="user-reports-page user-reports-like-export">
        <div className="user-reports-header">
          <span className="user-reports-header-icon" aria-hidden>
            <FileSpreadsheet size={22} strokeWidth={2.1} />
          </span>
          <div>
            <h1>Reports</h1>
            <p>
              Workshop-wide report for{" "}
              <strong>{workshopName || "this workshop"}</strong>, including all
              participants.
            </p>
          </div>
        </div>

        <div className="export-toolbar user-reports-export-toolbar">
          <div className="export-tabs">
            <button
              type="button"
              className={activeView === "summary" ? "active" : ""}
              onClick={() => setActiveView("summary")}
            >
              <LineChart size={16} strokeWidth={2.2} />
              Workshop Summary
            </button>
            <button
              type="button"
              className={activeView === "questions" ? "active" : ""}
              onClick={() => setActiveView("questions")}
            >
              <List size={16} strokeWidth={2.2} />
              Question-Wise
            </button>
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
          </div>

          <div className="export-actions">
            {activeView === "summary" || activeView === "questions" ? (
              <CategorySearchDropdown
                value={categoryFilter}
                options={categoryOptions}
                onChange={setCategoryFilter}
              />
            ) : null}
            <div className="export-search-wrapper">
              <span className="export-search-icon" aria-hidden>
                <Search size={16} strokeWidth={2.2} />
              </span>
              <input
                type="text"
                placeholder="Search by keyword or type..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <p className="user-reports-count">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="user-reports-alert">{errorMessage}</div>
        ) : null}

        {loading && responses.length === 0 ? (
          <p className="user-reports-empty">Loading workshop report...</p>
        ) : activeView === "summary" ? (
          <section className="export-table-card">
            {answerPieCharts.length > 0 ? (
              <div className="export-pie-list">
                {answerPieCharts.map((chart) => (
                  <SummaryPieChart
                    key={chart.title}
                    title={chart.title}
                    category={chart.category}
                    tag={chart.tag}
                    slices={chart.slices}
                  />
                ))}
              </div>
            ) : (
              <p className="user-reports-empty">No summary charts found.</p>
            )}
          </section>
        ) : activeView === "vision" ? (
          <section className="export-table-card">
            <div className="export-table-scroll">
              <table className="export-table">
                <thead>
                  <tr>
                    {(
                      [
                        ["participant", "Participant"],
                        ["vision", "Vision"],
                        ["mission", "Mission"],
                      ] as Array<[VisionColumnKey, string]>
                    ).map(([key, label]) => (
                      <th key={key}>
                        <ExcelHeaderFilter
                          label={label}
                          columnKey={key}
                          value={visionHeaderFilters[key]}
                          options={visionHeaderFilterOptions[key]}
                          onChange={(next) =>
                            setVisionHeaderFilters((prev) => ({
                              ...prev,
                              [key]: next,
                            }))
                          }
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVisionMission.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No Vision & Mission responses found.</td>
                    </tr>
                  ) : (
                    filteredVisionMission.map((item, index) => (
                      <tr key={`${item.participant}-vm-${index}`}>
                        <td>{item.participant}</td>
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
                    {(
                      [
                        ["participant", "Participant"],
                        ["category", "Category"],
                        ["description", "Description"],
                        ["timeline", "Timeline"],
                        ["responsible", "Responsible"],
                        ["comments", "Comments"],
                      ] as Array<[ActionableColumnKey, string]>
                    ).map(([key, label]) => (
                      <th key={key}>
                        <ExcelHeaderFilter
                          label={label}
                          columnKey={key}
                          value={actionableHeaderFilters[key]}
                          options={actionableHeaderFilterOptions[key]}
                          onChange={(next) =>
                            setActionableHeaderFilters((prev) => ({
                              ...prev,
                              [key]: next,
                            }))
                          }
                        />
                      </th>
                    ))}
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
                            item.categoryPath?.split(">").pop()?.trim() ||
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
          <section className="export-table-card">
            <div className="export-table-scroll">
              <table className="export-table">
                <thead>
                  <tr>
                    {(
                      [
                        ["participant", "Participant"],
                        ["category", "Category"],
                        ["tag", "Tag"],
                        ["question", "Question"],
                        ["response", "Response"],
                        ["notes", "Notes"],
                        ["attachment", "Attachment"],
                      ] as Array<[QuestionColumnKey, string]>
                    ).map(([key, label]) => (
                      <th key={key}>
                        <ExcelHeaderFilter
                          label={label}
                          columnKey={key}
                          value={headerFilters[key]}
                          options={headerFilterOptions[key]}
                          onChange={(next) =>
                            setHeaderFilters((prev) => ({
                              ...prev,
                              [key]: next,
                            }))
                          }
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {questionTableResponses.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No responses found.</td>
                    </tr>
                  ) : (
                    questionTableResponses.map((item, index) => (
                      <tr
                        key={`${item.participant}-${item.question}-${index}`}
                      >
                        <td>{item.participant}</td>
                        <td>
                          {item.category?.split(">").pop()?.trim() || "-"}
                        </td>
                        <td>{item.tag || "-"}</td>
                        <td>{item.question}</td>
                        <td>
                          {item.response ? (
                            <ResponseValue response={item.response} />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {item.note ? (
                            <div className="user-reports-notes-scroll">
                              {item.note}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {item.attachment && item.attachment !== "-" ? (
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
                                  window.open(
                                    `${item.attachment}${
                                      item.attachment.includes("?") ? "&" : "?"
                                    }inline=0`,
                                    "_blank"
                                  );
                                }}
                              >
                                ↓
                              </button>
                            </div>
                          ) : (
                            <span className="export-no-attachment">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <AttachmentPreviewModal
        target={attachmentPreview}
        onClose={() => setAttachmentPreview(null)}
      />
    </UserLayout>
  );
}
