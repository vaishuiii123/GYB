import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
} from "lucide-react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  getWorkshopLifecycleStatus,
  type WorkshopLifecycleStatus,
} from "../../utils/workshopLifecycle";
import "../../styles/AdminDashboard.css";

type PageProps = {
  user?: { name?: string };
};

type WorkshopRecord = {
  id: string;
  workshopName?: string;
  organizationName?: string;
  startDate?: string;
  endDate?: string;
  participantCount?: number;
};

type LifecycleStatus = WorkshopLifecycleStatus;

const CARD_TONES = ["pink", "purple", "blue", "yellow", "green"] as const;

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
    if (start === end) {
      return start;
    }
    return `${start} – ${end}`;
  }

  return start || end || "Dates TBD";
}

function getWorkshopInitials(name?: string) {
  const parts = String(name || "W")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "W";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function isEndDateInCurrentMonth(endDate?: string, now = new Date()) {
  if (!endDate) {
    return false;
  }
  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export default function Dashboard({ user }: PageProps) {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkshops = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/get-workshops");
      const data = await response.json();
      if (response.ok && data.success) {
        setWorkshops(data.workshops || []);
      }
    } catch (error) {
      console.error("Error loading dashboard workshops:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  useEffect(() => {
  const prefetchOrganizations = async () => {
    try {
      const res = await fetch("/api/get-organizations");
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem(
          "organizations_cache",
          JSON.stringify(data.organizations || [])
        );
      }
    } catch {
      // ignore — Organization page will fetch itself
    }
  };

  prefetchOrganizations();
}, []);

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

  const completedThisMonth = useMemo(
    () => completed.filter((item) => isEndDateInCurrentMonth(item.endDate)).length,
    [completed]
  );

  const openWorkshop = (workshop: WorkshopRecord, status: LifecycleStatus) => {
    if (status === "completed") {
      navigate(`/workshop-responses/${workshop.id}`);
      return;
    }
    navigate(`/pre-od-responses/${workshop.id}`);
  };

  const renderWorkshopCard = (
    workshop: WorkshopRecord,
    status: LifecycleStatus,
    index: number
  ) => (
    <button
      key={workshop.id}
      type="button"
      className="adh-workshop-card"
      onClick={() => openWorkshop(workshop, status)}
    >
      <span
        className={`adh-workshop-badge tone-${CARD_TONES[index % CARD_TONES.length]}`}
      >
        {getWorkshopInitials(workshop.workshopName)}
      </span>
      <div className="adh-workshop-card-body">
        <h3>{workshop.workshopName || "Workshop"}</h3>
        {workshop.organizationName ? (
          <p className="adh-workshop-org">{workshop.organizationName}</p>
        ) : null}
        <p>{formatWorkshopDates(workshop.startDate, workshop.endDate)}</p>
        <p className="adh-participants">
          <Users size={14} strokeWidth={2} />
          {Number(workshop.participantCount || 0)} participants
        </p>
      </div>
    </button>
  );

  const renderSection = (
    title: string,
    status: LifecycleStatus,
    items: WorkshopRecord[],
    emptyMessage: string
  ) => (
    <section className="adh-section">
      <div className="adh-section-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="adh-view-all"
          onClick={() => navigate(`/workshop?status=${status}`)}
        >
          View all &gt;
        </button>
      </div>

      {loading ? (
        <p className="adh-status">Loading workshops...</p>
      ) : items.length === 0 ? (
        <div className="adh-empty-panel">{emptyMessage}</div>
      ) : (
        <div className="adh-workshop-grid">
          {items
            .slice(0, 6)
            .map((workshop, index) =>
              renderWorkshopCard(workshop, status, index)
            )}
        </div>
      )}
    </section>
  );

  return (
    <div className="admin-dashboard-page adh-page">
      <Header user={user} />
      <Sidebar />

      <div className="admin-dashboard-content adh-content">
        <div className="adh-title-row">
          <h1>Dashboard</h1>
        </div>

        <section className="adh-stats">
          <article className="adh-stat-card">
            <span className="adh-stat-icon is-completed" aria-hidden>
              <CheckCircle2 size={22} strokeWidth={2.2} />
            </span>
            <div>
              <p className="adh-stat-label">Completed Workshops</p>
              <strong className="adh-stat-value">
                {loading ? "—" : completedThisMonth}
              </strong>
              <span className="adh-stat-hint">This month</span>
            </div>
          </article>

          <article className="adh-stat-card">
            <span className="adh-stat-icon is-progress" aria-hidden>
              <Clock3 size={22} strokeWidth={2.2} />
            </span>
            <div>
              <p className="adh-stat-label">In Progress</p>
              <strong className="adh-stat-value">
                {loading ? "—" : inProgress.length}
              </strong>
              <span className="adh-stat-hint">Active now</span>
            </div>
          </article>

          <article className="adh-stat-card">
            <span className="adh-stat-icon is-upcoming" aria-hidden>
              <CalendarDays size={22} strokeWidth={2.2} />
            </span>
            <div>
              <p className="adh-stat-label">Upcoming Workshops</p>
              <strong className="adh-stat-value">
                {loading ? "—" : upcoming.length}
              </strong>
              <span className="adh-stat-hint">Scheduled</span>
            </div>
          </article>
        </section>

        {renderSection(
          "Upcoming Workshops",
          "upcoming",
          upcoming,
          "No upcoming workshops."
        )}
        {renderSection(
          "In Progress",
          "in-progress",
          inProgress,
          "No workshops in progress."
        )}
        {renderSection(
          "Completed Workshops",
          "completed",
          completed,
          "No completed workshops."
        )}
      </div>
    </div>
  );
}
