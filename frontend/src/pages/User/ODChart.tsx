import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  Minus,
  Plus,
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
  prefetchCategoryQuestions,
} from "../../utils/workshopCache";import { setSelectedWorkshop } from "../../utils/selectedWorkshop";
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

function normalizeCategoryName(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/isations?/g, (match) =>
      match.replace("sation", "zation").replace("sations", "zations")
    )
    .replace(/&/g, " ")
    .replace(/\//g, " ")
    .replace(/\band\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryNameKey(value: string) {
  const normalized = normalizeCategoryName(value);
  if (!normalized) {
    return "";
  }
  const tokens = normalized.split(" ").filter(Boolean);
  const hasTangiblePair =
    tokens.includes("tangible") && tokens.includes("intangible");
  if (hasTangiblePair || tokens.length >= 4) {
    return [...tokens].sort().join(" ");
  }
  return normalized;
}

function categoryNamesMatch(a: string, b: string) {
  const left = categoryNameKey(a);
  const right = categoryNameKey(b);
  return Boolean(left) && left === right;
}

/** Merge Azure duplicates like Realization/Realisation or Tangible/Intangible word swaps. */
function dedupeLeavesByName(leaves: Leaf[]): Leaf[] {
  const unique: Leaf[] = [];
  for (const leaf of leaves) {
    const match = unique.find((item) =>
      categoryNamesMatch(item.name, leaf.name)
    );
    if (match) {
      if ((leaf.name || "").length > (match.name || "").length) {
        match.name = leaf.name;
      }
      continue;
    }
    unique.push({ ...leaf });
  }
  return unique;
}

function dedupeTopsByName(tops: Top[]): Top[] {
  const mergeMiddles = (middles: Middle[]): Middle[] => {
    const merged: Middle[] = [];
    for (const middle of middles) {
      const existing = merged.find((item) =>
        categoryNamesMatch(item.name, middle.name)
      );
      if (!existing) {
        merged.push({
          ...middle,
          parents: middle.parents.map((parent) => ({
            ...parent,
            leaves: dedupeLeavesByName(parent.leaves),
          })),
        });
        continue;
      }

      for (const parent of middle.parents) {
        const existingParent = existing.parents.find((item) =>
          categoryNamesMatch(item.name, parent.name)
        );
        if (!existingParent) {
          existing.parents.push({
            ...parent,
            leaves: dedupeLeavesByName(parent.leaves),
          });
          continue;
        }
        for (const leaf of parent.leaves) {
          const existingLeaf = existingParent.leaves.find((item) =>
            categoryNamesMatch(item.name, leaf.name)
          );
          if (existingLeaf) {
            if ((leaf.name || "").length > (existingLeaf.name || "").length) {
              existingLeaf.name = leaf.name;
            }
            continue;
          }
          existingParent.leaves.push({ ...leaf });
        }
        existingParent.leaves = dedupeLeavesByName(existingParent.leaves);
      }
    }
    return merged;
  };

  const mergedTops: Top[] = [];
  for (const top of tops) {
    const existing = mergedTops.find((item) =>
      categoryNamesMatch(item.name, top.name)
    );
    if (!existing) {
      mergedTops.push({
        ...top,
        middles: mergeMiddles(top.middles),
      });
      continue;
    }
    existing.middles = mergeMiddles([...existing.middles, ...top.middles]);
    if ((top.name || "").length > (existing.name || "").length) {
      existing.name = top.name;
    }
  }
  return mergedTops;
}

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
  onPrefetch,
}: {
  leaf: Leaf;
  highlighted: boolean;
  restoreFocus?: boolean;
  onOpen: () => void;
  onPrefetch?: () => void;
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
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onClick={onOpen}
    >
      {leaf.name}
    </button>
  );
}

/**
 * Explicit DOM connectors. Leaf/parent siblings are always a horizontal row.
 * Optional `colWidths` lets root tops keep their natural width (no huge empty gaps).
 */
