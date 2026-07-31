import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchWorkshopByOrganization,
  fetchOdChart,
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

type BranchState = {
  expandedMiddleIds: string[];
  expandedParentIds: Record<string, string[]>;
};

const emptyBranchState = (): BranchState => ({
  expandedMiddleIds: [],
  expandedParentIds: {},
});

function leafNodeStyle(leaf: Leaf) {
  const color = leaf.tagColor || "#c0392b";

  return {
    borderColor: color,
    ...(leaf.hasAssignedQuestions === false
      ? { opacity: 0.72, borderStyle: "dashed" as const }
      : {}),
  };
}

function TreeLink() {
  return (
    <div className="od-tree-link" aria-hidden="true">
      <span className="od-tree-link-line" />
      <span className="od-tree-link-dot" />
    </div>
  );
}

function TopColumn({
  top,
  isExpanded,
  branch,
  onToggleTop,
  onToggleMiddle,
  onToggleParent,
  onOpenLeaf,
}: {
  top: Top;
  isExpanded: boolean;
  branch: BranchState;
  onToggleTop: () => void;
  onToggleMiddle: (middleId: string) => void;
  onToggleParent: (middleId: string, parentId: string) => void;
  onOpenLeaf: (middle: Middle, parent: Parent, leaf: Leaf) => void;
}) {
  return (
    <div className={`od-tree-column${isExpanded ? " is-expanded" : ""}`}>
      <span className="od-tree-col-vline" aria-hidden="true" />

      <button
        type="button"
        className={`od-full-tree-node od-full-tree-node-green od-expand-btn ${
          isExpanded ? "is-open" : ""
        }`}
        onClick={onToggleTop}
      >
        {top.name}
      </button>

      {isExpanded && top.middles.length > 0 && (
        <div className="od-tree-middles-wrap">
          <TreeLink />
          {top.middles.length > 1 && (
            <span className="od-tree-middles-rail" aria-hidden="true" />
          )}
          <div className="od-tree-middles-row">
            {top.middles.map((middle) => {
              const middleOpen = branch.expandedMiddleIds.includes(middle.id);
              const openParentIds = branch.expandedParentIds[middle.id] || [];

              return (
                <div
                  key={middle.id}
                  className={`od-tree-middle-column${
                    middleOpen &&
                    middle.parents.some(
                      (p) =>
                        openParentIds.includes(p.id) && p.leaves.length > 1
                    )
                      ? " has-multiple-leaves"
                      : ""
                  }`}
                >
                  {top.middles.length > 1 && (
                    <span className="od-tree-middle-vline" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    className={`od-full-tree-node od-full-tree-node-green od-full-tree-node-sm od-expand-btn ${
                      middleOpen ? "is-open" : ""
                    }`}
                    onClick={() => onToggleMiddle(middle.id)}
                  >
                    {middle.name}
                  </button>

                  {middleOpen && middle.parents.length > 0 && (
                    <div className="od-tree-parents-wrap">
                      {middle.parents.length > 1 && (
                        <>
                          <TreeLink />
                          <span
                            className="od-tree-parents-rail"
                            aria-hidden="true"
                          />
                        </>
                      )}
                      <div
                        className={`od-tree-parents-row ${
                          middle.parents.length === 1
                            ? "od-tree-parents-row-single"
                            : ""
                        }`}
                      >
                        {middle.parents.map((parent) => {
                          const parentOpen = openParentIds.includes(parent.id);

                          return (
                            <div
                              key={parent.id}
                              className={`od-tree-parent-column${
                                parentOpen && parent.leaves.length > 1
                                  ? " has-multiple-leaves"
                                  : ""
                              }`}
                            >
                              {middle.parents.length > 1 && (
                                <span
                                  className="od-tree-parent-vline"
                                  aria-hidden="true"
                                />
                              )}
                              {middle.parents.length === 1 && <TreeLink />}
                              <button
                                type="button"
                                className={`od-full-tree-node od-full-tree-node-parent od-expand-btn ${
                                  parentOpen ? "is-open" : ""
                                }`}
                                onClick={() =>
                                  onToggleParent(middle.id, parent.id)
                                }
                              >
                                {parent.name}
                              </button>

                              {parentOpen && parent.leaves.length > 0 && (
                                <div className="od-tree-leaves-wrap">
                                  {parent.leaves.length > 1 && (
                                    <>
                                      <TreeLink />
                                      <span
                                        className="od-tree-leaves-rail"
                                        aria-hidden="true"
                                      />
                                    </>
                                  )}
                                  <div
                                    className={`od-tree-leaves-row ${
                                      parent.leaves.length === 1
                                        ? "od-tree-leaves-row-single"
                                        : ""
                                    }`}
                                  >
                                    {parent.leaves.map((leaf) => (
                                      <div
                                        key={leaf.id}
                                        className="od-tree-leaf-column"
                                      >
                                        {parent.leaves.length > 1 && (
                                          <span
                                            className="od-tree-leaf-vline"
                                            aria-hidden="true"
                                          />
                                        )}
                                        {parent.leaves.length === 1 && (
                                          <TreeLink />
                                        )}
                                        <button
                                          type="button"
                                          className="od-full-tree-node od-full-tree-node-leaf od-expand-btn"
                                          style={leafNodeStyle(leaf)}
                                          title={
                                            leaf.hasAssignedQuestions === false
                                              ? "No questions assigned for your workshop"
                                              : "Open questions"
                                          }
                                          onClick={() =>
                                            onOpenLeaf(middle, parent, leaf)
                                          }
                                        >
                                          {leaf.name}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ODChart() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [workshop, setWorkshop] = useState<WorkshopInfo | null>(null);
  const [tops, setTops] = useState<Top[]>([]);
  const [rootOpen, setRootOpen] = useState(false);
  const [expandedTopIds, setExpandedTopIds] = useState<string[]>([]);
  const [branchState, setBranchState] = useState<Record<string, BranchState>>(
    {}
  );

  const participant = (() => {
    try {
      return JSON.parse(localStorage.getItem("participant") || "{}");
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    const loadData = async () => {
      if (!participant.organizationId) {
        setErrorMessage("Organization not found. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const workshopData = await fetchWorkshopByOrganization(
          participant.organizationId
        );

        if (!workshopData.success || !workshopData.workshop) {
          setErrorMessage(
            "No workshop is scheduled for your organization yet."
          );
          setLoading(false);
          return;
        }

        const activeWorkshop = workshopData.workshop;
        const workshopInfo: WorkshopInfo = {
          id: activeWorkshop.id,
          workshopName: activeWorkshop.workshopName,
          templateId: activeWorkshop.templateId,
          templateName: activeWorkshop.templateName,
          organizationName: activeWorkshop.organizationName,
          endDate: activeWorkshop.endDate,
          canEdit: workshopData.canEdit,
        };

        setWorkshop(workshopInfo);

        if (!activeWorkshop.templateId) {
          setErrorMessage("This workshop does not have a template assigned.");
          setLoading(false);
          return;
        }

        const chartData = await fetchOdChart(activeWorkshop.templateId);

        if (!chartData.success) {
          setErrorMessage(chartData.message || "Unable to load OD chart.");
          setLoading(false);
          return;
        }

        setTops(chartData.tops || []);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load OD chart.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [participant.organizationId]);

  const toggleRoot = () => {
    if (rootOpen) {
      setRootOpen(false);
      setExpandedTopIds([]);
      setBranchState({});
      return;
    }

    setRootOpen(true);
  };

  const toggleTop = (topId: string) => {
    setExpandedTopIds((current) => {
      if (current.includes(topId)) {
        setBranchState((branches) => {
          const next = { ...branches };
          delete next[topId];
          return next;
        });
        return current.filter((id) => id !== topId);
      }

      return [...current, topId];
    });
  };

  const toggleMiddle = (topId: string, middleId: string) => {
    setBranchState((current) => {
      const branch = current[topId] || emptyBranchState();
      const isOpen = branch.expandedMiddleIds.includes(middleId);
      const expandedMiddleIds = isOpen
        ? branch.expandedMiddleIds.filter((id) => id !== middleId)
        : [...branch.expandedMiddleIds, middleId];

      const expandedParentIds = { ...branch.expandedParentIds };
      if (isOpen) {
        delete expandedParentIds[middleId];
      }

      return {
        ...current,
        [topId]: {
          expandedMiddleIds,
          expandedParentIds,
        },
      };
    });
  };

  const toggleParent = (topId: string, middleId: string, parentId: string) => {
    setBranchState((current) => {
      const branch = current[topId] || emptyBranchState();
      const openParents = branch.expandedParentIds[middleId] || [];
      const isOpen = openParents.includes(parentId);
      const nextParents = isOpen
        ? openParents.filter((id) => id !== parentId)
        : [...openParents, parentId];

      return {
        ...current,
        [topId]: {
          ...branch,
          expandedParentIds: {
            ...branch.expandedParentIds,
            [middleId]: nextParents,
          },
        },
      };
    });
  };

  const openQuestions = (
    top: Top,
    middle: Middle,
    parent: Parent,
    leaf: Leaf
  ) => {
    if (!workshop) {
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

  return (
    <ODChartShell>
      {loading ? (
        <p className="od-chart-status">Loading OD chart...</p>
      ) : errorMessage && !workshop ? (
        <div className="od-chart-error">{errorMessage}</div>
      ) : tops.length === 0 ? (
        <div className="od-chart-error">
          No categories found. Please contact your administrator.
        </div>
      ) : (
        <div className="od-full-tree-scroll">
          <div className="od-tree-chart">
            <button
              type="button"
              className={`od-full-tree-root od-expand-btn ${rootOpen ? "is-open" : ""}`}
              onClick={toggleRoot}
            >
              UNLOCK VALUE
            </button>

            {!rootOpen && (
              <p className="od-expand-hint">Click UNLOCK VALUE to explore</p>
            )}

            {rootOpen && (
              <>
                <div className="od-tree-root-stem" aria-hidden="true">
                  <span className="od-tree-link-line od-tree-link-line-root" />
                  <span className="od-tree-link-dot" />
                </div>

                <div className="od-tree-columns-wrap">
                  <span className="od-tree-top-rail" aria-hidden="true" />
                  <div className="od-tree-columns">
                    {tops.map((top) => (
                      <TopColumn
                        key={top.id}
                        top={top}
                        isExpanded={expandedTopIds.includes(top.id)}
                        branch={branchState[top.id] || emptyBranchState()}
                        onToggleTop={() => toggleTop(top.id)}
                        onToggleMiddle={(middleId) =>
                          toggleMiddle(top.id, middleId)
                        }
                        onToggleParent={(middleId, parentId) =>
                          toggleParent(top.id, middleId, parentId)
                        }
                        onOpenLeaf={(middle, parent, leaf) =>
                          openQuestions(top, middle, parent, leaf)
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ODChartShell>
  );
}
