import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/PreOD.css";

type PreOdQuestion = {
  srNo: number;
  category: string;
  question: string;
  section: "A" | "B";
};

type Workshop = {
  id: string;
  workshopName: string;
  organizationName: string;
  preOdQuestionSrNos?: string;
  preOdQuestionCount?: number;
};

type PageProps = {
  user?: any;
};

export default function PreOD({ user }: PageProps) {
  const [questions, setQuestions] = useState<PreOdQuestion[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedWorkshopId, setSelectedWorkshopId] = useState("");
  const [selectedSrNos, setSelectedSrNos] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [questionsRes, workshopsRes] = await Promise.all([
        fetch("/api/get-pre-od-questions"),
        fetch("/api/get-workshops"),
      ]);

      const questionsData = await questionsRes.json();
      const workshopsData = await workshopsRes.json();

      if (questionsData.success) {
        setQuestions(questionsData.questions || []);
      }

      if (workshopsData.success) {
        setWorkshops(workshopsData.workshops || []);
      }
    } catch (error) {
      console.error("Error loading Pre OD data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedWorkshopId) {
      setSelectedSrNos([]);
      return;
    }

    const workshop = workshops.find((item) => item.id === selectedWorkshopId);
    if (!workshop?.preOdQuestionSrNos) {
      setSelectedSrNos([]);
      return;
    }

    const existingSrNos = workshop.preOdQuestionSrNos
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item));

    setSelectedSrNos(existingSrNos);
  }, [selectedWorkshopId, workshops]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(questions.map((item) => item.category)));
    return ["All", ...unique];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((item) => {
      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;
      const matchesSearch =
        !term ||
        item.question.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        String(item.srNo).includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [questions, search, categoryFilter]);

  const toggleQuestion = (srNo: number) => {
    setSelectedSrNos((current) =>
      current.includes(srNo)
        ? current.filter((item) => item !== srNo)
        : [...current, srNo]
    );
  };

  const toggleAllFiltered = () => {
    const filteredSrNos = filteredQuestions.map((item) => item.srNo);
    const allSelected = filteredSrNos.every((srNo) =>
      selectedSrNos.includes(srNo)
    );

    if (allSelected) {
      setSelectedSrNos((current) =>
        current.filter((srNo) => !filteredSrNos.includes(srNo))
      );
      return;
    }

    setSelectedSrNos((current) =>
      Array.from(new Set([...current, ...filteredSrNos]))
    );
  };

  const handleCreatePreOd = async () => {
    if (!selectedWorkshopId) {
      setStatusMessage("Select a workshop first.");
      return;
    }

    if (selectedSrNos.length === 0) {
      setStatusMessage("Select at least one question.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage("");

      const response = await fetch("/api/save-workshop-pre-od", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workshopId: selectedWorkshopId,
          questionSrNos: selectedSrNos,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatusMessage(data.message || "Failed to create Pre OD.");
        return;
      }

      setStatusMessage(
        `Pre OD created for "${data.workshopName}" with ${data.questionCount} questions.`
      );
      await loadData();
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to create Pre OD.");
    } finally {
      setSaving(false);
    }
  };

  const selectedWorkshop = workshops.find(
    (item) => item.id === selectedWorkshopId
  );

  return (
    <div className="pre-od-page">
      <Sidebar />
      <div className="pre-od-content">
        <Header user={user} />

        <div className="pre-od-body">
          <div className="pre-od-header">
            <div>
              <h1 className="pre-od-title">Pre OD</h1>
              <p className="pre-od-subtitle">
                Select a workshop, choose questions, and create Pre OD.
              </p>
            </div>

            <div className="pre-od-stats">
              <div className="pre-od-stat">Total: {questions.length}</div>
              <div className="pre-od-stat">Selected: {selectedSrNos.length}</div>
            </div>
          </div>

          <div className="pre-od-assign-panel">
            <div className="pre-od-assign-form">
              <div className="pre-od-workshop-field">
                <label className="pre-od-field-label">Workshop</label>
                <select
                  className="pre-od-filter pre-od-workshop-select"
                  value={selectedWorkshopId}
                  onChange={(e) => setSelectedWorkshopId(e.target.value)}
                >
                  <option value="">Select Workshop</option>
                  {workshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>
                      {workshop.workshopName}
                      {workshop.organizationName
                        ? ` — ${workshop.organizationName}`
                        : ""}
                      {workshop.preOdQuestionCount
                        ? ` (${workshop.preOdQuestionCount} assigned)`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="pre-od-save-btn"
                onClick={handleCreatePreOd}
                disabled={saving || !selectedWorkshopId}
              >
                {saving ? "Creating..." : "Create Pre OD"}
              </button>
            </div>

            {selectedWorkshop?.preOdQuestionCount ? (
              <p className="pre-od-panel-help">
                This workshop already has {selectedWorkshop.preOdQuestionCount}{" "}
                Pre OD questions. Saving again will replace them.
              </p>
            ) : null}

            {statusMessage && (
              <div className="pre-od-info">{statusMessage}</div>
            )}
          </div>

          <div className="pre-od-toolbar">
            <input
              type="text"
              className="pre-od-search"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="pre-od-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="pre-od-select-all-btn"
              onClick={toggleAllFiltered}
            >
              Select / Unselect Filtered
            </button>
          </div>

          <div className="pre-od-table-card">
            {loading ? (
              <p>Loading questions...</p>
            ) : (
              <table className="pre-od-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Sr No</th>
                    <th>Questions</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((item) => (
                    <tr
                      key={item.srNo}
                      className={item.section === "A" ? "section-a" : "section-b"}
                    >
                      <td className="pre-od-check">
                        <input
                          type="checkbox"
                          checked={selectedSrNos.includes(item.srNo)}
                          onChange={() => toggleQuestion(item.srNo)}
                        />
                      </td>
                      <td className="pre-od-sr">{item.srNo}</td>
                      <td>{item.question}</td>
                      <td className="pre-od-category">{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
