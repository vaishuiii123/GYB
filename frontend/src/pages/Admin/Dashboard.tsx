import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/AdminDashboard.css";

type PageProps = {
  user?: any;
};

type WorkshopRecord = {
  id: string;
  workshopName?: string;
  organizationName?: string;
  startDate?: string;
  endDate?: string;
};

type ResponseSummary = {
  workshopId: string;
  counts: {
    preOd: number;
    odChart: number;
    actionables: number;
  };
};

type PreOdSummary = {
  workshopId: string;
  submissionCount: number;
};

type LifecycleStatus = "upcoming" | "in-progress" | "completed";

function parseWorkshopEndMs(endDate?: string) {
  if (!endDate) {
    return null;
  }

  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const looksLikeDateOnly =
    endDate.length <= 10 ||
    (date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0);

  if (looksLikeDateOnly) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

function getWorkshopLifecycleStatus(
  workshop: Pick<WorkshopRecord, "startDate" | "endDate">,
  nowMs = Date.now()
): LifecycleStatus {
  const endMs = parseWorkshopEndMs(workshop.endDate);
  if (endMs !== null && nowMs > endMs) {
    return "completed";
  }

  const startMs = workshop.startDate
    ? new Date(workshop.startDate).getTime()
    : null;

  if (startMs !== null && !Number.isNaN(startMs) && nowMs < startMs) {
    return "upcoming";
  }

  // Started, or no start date but not yet past end
  if (endMs !== null || (startMs !== null && !Number.isNaN(startMs))) {
    return "in-progress";
  }

  return "upcoming";
}

function formatWorkshopDates(startDate?: string, endDate?: string) {
  const format = (value?: string) => {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const start = format(startDate);
  const end = format(endDate);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || end || "";
}

export default function Dashboard({ user }: PageProps) {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [responseSummaries, setResponseSummaries] = useState<ResponseSummary[]>(
    []
  );
  const [preOdSummaries, setPreOdSummaries] = useState<PreOdSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSummaries = useCallback(async () => {
    try {
      setLoading(true);

      const [workshopRes, responseRes, preOdRes] = await Promise.all([
        fetch("/api/get-workshops"),
        fetch("/api/get-workshop-responses"),
        fetch("/api/get-pre-od-responses"),
      ]);

      const workshopData = await workshopRes.json();
      const responseData = await responseRes.json();
      const preOdData = await preOdRes.json();

      if (workshopRes.ok && workshopData.success) {
        setWorkshops(workshopData.workshops || []);
      }

      if (responseRes.ok && responseData.success) {
        setResponseSummaries(responseData.summaries || []);
      }

      if (preOdRes.ok && preOdData.success) {
        setPreOdSummaries(preOdData.summaries || []);
      }
    } catch (error) {
      console.error("Error loading dashboard summaries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  const responseMap = useMemo(
    () => new Map(responseSummaries.map((item) => [item.workshopId, item])),
    [responseSummaries]
  );

  const preOdMap = useMemo(
    () => new Map(preOdSummaries.map((item) => [item.workshopId, item])),
    [preOdSummaries]
  );

  const { upcoming, inProgress, completed } = useMemo(() => {
    const buckets = {
      upcoming: [] as WorkshopRecord[],
      inProgress: [] as WorkshopRecord[],
      completed: [] as WorkshopRecord[],
    };

    for (const workshop of workshops) {
      const status = getWorkshopLifecycleStatus(workshop);
      if (status === "completed") {
        buckets.completed.push(workshop);
      } else if (status === "in-progress") {
        buckets.inProgress.push(workshop);
      } else {
        buckets.upcoming.push(workshop);
      }
    }

    const byStartAsc = (a: WorkshopRecord, b: WorkshopRecord) =>
      String(a.startDate || "").localeCompare(String(b.startDate || ""));
    const byEndDesc = (a: WorkshopRecord, b: WorkshopRecord) =>
      String(b.endDate || "").localeCompare(String(a.endDate || ""));

    buckets.upcoming.sort(byStartAsc);
    buckets.inProgress.sort(byStartAsc);
    buckets.completed.sort(byEndDesc);

    return buckets;
  }, [workshops]);

  const renderWorkshopCard = (
    workshop: WorkshopRecord,
    status: LifecycleStatus
  ) => {
    const response = responseMap.get(workshop.id);
    const preOd = preOdMap.get(workshop.id);
    const dates = formatWorkshopDates(workshop.startDate, workshop.endDate);

    const onClick = () => {
      if (status === "completed") {
        navigate(`/workshop-responses/${workshop.id}`);
        return;
      }
      navigate(`/pre-od-responses/${workshop.id}`);
    };

    return (
      <button
        key={workshop.id}
        type="button"
        className="admin-dashboard-workshop-card"
        onClick={onClick}
      >
        <h3>{workshop.workshopName || "Workshop"}</h3>
        {workshop.organizationName ? (
          <p className="admin-dashboard-card-meta">
            {workshop.organizationName}
          </p>
        ) : null}
        {dates ? (
          <p className="admin-dashboard-card-meta">{dates}</p>
        ) : null}

        {status === "completed" && response ? (
          <p>
            Pre OD: {response.counts.preOd} · OD: {response.counts.odChart} ·
            Actionables: {response.counts.actionables}
          </p>
        ) : null}

        {(status === "upcoming" || status === "in-progress") && preOd ? (
          <p>
            {preOd.submissionCount} Pre OD submission
            {preOd.submissionCount === 1 ? "" : "s"}
          </p>
        ) : null}

        <span className="admin-dashboard-card-action">
          {status === "completed" ? "View responses →" : "View Pre OD →"}
        </span>
      </button>
    );
  };

  const renderSection = (
    title: string,
    items: WorkshopRecord[],
    status: LifecycleStatus,
    emptyMessage: string
  ) => (
    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-header">
        <h2>{title}</h2>
      </div>

      {loading ? (
        <p className="admin-dashboard-status">Loading workshops...</p>
      ) : items.length === 0 ? (
        <div className="admin-dashboard-empty">{emptyMessage}</div>
      ) : (
        <div className="admin-dashboard-workshop-grid">
          {items.map((workshop) => renderWorkshopCard(workshop, status))}
        </div>
      )}
    </section>
  );

  return (
    <div className="admin-dashboard-page">
      <Header user={user} />
      <Sidebar />

      <div className="admin-dashboard-content">
        <div className="admin-dashboard-header">
          <h1>Dashboard</h1>
        </div>

        {renderSection(
          "Upcoming workshops",
          upcoming,
          "upcoming",
          "No upcoming workshops."
        )}
        {renderSection(
          "In progress",
          inProgress,
          "in-progress",
          "No workshops in progress."
        )}
        {renderSection(
          "Workshops completed",
          completed,
          "completed",
          "No completed workshops."
        )}
      </div>
    </div>
  );
}
