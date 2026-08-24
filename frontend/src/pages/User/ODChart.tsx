import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CircleDollarSign,
  Gem,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  fetchParticipantWorkshops,
  fetchOdChart,
  getActiveWorkshopContext,
  getCachedOdChart,
  getWorkshopModuleAccessStatus,
} from "../../utils/workshopCache";
import { setSelectedWorkshop } from "../../utils/selectedWorkshop";
import ODChartShell from "./ODChartShell";
import "../../styles/ODChart.css";

export type Question = {
  id: string;
  question: string;
  answerType: string;
  options: string[];
  tagId?: string;
  tagName?: string;
  tagColor?: string;
  attachmentsApplicable?: "Y" | "N";
};

export type Leaf = {
  id: string;
  name: string;
  fullPath: string;
  tagId?: string;
  tagColor?: string;
  hasAssignedQuestions?: boolean;
  assignedQuestionCount?: number;
  questions?: Question[];
};

export type Parent = {
  id: string;
  name: string;
  leaves: Leaf[];
};

export type Middle = {
  id: string;
  name: string;
  parents: Parent[];
};

export type Top = {
  id: string;
  name: string;
  middles: Middle[];
};

export type WorkshopInfo = {
  id: string;
  workshopName: string;
  templateId: string;
  templateName: string;
  organizationName: string;
  endDate?: string;
  canEdit?: boolean;
};

export type ODQuestionsNavState = {
  breadcrumb: string[];
  leaf: Leaf;
  workshop: WorkshopInfo;
};

export const OD_CHART_NAV_KEY = "od-chart-questions-nav";

function leafHasAssignedQuestions(leaf: Leaf) {
  return leaf.hasAssignedQuestions === true;
}

function parentHasAssignedQuestions(parent: Parent) {
  return parent.leaves.some(leafHasAssignedQuestions);
}

function middleHasAssignedQuestions(middle: Middle) {
  return middle.parents.some(parentHasAssignedQuestions);
}

function topHasAssignedQuestions(top: Top) {
  return top.middles.some(middleHasAssignedQuestions);
}

function assignedClass(hasAssigned: boolean) {
  return hasAssigned ? "is-assigned" : "is-unassigned";
}

/** Display order only — left→right pillars. Hierarchy inside each top is unchanged. */
const TOP_DISPLAY_ORDER = [
  "markets",
  "operating",
  "intangible",
  "business planning",
];

function sortTopsForDisplay(tops: Top[]): Top[] {
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    const index = TOP_DISPLAY_ORDER.findIndex((key) => lower.includes(key));
    return index === -1 ? 99 : index;
  };

  return [...tops].sort((a, b) => rank(a.name) - rank(b.name));
}

function filterAssignedTops(tops: Top[]): Top[] {
  return tops
    .map((top) => ({
      ...top,
      middles: top.middles
        .map((middle) => ({
          ...middle,
          parents: middle.parents
            .map((parent) => ({
              ...parent,
              leaves: parent.leaves.filter(
                (leaf) => leaf.hasAssignedQuestions === true
              ),
            }))
            .filter((parent) => parent.leaves.length > 0),
        }))
        .filter((middle) => middle.parents.length > 0),
    }))
    .filter((top) => top.middles.length > 0);
}

function topIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  if (lower.includes("market")) return Users;
  if (lower.includes("operating") || lower.includes("cost")) {
    return CircleDollarSign;
  }
  if (lower.includes("asset") || lower.includes("inventory")) return Gem;
  return Target;
}

