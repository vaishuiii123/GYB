import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Search } from "lucide-react";
import {
  getActiveWorkshopContext,
  getWorkshopModuleAccessStatus,
} from "../../utils/workshopCache";
import UserLayout from "./UserLayout";
import "../../styles/UserReports.css";

type ReportRow = {
  id: string;
  participantId: string;
  participant: string;
  categoryName: string;
  categoryPath: string;
  description: string;
  timeline: string;
  responsiblePersons: string;
  comments: string;
};

function categoryLabel(row: ReportRow) {
  if (row.categoryName?.trim()) {
    return row.categoryName.trim();
  }
  const fromPath = row.categoryPath?.split(">").pop()?.trim();
  return fromPath || "-";
}

export default function Reports() {
  const navigate = useNavigate();
  const {
    participant,
    workshop: selectedWorkshop,
  } = getActiveWorkshopContext();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [search, setSearch] = useState("");
  const [workshopName, setWorkshopName] = useState(
    selectedWorkshop?.workshopName || ""
  );

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
    const loadReport = async () => {
      if (!participant?.id || !selectedWorkshop?.id) {
        setErrorMessage("Please select a workshop and try again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `/api/get-workshop-actionables?workshopId=${encodeURIComponent(
            selectedWorkshop.id
          )}&participantId=${encodeURIComponent(participant.id)}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(data.message || "Unable to load workshop report.");
          setRows([]);
          return;
        }

        setWorkshopName(
          data.workshop?.workshopName || selectedWorkshop.workshopName || ""
        );
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error(error);
        setErrorMessage("Something went wrong while loading the report.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void loadReport();
  }, [participant?.id, selectedWorkshop?.id, selectedWorkshop?.workshopName]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = [
        row.participant,
        row.categoryName,
        row.categoryPath,
        row.description,
        row.timeline,
        row.responsiblePersons,
        row.comments,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  return (
    <UserLayout contentClassName="user-layout-main-reports">
      <div className="user-reports-page">
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

        <div className="user-reports-toolbar">
          <div className="user-reports-search">
            <Search size={16} strokeWidth={2.2} aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by participant, category, or keyword..."
              aria-label="Search report"
            />
          </div>
          <p className="user-reports-count">
            {filteredRows.length} item{filteredRows.length === 1 ? "" : "s"}
          </p>
        </div>

        {errorMessage ? (
          <div className="user-reports-alert">{errorMessage}</div>
        ) : null}

        {loading ? (
          <p className="user-reports-empty">Loading workshop report...</p>
        ) : (
          <div className="user-reports-table-wrap">
            <table className="user-reports-table">
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No report items found.</td>
                  </tr>
                ) : (
                  filteredRows.map((item, index) => (
                    <tr key={`${item.participantId}-${item.id || index}`}>
                      <td>{item.participant || "-"}</td>
                      <td>{categoryLabel(item)}</td>
                      <td className="user-reports-text">
                        {item.description || "-"}
                      </td>
                      <td>{item.timeline || "-"}</td>
                      <td>{item.responsiblePersons || "-"}</td>
                      <td className="user-reports-text">
                        {item.comments || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
