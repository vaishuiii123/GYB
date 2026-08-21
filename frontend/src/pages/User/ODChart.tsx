import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  fetchWorkshopByOrganization,
  fetchOdChart,
  getActiveWorkshopContext,
  getCachedOdChart,
  getWorkshopModuleAccessStatus,
} from "../../utils/workshopCache";
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
  onOpen,
}: {
  leaf: Leaf;
  highlighted: boolean;
  onOpen: () => void;
}) {
  const assigned = leafHasAssignedQuestions(leaf);
  const tagColor = leaf.tagColor || "#9b304a";

  return (
    <button
      type="button"
      className={`od-dash-node od-dash-leaf ${assignedClass(assigned)} ${
        highlighted ? "is-search-hit" : ""
      }`}
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

/** Explicit H/V join above each sibling column (solid background bars). */
function LinkJoin() {
  return (
    <div className="od-join" aria-hidden>
      <span className="od-join-h od-join-h-left" />
      <span className="od-join-v" />
      <span className="od-join-h od-join-h-right" />
    </div>
  );
}

function ColumnTree({
  top,
  search,
  onOpenLeaf,
}: {
  top: Top;
  search: string;
  onOpenLeaf: (
    top: Top,
    middle: Middle,
    parent: Parent,
    leaf: Leaf
  ) => void;
}) {
  const Icon = topIcon(top.name);
  const headerAssigned = topHasAssignedQuestions(top);

  return (
    <section className="od-dash-column">
      <header
        className={`od-dash-column-header ${assignedClass(headerAssigned)}`}
      >
        <span className="od-dash-column-icon" aria-hidden>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <h2>{top.name}</h2>
      </header>

      <div className="od-dash-column-body">
        {top.middles.length === 0 ? (
          <p className="od-dash-empty">No sub-categories</p>
        ) : (
          <div className="od-tree">
            <div className="od-stem" aria-hidden />

            <div
              className={`od-row ${
                top.middles.length === 1 ? "is-single" : ""
              }`}
            >
              {top.middles.map((middle) => (
                <div key={middle.id} className="od-branch">
                  <LinkJoin />
                  <div
                    className={`od-dash-node od-dash-middle ${assignedClass(
                      middleHasAssignedQuestions(middle)
                    )} ${
                      matchesSearch(middle.name, search) ? "is-search-hit" : ""
                    }`}
                  >
                    {middle.name}
                  </div>

                  {middle.parents.length > 0 && (
                    <div className="od-tree">
                      <div className="od-stem" aria-hidden />
                      <div
                        className={`od-row ${
                          middle.parents.length === 1 ? "is-single" : ""
                        }`}
                      >
                        {middle.parents.map((parent) => (
                          <div key={parent.id} className="od-branch">
                            <LinkJoin />
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

                            {parent.leaves.length > 0 && (
                              <div className="od-leaf-stack">
                                <div className="od-stem" aria-hidden />
                                <div className="od-leaf-spine" aria-hidden />
                                {parent.leaves.map((leaf) => (
                                  <div
                                    key={leaf.id}
                                    className="od-leaf-wrap"
                                  >
                                    <LeafNode
                                      leaf={leaf}
                                      highlighted={matchesSearch(
                                        leaf.name,
                                        search
                                      )}
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
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const DEFAULT_ZOOM = 0.76;

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
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [search, setSearch] = useState("");

  const zoomPercent = Math.round(zoom * 100);

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
          {tops.map((top) => (
            <ColumnTree
              key={top.id}
              top={top}
              search={search}
              onOpenLeaf={onOpenLeaf}
            />
          ))}
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

        if (!activeWorkshop?.templateId) {
          const organizationId = participant.organizationId || "";
          const workshopData = await fetchWorkshopByOrganization(
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

        if (!activeWorkshop?.templateId) {
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
          templateId: activeWorkshop.templateId,
          templateName: activeWorkshop.templateName || "",
          organizationName: activeWorkshop.organizationName || "",
          endDate: activeWorkshop.endDate,
          canEdit: workshopCanEdit,
        };

        // Show cached chart immediately while a network refresh runs (if needed).
        const cached = getCachedOdChart(activeWorkshop.templateId);
        if (cached?.success && Array.isArray(cached.tops) && !cancelled) {
          setWorkshop(workshopInfo);
          setTops(sortTopsForDisplay((cached.tops || []) as Top[]));
          setLoading(false);
          return;
        }

        const chartData = await fetchOdChart(activeWorkshop.templateId);

        if (cancelled) {
          return;
        }

        if (!chartData.success) {
          setErrorMessage(chartData.message || "Unable to load OD chart.");
          setLoading(false);
          return;
        }

        setWorkshop(workshopInfo);
        setTops(sortTopsForDisplay((chartData.tops || []) as Top[]));
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