function matchesSearch(text: string, query: string) {
  if (!query.trim()) return false;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function LeafNode({
  leaf,
  highlighted,
  restoreFocus,
  onOpen,
}: {
  leaf: Leaf;
  highlighted: boolean;
  restoreFocus?: boolean;
  onOpen: () => void;
}) {
  const assigned = leafHasAssignedQuestions(leaf);
  const tagColor = leaf.tagColor || "#9b304a";

  return (
    <button
      type="button"
      data-od-leaf-id={leaf.id}
      className={`od-dash-node od-dash-leaf ${assignedClass(assigned)} ${
        highlighted ? "is-search-hit" : ""
      } ${restoreFocus ? "is-restore-focus" : ""}`}
      style={
        assigned
          ? {
              borderColor: tagColor,
              background: tagColor,
              color: "#ffffff",
            }
          : undefined
      }
      title={
        assigned
          ? "Open questions"
          : "No questions assigned for your workshop"
      }
      onClick={onOpen}
    >
      {leaf.name}
    </button>
  );
}

/**
 * Explicit DOM connectors. Leaf/parent siblings are always a horizontal row.
 */
function TreeFork({
  count,
  colWidth,
  children,
  className = "",
}: {
  count: number;
  colWidth: number;
  children: ReactNode;
  className?: string;
}) {
  const n = Math.max(count, 1);
  const single = n <= 1;
  const childArray = Children.toArray(children);
  const rowWidth = n * colWidth;

  return (
    <div
      className={`od-fork ${single ? "is-single" : "is-multi"} ${className}`.trim()}
      style={
        {
          "--od-n": String(n),
          "--od-col-w": `${colWidth}px`,
          width: rowWidth,
        } as CSSProperties
      }
    >
      <div
        className={`od-fork-stem ${single ? "is-long" : ""}`}
        aria-hidden
      />
      {!single ? (
        <div
          className="od-fork-bus"
          aria-hidden
          style={{ width: Math.max(n - 1, 0) * colWidth }}
        />
      ) : null}
      <div
        className="od-fork-row"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, ${colWidth}px)`,
          width: rowWidth,
          gridAutoFlow: "column",
        }}
      >
        {childArray.map((child, index) => (
          <div
            key={index}
            className="od-fork-col"
            style={{ width: colWidth, maxWidth: colWidth }}
          >
            {!single ? <div className="od-fork-drop" aria-hidden /> : null}
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

const OD_CHART_EXPAND_KEY = "gyb-od-chart-expand-v1";
const OD_CHART_FOCUS_KEY = "gyb-od-chart-focus-v1";

type TopExpandState = {
  open: boolean;
  middles: string[];
  parents: string[];
};

type ChartFocusState = {
  leafId: string;
  topId: string;
  middleId: string;
  parentId: string;
};

function readChartFocus(): ChartFocusState | null {
  try {
    const raw = sessionStorage.getItem(OD_CHART_FOCUS_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ChartFocusState;
    if (!parsed?.leafId || !parsed?.topId) {
      return null;
    }
    return {
      leafId: String(parsed.leafId),
      topId: String(parsed.topId),
      middleId: String(parsed.middleId || ""),
      parentId: String(parsed.parentId || ""),
    };
  } catch {
    return null;
  }
}

function writeChartFocus(focus: ChartFocusState) {
  try {
    sessionStorage.setItem(OD_CHART_FOCUS_KEY, JSON.stringify(focus));
  } catch {
    // ignore
  }
}

function clearChartFocus() {
  try {
    sessionStorage.removeItem(OD_CHART_FOCUS_KEY);
  } catch {
    // ignore
  }
}

function ensureFocusExpanded(focus: ChartFocusState) {
  const saved = readTopExpandState(focus.topId);
  const middles = new Set(saved.middles);
  const parents = new Set(saved.parents);
  if (focus.middleId) {
    middles.add(focus.middleId);
  }
  if (focus.parentId) {
    parents.add(focus.parentId);
  }
  writeTopExpandState(focus.topId, {
    open: true,
    middles: Array.from(middles),
    parents: Array.from(parents),
  });
}

function readTopExpandState(topId: string): TopExpandState {
  try {
    const raw = localStorage.getItem(OD_CHART_EXPAND_KEY);
    if (!raw) {
      return { open: false, middles: [], parents: [] };
    }
    const all = JSON.parse(raw) as Record<string, TopExpandState>;
    const saved = all?.[topId];
    if (!saved || typeof saved !== "object") {
      return { open: false, middles: [], parents: [] };
    }
    return {
      open: Boolean(saved.open),
      middles: Array.isArray(saved.middles)
        ? saved.middles.map(String)
        : [],
      parents: Array.isArray(saved.parents)
        ? saved.parents.map(String)
        : [],
    };
  } catch {
    return { open: false, middles: [], parents: [] };
  }
}

function writeTopExpandState(topId: string, state: TopExpandState) {
  try {
    const raw = localStorage.getItem(OD_CHART_EXPAND_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, TopExpandState>) : {};
    all[topId] = state;
    localStorage.setItem(OD_CHART_EXPAND_KEY, JSON.stringify(all));
  } catch {
    // ignore storage failures
  }
}

/** One shared slot size for every tree cell — keep CSS box width below this. */
const SLOT_PX = 176;
/** Fixed width for collapsed top tab buttons (matches --od-top-tab-w). */
const TOP_TAB_PX = 240;
/** Fork column width including gap between top tabs. */
const TOP_COL_PX = 280;

function parentBranchWidth(parent: Parent, parentOpen: boolean) {
  if (!parentOpen || parent.leaves.length === 0) {
    return SLOT_PX;
  }
  return parent.leaves.length * SLOT_PX;
}

function middleBranchWidth(
  middle: Middle,
  middleOpen: boolean,
  isParentOpen: (parent: Parent) => boolean
) {
  if (!middleOpen || middle.parents.length === 0) {
    return SLOT_PX;
  }
  const parentWidths = middle.parents.map((parent) =>
    parentBranchWidth(parent, isParentOpen(parent))
  );
  const colW = Math.max(SLOT_PX, ...parentWidths);
  return middle.parents.length * colW;
}

function equalSiblingColWidth(widths: number[], floor = SLOT_PX) {
  if (widths.length === 0) {
    return floor;
  }
  return Math.max(floor, ...widths);
}

function ColumnTree({
  top,
  search,
  focusLeafId,
  onOpenLeaf,
  onBranchWidthChange,
}: {
  top: Top;
  search: string;
  focusLeafId?: string | null;
  onOpenLeaf: (
    top: Top,
    middle: Middle,
    parent: Parent,
    leaf: Leaf
  ) => void;
  onBranchWidthChange?: (topId: string, width: number) => void;
}) {
  const Icon = topIcon(top.name);
  const headerAssigned = topHasAssignedQuestions(top);
  const middleIdSet = useMemo(
    () => new Set(top.middles.map((item) => item.id)),
    [top.middles]
  );
  const parentIdSet = useMemo(() => {
    const ids = new Set<string>();
    top.middles.forEach((middle) => {
      middle.parents.forEach((parent) => ids.add(parent.id));
    });
    return ids;
  }, [top.middles]);

  const [topExpanded, setTopExpanded] = useState(
    () => readTopExpandState(top.id).open
  );
  const [expandedMiddleIds, setExpandedMiddleIds] = useState<Set<string>>(
    () => {
      const saved = readTopExpandState(top.id);
      return new Set(saved.middles.filter((id) => middleIdSet.has(id)));
    }
  );
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(
    () => {
      const saved = readTopExpandState(top.id);
      return new Set(saved.parents.filter((id) => parentIdSet.has(id)));
    }
  );

  useEffect(() => {
    writeTopExpandState(top.id, {
      open: topExpanded,
      middles: Array.from(expandedMiddleIds),
      parents: Array.from(expandedParentIds),
    });
  }, [top.id, topExpanded, expandedMiddleIds, expandedParentIds]);

  const searchActive = Boolean(search.trim());

  const effectiveTopExpanded = useMemo(() => {
    if (!searchActive) {
      return topExpanded;
    }
    return top.middles.some(
      (middle) =>
        matchesSearch(middle.name, search) ||
        middle.parents.some(
          (parent) =>
            matchesSearch(parent.name, search) ||
            parent.leaves.some((leaf) => matchesSearch(leaf.name, search))
        )
    );
  }, [searchActive, search, top.middles, topExpanded]);

  const isMiddleExpanded = (middle: Middle) => {
    if (expandedMiddleIds.has(middle.id)) {
      return true;
    }
    if (!searchActive) {
      return false;
    }
    return (
      matchesSearch(middle.name, search) ||
      middle.parents.some(
        (parent) =>
          matchesSearch(parent.name, search) ||
          parent.leaves.some((leaf) => matchesSearch(leaf.name, search))
      )
    );
  };

  const isParentExpanded = (parent: Parent) => {
    if (expandedParentIds.has(parent.id)) {
      return true;
    }
    if (!searchActive) {
      return false;
    }
    return (
      matchesSearch(parent.name, search) ||
      parent.leaves.some((leaf) => matchesSearch(leaf.name, search))
    );
  };

  const toggleMiddle = (middleId: string) => {
    setExpandedMiddleIds((prev) => {
      const next = new Set(prev);
      if (next.has(middleId)) {
        next.delete(middleId);
        const middle = top.middles.find((item) => item.id === middleId);
        if (middle) {
          setExpandedParentIds((parents) => {
            const cleaned = new Set(parents);
            middle.parents.forEach((parent) => cleaned.delete(parent.id));
            return cleaned;
          });
        }
      } else {
        next.add(middleId);
      }
      return next;
    });
  };

  const toggleParent = (parentId: string) => {
    setExpandedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const middleColWidth = equalSiblingColWidth(
    top.middles.map((middle) =>
      middleBranchWidth(middle, isMiddleExpanded(middle), isParentExpanded)
    )
  );

  const branchWidth =
    effectiveTopExpanded && top.middles.length > 0
      ? Math.max(TOP_COL_PX, top.middles.length * middleColWidth)
      : TOP_COL_PX;

  useEffect(() => {
    onBranchWidthChange?.(top.id, branchWidth);
  }, [top.id, branchWidth, onBranchWidthChange]);

  return (
    <section
      className={`od-dash-column ${
        effectiveTopExpanded ? "is-top-expanded" : "is-top-collapsed"
      }`}
    >
      <button
        type="button"
        className={`od-dash-column-header ${assignedClass(headerAssigned)}`}
        aria-expanded={effectiveTopExpanded}
        title={
          effectiveTopExpanded
            ? "Hide categories"
            : "Show categories under this tab"
        }
        onClick={() => setTopExpanded((open) => !open)}
      >
        <span className="od-dash-column-icon" aria-hidden>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <h2>{top.name}</h2>
      </button>

      {effectiveTopExpanded ? (
        <div className="od-dash-column-body">
          {top.middles.length === 0 ? (
            <p className="od-dash-empty">No sub-categories</p>
          ) : (
            <TreeFork count={top.middles.length} colWidth={middleColWidth}>
              {top.middles.map((middle) => {
                const middleOpen = isMiddleExpanded(middle);
                const parentColWidth = equalSiblingColWidth(
                  middle.parents.map((parent) =>
                    parentBranchWidth(parent, isParentExpanded(parent))
                  )
                );

                return (
                  <div
                    key={middle.id}
                    className={`od-fork-block ${
                      middleOpen ? "is-middle-expanded" : "is-middle-collapsed"
                    }`}
                  >
                    <button
                      type="button"
                      className={`od-dash-node od-dash-middle ${assignedClass(
                        middleHasAssignedQuestions(middle)
                      )} ${
                        matchesSearch(middle.name, search) ? "is-search-hit" : ""
                      }`}
                      aria-expanded={middleOpen}
                      title={
                        middleOpen
                          ? "Hide hierarchy"
                          : "Show hierarchy under this category"
                      }
                      onClick={() => toggleMiddle(middle.id)}
                    >
                      {middle.name}
                    </button>

                    {middleOpen && middle.parents.length > 0 ? (
                      <TreeFork
                        count={middle.parents.length}
                        colWidth={parentColWidth}
                      >
                        {middle.parents.map((parent) => {
                          const parentOpen = isParentExpanded(parent);
                          const hasLeaves = parent.leaves.length > 0;

                          return (
                            <div
                              key={parent.id}
                              className={`od-fork-block ${
                                parentOpen
                                  ? "is-parent-expanded"
                                  : "is-parent-collapsed"
                              }`}
                            >
                              {hasLeaves ? (
                                <button
                                  type="button"
                                  className={`od-dash-node od-dash-parent ${assignedClass(
                                    parentHasAssignedQuestions(parent)
                                  )} ${
                                    matchesSearch(parent.name, search)
                                      ? "is-search-hit"
                                      : ""
                                  }`}
                                  aria-expanded={parentOpen}
                                  title={
                                    parentOpen
                                      ? "Hide next level"
                                      : "Show next level"
                                  }
                                  onClick={() => toggleParent(parent.id)}
                                >
                                  {parent.name}
                                </button>
                              ) : (
                                <div
                                  className={`od-dash-node od-dash-parent ${assignedClass(
                                    parentHasAssignedQuestions(parent)
                                  )} ${
                                    matchesSearch(parent.name, search)
                                      ? "is-search-hit"
                                      : ""
                                  }`}
                                >
                                  {parent.name}
                                </div>
                              )}

                              {parentOpen && hasLeaves ? (
                                <TreeFork
                                  count={parent.leaves.length}
                                  colWidth={SLOT_PX}
                                >
                                  {parent.leaves.map((leaf) => (
                                    <div
                                      key={leaf.id}
                                      className="od-fork-leaf"
                                    >
                                      <LeafNode
                                        leaf={leaf}
                                        highlighted={matchesSearch(
                                          leaf.name,
                                          search
                                        )}
                                        restoreFocus={focusLeafId === leaf.id}
                                        onOpen={() =>
                                          onOpenLeaf(
                                            top,
                                            middle,
                                            parent,
                                            leaf
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                </TreeFork>
                              ) : null}
                            </div>
                          );
                        })}
                      </TreeFork>
                    ) : null}
                  </div>
                );
              })}
            </TreeFork>
          )}
        </div>
      ) : null}
    </section>
  );
}

const DEFAULT_ZOOM = 0.96;

function DashboardChart({
  tops,
  onOpenLeaf,
}: {
  tops: Top[];
  onOpenLeaf: (
    top: Top,
    middle: Middle,
    parent: Parent,
    leaf: Leaf
  ) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const restoreDoneRef = useRef(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [search, setSearch] = useState("");
  const [focusLeafId, setFocusLeafId] = useState<string | null>(() => {
    const focus = readChartFocus();
    if (!focus) {
      return null;
    }
    // Must run before ColumnTree mounts so expand state is already saved.
    ensureFocusExpanded(focus);
    return focus.leafId;
  });
  const [topBranchWidths, setTopBranchWidths] = useState<
    Record<string, number>
  >({});

  const zoomPercent = Math.round(zoom * 100);

  const reportTopBranchWidth = useCallback((topId: string, width: number) => {
    setTopBranchWidths((prev) =>
      prev[topId] === width ? prev : { ...prev, [topId]: width }
    );
  }, []);

  const topColWidth = useMemo(
    () =>
      equalSiblingColWidth(
        tops.map((top) => topBranchWidths[top.id] ?? TOP_COL_PX),
        TOP_COL_PX
      ),
    [tops, topBranchWidths]
  );

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(1.6, Math.max(0.55, next));
    setZoom(clamped);
  }, []);

  const fitToWidth = useCallback(() => {
    const board = boardRef.current;
    const content = contentRef.current;
    if (!board || !content) return;

    content.style.zoom = "1";
    const naturalWidth = Math.max(content.scrollWidth, 1);
    const available = Math.max(board.clientWidth - 16, 280);
    applyZoom(Math.min(1, available / naturalWidth));
  }, [applyZoom]);

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setSearch("");
    setFocusLeafId(null);
    clearChartFocus();
    if (boardRef.current) {
      boardRef.current.scrollLeft = 0;
      boardRef.current.scrollTop = 0;
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = boardRef.current?.closest(".od-dash") as HTMLElement | null;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    content.style.zoom = String(zoom);
  }, [zoom, tops]);

  useEffect(() => {
    if (!focusLeafId || restoreDoneRef.current || tops.length === 0) {
      return;
    }

    let attempts = 0;
    let timer = 0;

    const scrollToLeaf = () => {
      const board = boardRef.current;
      const leafEl = board?.querySelector(
        `[data-od-leaf-id="${CSS.escape(focusLeafId)}"]`
      ) as HTMLElement | null;

      if (!board || !leafEl) {
        attempts += 1;
        if (attempts < 20) {
          timer = window.setTimeout(scrollToLeaf, 50);
        }
        return;
      }

      restoreDoneRef.current = true;
      leafEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      clearChartFocus();

      window.setTimeout(() => {
        setFocusLeafId(null);
      }, 1800);
    };

    timer = window.setTimeout(scrollToLeaf, 80);
    return () => window.clearTimeout(timer);
  }, [focusLeafId, tops, topBranchWidths]);

  const columnCount = Math.max(tops.length, 1);

  return (
    <div className="od-dash">
      <div className="od-dash-banner">
        <h1>UNLOCK VALUE</h1>
        <div className="od-chart-legend" role="note">
          <span className="od-chart-legend-swatch od-chart-legend-swatch-assigned" />
          <p>
            <strong>Maroon</strong> = questions assigned
          </p>
        </div>
      </div>

      <div className="od-dash-board" ref={boardRef}>
        <div
          className="od-dash-content"
          ref={contentRef}
          style={{ ["--od-col-count" as string]: String(columnCount) }}
        >
          <TreeFork
            className="od-fork-root"
            count={columnCount}
            colWidth={topColWidth}
          >
            {tops.map((top) => (
              <ColumnTree
                key={top.id}
                top={top}
                search={search}
                focusLeafId={focusLeafId}
                onOpenLeaf={onOpenLeaf}
                onBranchWidthChange={reportTopBranchWidth}
              />
            ))}
          </TreeFork>
        </div>
      </div>

      <div className="od-dash-toolbar">
        <div className="od-dash-toolbar-group">
          <button
            type="button"
            className="od-dash-tool-btn"
            aria-label="Zoom out"
            onClick={() => applyZoom(zoom - 0.1)}
          >
            <Minus size={16} />
          </button>
          <span className="od-dash-zoom-label">{zoomPercent}%</span>
          <button
            type="button"
            className="od-dash-tool-btn"
            aria-label="Zoom in"
            onClick={() => applyZoom(zoom + 0.1)}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            className="od-dash-tool-btn od-dash-tool-text"
            onClick={fitToWidth}
          >
            Fit to Width
          </button>
        </div>

        <label className="od-dash-search">
          <Search size={15} aria-hidden />
          <input
            type="search"
            placeholder="Search nodes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="od-dash-toolbar-group">
          <button
            type="button"
            className="od-dash-tool-btn"
            aria-label="Reset view"
            title="Reset view"
            onClick={resetView}
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            className="od-dash-tool-btn"
            aria-label="Fullscreen"
            title="Fullscreen"
            onClick={toggleFullscreen}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getCachedChartBootstrap() {
  const { workshop, canEdit } = getActiveWorkshopContext();
  if (!workshop?.templateId) {
    return null;
  }

  const cached = getCachedOdChart(workshop.templateId);
  if (!cached?.success || !Array.isArray(cached.tops)) {
    return null;
  }

  return {
    workshopInfo: {
      id: workshop.id,
      workshopName: workshop.workshopName || "Workshop",
      templateId: workshop.templateId,
      templateName: workshop.templateName || "",
      organizationName: workshop.organizationName || "",
      endDate: workshop.endDate,
      canEdit,
    } as WorkshopInfo,
    tops: sortTopsForDisplay((cached.tops || []) as Top[]),
  };
}

export default function ODChart() {
  const navigate = useNavigate();
  const cachedBootstrap = getCachedChartBootstrap();
  const [loading, setLoading] = useState(!cachedBootstrap);
  const [errorMessage, setErrorMessage] = useState("");
  const [workshop, setWorkshop] = useState<WorkshopInfo | null>(
    cachedBootstrap?.workshopInfo || null
  );
  const [tops, setTops] = useState<Top[]>(cachedBootstrap?.tops || []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const { participant, workshop: selectedWorkshop, canEdit } =
        getActiveWorkshopContext();

      if (!getWorkshopModuleAccessStatus(selectedWorkshop).enabled) {
        navigate("/userdashboard", { replace: true });
        return;
      }

      if (!participant?.organizationId && !participant?.id) {
        if (!cancelled) {
          setErrorMessage("Organization not found. Please log in again.");
          setLoading(false);
        }
        return;
      }

      try {
        let activeWorkshop = selectedWorkshop;
        let workshopCanEdit = canEdit;

        // Always refresh from server so a stale local templateId
        // (e.g. Pre OD accidentally stored as OD) cannot hide chart branches.
        if (participant?.id) {
          const workshopData = await fetchParticipantWorkshops(
            participant.id,
            participant.organizationId || activeWorkshop?.organizationId || "",
            { forceRefresh: true }
          );

          if (workshopData.success && workshopData.workshop) {
            activeWorkshop = workshopData.workshop;
            workshopCanEdit = Boolean(workshopData.canEdit);

            const selected = getActiveWorkshopContext().selected;
            if (selected?.id === activeWorkshop.id) {
              setSelectedWorkshop({
                ...selected,
                templateId: activeWorkshop.templateId,
                templateName: activeWorkshop.templateName,
                workshopName: activeWorkshop.workshopName || selected.workshopName,
                organizationName:
                  activeWorkshop.organizationName || selected.organizationName,
                organizationId:
                  activeWorkshop.organizationId || selected.organizationId,
                preOdStartDate: activeWorkshop.preOdStartDate,
                startDate: activeWorkshop.startDate,
                endDate: activeWorkshop.endDate,
                preOdQuestionCount: activeWorkshop.preOdQuestionCount,
              });
            }
          }
        } else if (!activeWorkshop?.templateId) {
          const organizationId = participant.organizationId || "";
          const workshopData = await fetchParticipantWorkshops(
            "",
            organizationId,
            { forceRefresh: true }
          );

          if (!workshopData.success || !workshopData.workshop) {
            if (!cancelled) {
              setErrorMessage(
                "No workshop is scheduled for your organization yet."
              );
              setLoading(false);
            }
            return;
          }

          activeWorkshop = workshopData.workshop;
          workshopCanEdit = Boolean(workshopData.canEdit);
        }

        if (!activeWorkshop?.templateId && !activeWorkshop?.id) {
          if (!cancelled) {
            setErrorMessage(
              "This workshop does not have a template assigned."
            );
            setLoading(false);
          }
          return;
        }

        const workshopInfo: WorkshopInfo = {
          id: activeWorkshop.id,
          workshopName: activeWorkshop.workshopName || "Workshop",
          templateId: activeWorkshop.templateId || "",
          templateName: activeWorkshop.templateName || "",
          organizationName: activeWorkshop.organizationName || "",
          endDate: activeWorkshop.endDate,
          canEdit: workshopCanEdit,
        };

        // Show cached chart immediately while a network refresh runs.
        const cached = workshopInfo.templateId
          ? getCachedOdChart(workshopInfo.templateId)
          : null;
        if (cached?.success && Array.isArray(cached.tops) && !cancelled) {
          setWorkshop(workshopInfo);
          setTops(sortTopsForDisplay((cached.tops || []) as Top[]));
          setLoading(false);
        }

        const chartData = await fetchOdChart(
          workshopInfo.templateId,
          workshopInfo.id,
          { forceRefresh: true }
        );

        if (cancelled) {
          return;
        }

        if (!chartData.success) {
          setErrorMessage(chartData.message || "Unable to load OD chart.");
          setLoading(false);
          return;
        }

        const resolvedTemplateId = String(
          chartData.template?.id || workshopInfo.templateId
        ).trim();

        setWorkshop({
          ...workshopInfo,
          templateId: resolvedTemplateId || workshopInfo.templateId,
          templateName:
            chartData.template?.templateName || workshopInfo.templateName,
        });
        setTops(sortTopsForDisplay((chartData.tops || []) as Top[]));
        setLoading(false);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("Unable to load OD chart.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const openQuestions = (
    top: Top,
    middle: Middle,
    parent: Parent,
    leaf: Leaf
  ) => {
    if (!workshop || !leafHasAssignedQuestions(leaf)) {
      return;
    }

    const navState: ODQuestionsNavState = {
      breadcrumb: [
        "UNLOCK VALUE",
        top.name,
        middle.name,
        parent.name,
        leaf.name,
      ],
      leaf,
      workshop,
    };

    writeChartFocus({
      leafId: leaf.id,
      topId: top.id,
      middleId: middle.id,
      parentId: parent.id,
    });
    ensureFocusExpanded({
      leafId: leaf.id,
      topId: top.id,
      middleId: middle.id,
      parentId: parent.id,
    });

    sessionStorage.setItem(OD_CHART_NAV_KEY, JSON.stringify(navState));
    navigate("/od-chart/questions", { state: navState });
  };

const chartTops = useMemo(() => {
  return filterAssignedTops(tops);
}, [tops]);

  return (
    <ODChartShell>
      {loading ? (
        <p className="od-chart-status">Loading OD chart...</p>
      ) : errorMessage && !workshop ? (
        <div className="od-chart-error">{errorMessage}</div>
      ) : chartTops.length === 0 ? (
        <div className="od-chart-error">
          No categories found. Please contact your administrator.
        </div>
      ) : (
        <div className="od-chart-body">
          <DashboardChart tops={chartTops} onOpenLeaf={openQuestions} />
        </div>
      )}
    </ODChartShell>
  );
}