function TreeFork({
  count,
  colWidth,
  colWidths,
  children,
  className = "",
}: {
  count: number;
  colWidth: number;
  colWidths?: number[];
  children: ReactNode;
  className?: string;
}) {
  const n = Math.max(count, 1);
  const single = n <= 1;
  const childArray = Children.toArray(children);
  const widths =
    colWidths && colWidths.length === n
      ? colWidths.map((width) => Math.max(width, 1))
      : Array.from({ length: n }, () => Math.max(colWidth, 1));
  const rowWidth = widths.reduce((sum, width) => sum + width, 0);
  const firstCenter = widths[0] / 2;
  const lastCenter = rowWidth - widths[n - 1] / 2;
  const busWidth = Math.max(lastCenter - firstCenter, 0);

  return (
    <div
      className={`od-fork ${single ? "is-single" : "is-multi"} ${className}`.trim()}
      style={
        {
          "--od-n": String(n),
          "--od-col-w": `${widths[0]}px`,
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
          style={{
            width: busWidth,
            alignSelf: "flex-start",
            marginLeft: firstCenter,
          }}
        />
      ) : null}
      <div
        className="od-fork-row"
        style={{
          display: "grid",
          gridTemplateColumns: widths.map((width) => `${width}px`).join(" "),
          width: rowWidth,
          gridAutoFlow: "column",
        }}
      >
        {childArray.map((child, index) => (
          <div
            key={child.key ?? index}
            className="od-fork-col"
            style={{ width: widths[index], maxWidth: widths[index] }}
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

/** Expand every top / middle / parent so the full tree is visible. */
function expandAllChartNodes(tops: Top[]) {
  try {
    const raw = localStorage.getItem(OD_CHART_EXPAND_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, TopExpandState>) : {};
    tops.forEach((top) => {
      all[top.id] = {
        open: true,
        middles: top.middles.map((middle) => middle.id),
        parents: top.middles.flatMap((middle) =>
          middle.parents.map((parent) => parent.id)
        ),
      };
    });
    localStorage.setItem(OD_CHART_EXPAND_KEY, JSON.stringify(all));
  } catch {
    // ignore storage failures
  }
}

/** Collapse every top / middle / parent back to the root tabs only. */
function collapseAllChartNodes(tops: Top[]) {
  try {
    const raw = localStorage.getItem(OD_CHART_EXPAND_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, TopExpandState>) : {};
    tops.forEach((top) => {
      all[top.id] = { open: false, middles: [], parents: [] };
    });
    localStorage.setItem(OD_CHART_EXPAND_KEY, JSON.stringify(all));
  } catch {
    // ignore storage failures
  }
}

/** Slot per cell = node box + modest gutter (avoid both congestion and huge gaps). */
const SLOT_PX = 168;
/** Fixed width for collapsed top tab buttons (matches --od-top-tab-w). */
const TOP_TAB_PX = 200;
/** Fork column width for collapsed tops — small gap between green tabs. */
const TOP_COL_PX = 220;

function parentBranchWidth(parent: Parent, parentOpen: boolean) {
  if (!parentOpen || parent.leaves.length === 0) {
    return SLOT_PX;
  }
  // Pack leaves tightly — each leaf owns one slot, no extra gutter.
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
  // Sum natural parent widths (do not equalize to the widest sibling).
  return middle.parents.reduce(
    (sum, parent) => sum + parentBranchWidth(parent, isParentOpen(parent)),
    0
  );
}

function ColumnTree({
  top,
  search,
  focusLeafId,
  onOpenLeaf,
  onBranchWidthChange,
  expandSyncNonce = 0,
  expandAllOpen = true,
  onManualToggle,
  onPrefetchLeaf,
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
  expandSyncNonce?: number;
  expandAllOpen?: boolean;
  onManualToggle?: () => void;
  onPrefetchLeaf?: (leafId: string) => void;
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
      // Only restore deeper levels when returning to a focused leaf.
      if (!focusLeafId) {
        return new Set();
      }
      const saved = readTopExpandState(top.id);
      return new Set(saved.middles.filter((id) => middleIdSet.has(id)));
    }
  );
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(
    () => {
      if (!focusLeafId) {
        return new Set();
      }
      const saved = readTopExpandState(top.id);
      return new Set(saved.parents.filter((id) => parentIdSet.has(id)));
    }
  );
  const keepInViewIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!expandSyncNonce) {
      return;
    }
    if (expandAllOpen) {
      setTopExpanded(true);
      setExpandedMiddleIds(new Set(top.middles.map((middle) => middle.id)));
      setExpandedParentIds(
        new Set(
          top.middles.flatMap((middle) =>
            middle.parents.map((parent) => parent.id)
          )
        )
      );
      return;
    }
    setTopExpanded(false);
    setExpandedMiddleIds(new Set());
    setExpandedParentIds(new Set());
  }, [expandSyncNonce, expandAllOpen, top]);

  const rememberNodeView = (nodeId: string) => {
    keepInViewIdRef.current = nodeId;
    captureOdScrollAnchor(nodeId);
  };

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

  const toggleTop = () => {
    rememberNodeView(top.id);
    onManualToggle?.();
    setTopExpanded((open) => {
      // Always reset nested levels so only the immediate children show.
      setExpandedMiddleIds(new Set());
      setExpandedParentIds(new Set());
      return !open;
    });
  };

  const toggleMiddle = (middleId: string) => {
    rememberNodeView(middleId);
    onManualToggle?.();
    setExpandedMiddleIds((prev) => {
      if (prev.has(middleId)) {
        const middle = top.middles.find((item) => item.id === middleId);
        setExpandedParentIds((parents) => {
          const cleaned = new Set(parents);
          middle?.parents.forEach((parent) => cleaned.delete(parent.id));
          return cleaned;
        });
        const next = new Set(prev);
        next.delete(middleId);
        return next;
      }

      // Keep sibling middles open so Inventory stays visible when
      // Receivables (or another middle) is expanded.
      const next = new Set(prev);
      next.add(middleId);
      const middle = top.middles.find((item) => item.id === middleId);
      middle?.parents.forEach((parent) => {
        parent.leaves.forEach((leaf) => onPrefetchLeaf?.(leaf.id));
      });
      return next;
    });
  };

  const toggleParent = (parentId: string) => {
    rememberNodeView(parentId);
    onManualToggle?.();
    setExpandedParentIds((prev) => {
      if (prev.has(parentId)) {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      }

      // Keep sibling parents open under the same middle.
      const middle = top.middles.find((item) =>
        item.parents.some((parent) => parent.id === parentId)
      );
      const parent = middle?.parents.find((item) => item.id === parentId);
      parent?.leaves.forEach((leaf) => onPrefetchLeaf?.(leaf.id));
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });
  };

  const middleColWidths = top.middles.map((middle) =>
    middleBranchWidth(middle, isMiddleExpanded(middle), isParentExpanded)
  );

  const branchWidth =
    effectiveTopExpanded && top.middles.length > 0
      ? Math.max(
          TOP_COL_PX,
          middleColWidths.reduce((sum, width) => sum + width, 0)
        )
      : TOP_COL_PX;

  useEffect(() => {
    onBranchWidthChange?.(top.id, branchWidth);
  }, [top.id, branchWidth, onBranchWidthChange]);

  useLayoutEffect(() => {
    if (!keepInViewIdRef.current) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      // Keep anchor for the follow-up sibling-width equalize pass.
      restoreOdScrollAnchor(false);
      keepInViewIdRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [topExpanded, expandedMiddleIds, expandedParentIds, branchWidth]);

  return (
    <section
      className={`od-dash-column ${
        effectiveTopExpanded ? "is-top-expanded" : "is-top-collapsed"
      }`}
    >
      <button
        type="button"
        data-od-node-id={top.id}
        className={`od-dash-column-header ${assignedClass(headerAssigned)}`}
        aria-expanded={effectiveTopExpanded}
        title={
          effectiveTopExpanded
            ? "Hide categories"
            : "Show categories under this tab"
        }
        onClick={toggleTop}
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
            <TreeFork
              count={top.middles.length}
              colWidth={SLOT_PX}
              colWidths={middleColWidths}
            >
              {top.middles.map((middle) => {
                const middleOpen = isMiddleExpanded(middle);
                const parentColWidths = middle.parents.map((parent) =>
                  parentBranchWidth(parent, isParentExpanded(parent))
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
                      data-od-node-id={middle.id}
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
                        colWidth={SLOT_PX}
                        colWidths={parentColWidths}
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
                                  data-od-node-id={parent.id}
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
                                        onPrefetch={() =>
                                          onPrefetchLeaf?.(leaf.id)
                                        }
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

const DEFAULT_ZOOM = 1;

/** Keeps the clicked node in view after expand/collapse reflow. */
const odScrollAnchor: {
  nodeId: string | null;
  viewX: number | null;
} = {
  nodeId: null,
  viewX: null,
};

function captureOdScrollAnchor(nodeId: string) {
  odScrollAnchor.nodeId = nodeId;
  const el = document.querySelector(
    `[data-od-node-id="${CSS.escape(nodeId)}"]`
  ) as HTMLElement | null;
  const board = el?.closest(".od-dash-board") as HTMLElement | null;
  if (!el || !board) {
    odScrollAnchor.viewX = null;
    return;
  }
  odScrollAnchor.viewX =
    el.getBoundingClientRect().left - board.getBoundingClientRect().left;
}

function restoreOdScrollAnchor(clear = true) {
  const { nodeId, viewX } = odScrollAnchor;
  if (!nodeId) {
    return;
  }

  const el = document.querySelector(
    `[data-od-node-id="${CSS.escape(nodeId)}"]`
  ) as HTMLElement | null;
  const board = el?.closest(".od-dash-board") as HTMLElement | null;

  if (el && board && viewX !== null) {
    const currentX =
      el.getBoundingClientRect().left - board.getBoundingClientRect().left;
    board.scrollLeft += currentX - viewX;
  } else if (el) {
    el.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "nearest",
    });
  }

  if (clear) {
    odScrollAnchor.nodeId = null;
    odScrollAnchor.viewX = null;
  }
}

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
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
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
  const [expandSyncNonce, setExpandSyncNonce] = useState(0);
  const [allNodesOpen, setAllNodesOpen] = useState(false);

  const zoomPercent = Math.round(zoom * 100);

  const toggleAllNodes = useCallback(() => {
    const nextOpen = !allNodesOpen;
    if (nextOpen) {
      expandAllChartNodes(tops);
    } else {
      collapseAllChartNodes(tops);
    }
    setAllNodesOpen(nextOpen);
    setExpandSyncNonce((nonce) => nonce + 1);
  }, [allNodesOpen, tops]);

  const clearAllNodesOpenFlag = useCallback(() => {
    setAllNodesOpen(false);
  }, []);

  const prefetchLeaf = useCallback((leafId: string) => {
    const { participant, workshop } = getActiveWorkshopContext();
    if (!participant?.id || !workshop?.id || !workshop.templateId) {
      return;
    }
    prefetchCategoryQuestions({
      categoryId: leafId,
      participantId: participant.id,
      workshopId: workshop.id,
      templateId: workshop.templateId,
    });
  }, []);

  const reportTopBranchWidth = useCallback((topId: string, width: number) => {
    setTopBranchWidths((prev) =>
      prev[topId] === width ? prev : { ...prev, [topId]: width }
    );
  }, []);

  const topColWidths = useMemo(
    () => tops.map((top) => topBranchWidths[top.id] ?? TOP_COL_PX),
    [tops, topBranchWidths]
  );

  const topWidthsKey = topColWidths.join(",");

  const measureNaturalSize = useCallback(() => {
    const content = contentRef.current;
    if (!content) {
      return { width: 0, height: 0 };
    }
    const prevTransform = content.style.transform;
    content.style.transform = "none";
    const width = Math.max(content.scrollWidth, content.offsetWidth, 1);
    const height = Math.max(content.scrollHeight, content.offsetHeight, 1);
    content.style.transform = prevTransform;
    return { width, height };
  }, []);

  useLayoutEffect(() => {
    // Width changes after expand/collapse — keep the clicked node in view.
    const frame = window.requestAnimationFrame(() => {
      restoreOdScrollAnchor(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [topWidthsKey]);

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(1.6, Math.max(0.55, next));
    setZoom(clamped);
  }, []);

  const fitToWidth = useCallback(() => {
    const board = boardRef.current;
    const content = contentRef.current;
    if (!board || !content) return;

    const measured = measureNaturalSize();
    setNaturalSize(measured);
    const available = Math.max(board.clientWidth - 32, 280);
    // Only shrink when the tree is wider than the board; never upscale.
    applyZoom(measured.width > available ? available / measured.width : 1);
  }, [applyZoom, measureNaturalSize]);

  // Remeasure whenever the tree geometry changes (expand/collapse, zoom).
  useLayoutEffect(() => {
    if (tops.length === 0) {
      return;
    }

    const applyMeasure = () => {
      const measured = measureNaturalSize();
      setNaturalSize((prev) =>
        prev.width === measured.width && prev.height === measured.height
          ? prev
          : measured
      );
    };

    applyMeasure();
    // Second pass after browser paints nested forks (parent/leaf rows).
    const frame = window.requestAnimationFrame(() => {
      applyMeasure();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [measureNaturalSize, tops.length, topWidthsKey, zoom, expandSyncNonce]);

  // Keep stage size in sync if content grows after paint (expanded branches).
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      const measured = measureNaturalSize();
      setNaturalSize((prev) =>
        prev.width === measured.width && prev.height === measured.height
          ? prev
          : measured
      );
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [measureNaturalSize]);

  // Fit once when chart data arrives. Do not re-fit on expand/collapse —
  // that rescales the board and makes sibling nodes appear to jump/hide.
  useEffect(() => {
    if (tops.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      fitToWidth();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitToWidth, tops.length]);

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
      <button
        type="button"
        className="od-dash-banner"
        onClick={toggleAllNodes}
        title={allNodesOpen ? "Collapse all nodes" : "Expand all nodes"}
        aria-label={
          allNodesOpen
            ? "Collapse all Unlock Value nodes"
            : "Expand all Unlock Value nodes"
        }
        aria-expanded={allNodesOpen}
      >
        <h1>UNLOCK VALUE</h1>
      </button>

      <div className="od-dash-board" ref={boardRef}>
        <div
          className="od-dash-zoom-stage"
          style={
            naturalSize.width > 0
              ? {
                  width: naturalSize.width * zoom,
                  height: naturalSize.height * zoom,
                }
              : undefined
          }
        >
          <div
            className="od-dash-content"
            ref={contentRef}
            style={{
              ["--od-col-count" as string]: String(columnCount),
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <TreeFork
              className="od-fork-root"
              count={columnCount}
              colWidth={TOP_COL_PX}
              colWidths={topColWidths}
            >
              {tops.map((top) => (
                <ColumnTree
                  key={top.id}
                  top={top}
                  search=""
                  focusLeafId={focusLeafId}
                  onOpenLeaf={onOpenLeaf}
                  onBranchWidthChange={reportTopBranchWidth}
                  expandSyncNonce={expandSyncNonce}
                  expandAllOpen={allNodesOpen}
                  onManualToggle={clearAllNodesOpenFlag}
                  onPrefetchLeaf={prefetchLeaf}
                />
              ))}
            </TreeFork>
          </div>
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

        // Prefer local workshop context. Only hit the API when template is missing.
        if (
          participant?.id &&
          (!activeWorkshop?.templateId || !activeWorkshop?.id)
        ) {
          const workshopData = await fetchParticipantWorkshops(
            participant.id,
            participant.organizationId || activeWorkshop?.organizationId || ""
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
            organizationId
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

        // Show cached chart immediately; refresh in background only when cold.
        const cached = workshopInfo.templateId
          ? getCachedOdChart(workshopInfo.templateId)
          : null;
        if (cached?.success && Array.isArray(cached.tops) && !cancelled) {
          setWorkshop(workshopInfo);
          setTops(sortTopsForDisplay((cached.tops || []) as Top[]));
          setLoading(false);
          return;
        }

        const chartData = await fetchOdChart(
          workshopInfo.templateId,
          workshopInfo.id
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
  return sortTopsForDisplay(filterAssignedTops(dedupeTopsByName(tops)));
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
