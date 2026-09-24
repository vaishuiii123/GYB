import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  FileSpreadsheet,
  LineChart,
  List,
  Search,
  StickyNote,
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
import "../../styles/Export.css";
import "../../styles/UserReports.css";

type ReportRow = {
  participant: string;
  participantId?: string;
  category: string;
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

function SummaryPieChart({
  title,
  slices,
}: {
  title: string;
  slices: PieSlice[];
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0 || slices.length < 1) return null;

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

export default function Reports() {
  const navigate = useNavigate();
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
  const [responses, setResponses] = useState<ReportRow[]>([]);
  const [visionMissionRows, setVisionMissionRows] = useState<VisionMissionRow[]>(
    []
  );
  const [actionableRows, setActionableRows] = useState<ActionableRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<
    "all" | "summary" | "vision" | "notes" | "actionable"
  >("all");
  const loadedWorkshopRef = useRef("");

  const questionMetaById = useMemo(() => {
    const map = new Map<
      string,
      { path: string; answerType: string }
    >();
    for (const category of categories) {
      for (const question of category.questions || []) {
        map.set(String(question.id), {
          path: category.fullPath || category.categoryName || "Category",
          answerType: String(question.answerType || ""),
        });
      }
    }
    return map;
  }, [categories]);

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
        const response = await fetch("/api/get-all-categories");
        const data = await response.json();
        if (cancelled || !response.ok || !data.success) return;
        setCategories(data.categories || []);
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
              const attachmentMeta = odAttachments[questionId];
              const hasAnswer =
                answer !== undefined && String(answer).trim() !== "";
              const hasAttachment = Boolean(attachmentMeta?.blobPath);

              if (!hasAnswer && !hasAttachment && !noteText) {
                return;
              }

              const meta = questionMetaById.get(String(questionId));
              rows.push({
                participant: participantName,
                participantId,
                category: meta?.path || "OD Chart",
                question:
                  data.questionLabels?.[questionId] || String(questionId),
                questionId,
                questionType:
                  data.questionTypes?.[questionId] || meta?.answerType || "",
                response: hasAnswer ? String(answer) : "",
                note: noteText,
                attachment: hasAttachment
                  ? `/api/get-od-attachment?participantId=${encodeURIComponent(
                      participantId
                    )}&workshopId=${encodeURIComponent(
                      selectedWorkshop.id
                    )}&questionId=${encodeURIComponent(questionId)}`
                  : "-",
                attachmentFileName: hasAttachment
                  ? String(attachmentMeta?.fileName || "attachment")
                  : undefined,
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
  ]);

  const filteredResponses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return responses;
    return responses.filter((item) =>
      [
        item.participant,
        item.category,
        item.question,
        item.response,
        item.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [responses, search]);

  const filteredNotes = useMemo(
    () =>
      filteredResponses.filter((item) =>
        Boolean(String(item.note || "").trim())
      ),
    [filteredResponses]
  );

  const filteredVisionMission = useMemo(() => {
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

  const filteredActionables = useMemo(() => {
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
      if (!question || !String(item.response || "").trim()) return;
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

    const charts: Array<{ title: string; slices: PieSlice[] }> = [];
    byQuestion.forEach((entry, question) => {
      if (!isChoiceQuestionType(entry.questionType)) return;
      const slices = buildAnswerSlices(entry.rows);
      if (!slices || slices.length < 1) return;
      charts.push({ title: question, slices });
    });
    return charts;
  }, [filteredResponses]);

  const itemCount =
    activeView === "vision"
      ? filteredVisionMission.length
      : activeView === "notes"
        ? filteredNotes.length
        : activeView === "actionable"
          ? filteredActionables.length
          : activeView === "summary"
            ? answerPieCharts.length
            : filteredResponses.length;

  return (
    <UserLayout contentClassName="user-layout-main-reports">
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
              className={activeView === "all" ? "active" : ""}
              onClick={() => setActiveView("all")}
            >
              <List size={16} strokeWidth={2.2} />
              All Responses
            </button>
            <button
              type="button"
              className={activeView === "summary" ? "active" : ""}
              onClick={() => setActiveView("summary")}
            >
              <LineChart size={16} strokeWidth={2.2} />
              Summary View
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
                    <th>Participant</th>
                    <th>Category</th>
                    <th>Vision</th>
                    <th>Mission</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisionMission.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No Vision & Mission responses found.</td>
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
                      <td colSpan={6}>No responses found.</td>
                    </tr>
                  ) : (
                    filteredResponses.map((item, index) => (
                      <tr
                        key={`${item.participant}-${item.question}-${index}`}
                      >
                        <td>{item.participant}</td>
                        <td>
                          {item.category?.split(">").pop()?.trim() || "-"}
                        </td>
                        <td>{item.question}</td>
                        <td className="export-text-cell">
                          {item.response ? item.response : "-"}
                        </td>
                        <td className="export-text-cell">
                          {item.note ? item.note : "-"}
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
