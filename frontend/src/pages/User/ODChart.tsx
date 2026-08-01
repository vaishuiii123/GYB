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

function LeafNode({
  leaf,
  onOpen,
}: {
  leaf: Leaf;
  onOpen: () => void;
}) {
  const assigned = leafHasAssignedQuestions(leaf);
  const tagColor = leaf.tagColor || "#c0392b";

  return (
    <button
      type="button"
      className={`od-node od-node-leaf ${assignedClass(assigned)}`}
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

function ChartTree({
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
  return (
    <div className="od-org">
      <ul>
        <li>
          <div className="od-node od-node-root">UNLOCK VALUE</div>
          <ul>
            {tops.map((top) => (
              <li key={top.id}>
                <div
                  className={`od-node od-node-green od-node-top ${assignedClass(
                    topHasAssignedQuestions(top)
                  )}`}
                >
                  {top.name}
                </div>
                {top.middles.length > 0 && (
                  <ul>
                    {top.middles.map((middle) => (
                      <li key={middle.id}>
                        <div
                          className={`od-node od-node-green od-node-middle ${assignedClass(
                            middleHasAssignedQuestions(middle)
                          )}`}
                        >
                          {middle.name}
                        </div>
                        {middle.parents.length > 0 && (
                          <ul>
                            {middle.parents.map((parent) => (
                              <li key={parent.id}>
                                <div
                                  className={`od-node od-node-parent ${assignedClass(
                                    parentHasAssignedQuestions(parent)
                                  )}`}
                                >
                                  {parent.name}
                                </div>
                                {parent.leaves.length > 0 && (
                                  <ul>
                                    {parent.leaves.map((leaf) => (
                                      <li key={leaf.id}>
                                        <LeafNode
                                          leaf={leaf}
                                          onOpen={() =>
                                            onOpenLeaf(
                                              top,
                                              middle,
                                              parent,
                                              leaf
                                            )
                                          }
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}

export default function ODChart() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [workshop, setWorkshop] = useState<WorkshopInfo | null>(null);
  const [tops, setTops] = useState<Top[]>([]);

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
        <div className="od-chart-body">
          <div className="od-chart-legend" role="note">
            <span className="od-chart-legend-swatch od-chart-legend-swatch-assigned" />
            <p>
              <strong>Maroon</strong> = questions assigned
            </p>
          </div>
          <div className="od-full-tree-scroll">
            <ChartTree tops={tops} onOpenLeaf={openQuestions} />
          </div>
        </div>
      )}
    </ODChartShell>
  );
}
