import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Template.css";
import {
  ADMIN_CACHE_KEYS,
  clearAdminListCache,
} from "../../utils/adminListCache";

type PageProps = {
  user?: any;
};

type BankQuestion = {
  srNo: number;
  category: string;
  question: string;
  section?: string;
};

export default function CreatePreOdTemplate({ user }: PageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromId = String(searchParams.get("from") || "").trim();

  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Record<string, "Y" | "N">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [fromId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const bankResponse = await fetch("/api/get-pre-od-questions");
      const bankData = await bankResponse.json();
      if (!bankResponse.ok || !bankData.success) {
        throw new Error(bankData.message || "Unable to load Pre OD questions.");
      }

      const bank: BankQuestion[] = bankData.questions || [];
      setQuestions(bank);

      if (fromId) {
        const detailsResponse = await fetch(
          `/api/get-pre-od-template-details?templateId=${encodeURIComponent(
            fromId
          )}`
        );
        const detailsData = await detailsResponse.json();
        if (!detailsResponse.ok || !detailsData.success) {
          throw new Error(
            detailsData.message || "Unable to load source Pre OD template."
          );
        }

        const source = detailsData.template;
        setTemplateName(`Copy of ${source.templateName || "Pre OD Template"}`);
        setSelected(
          new Set(
            (source.questionSrNos || []).map((item: string | number) =>
              String(item)
            )
          )
        );
        const sourceAttachments: Record<string, "Y" | "N"> = {};
        Object.entries(source.questionAttachments || {}).forEach(
          ([key, value]) => {
            sourceAttachments[String(key)] =
              String(value || "N").toUpperCase() === "Y" ? "Y" : "N";
          }
        );
        setAttachments(sourceAttachments);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load Pre OD template form.");
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    return questions.reduce(
      (groups: Record<string, BankQuestion[]>, question) => {
        const key = question.category || "General";
        if (!groups[key]) groups[key] = [];
        groups[key].push(question);
        return groups;
      },
      {}
    );
  }, [questions]);

  const toggleSrNo = (srNo: string | number) => {
    const key = String(srNo);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setAttachmentFlag = (srNo: string | number, value: "Y" | "N") => {
    const key = String(srNo);
    setAttachments((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (categoryQuestions: BankQuestion[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      categoryQuestions.forEach((item) => {
        const key = String(item.srNo);
        if (checked) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const handleSave = async () => {
    const name = templateName.trim();
    if (!name) {
      alert("Template name is required.");
      return;
    }

    const questionSrNos = Array.from(selected);
    if (questionSrNos.length === 0) {
      alert("Select at least one Pre OD question.");
      return;
    }

    const questionAttachments: Record<string, string> = {};
    questionSrNos.forEach((srNo) => {
      questionAttachments[srNo] = attachments[srNo] === "Y" ? "Y" : "N";
    });

    try {
      setSaving(true);
      const response = await fetch("/api/create-pre-od-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: name,
          questionSrNos,
          questionAttachments,
          createdBy: user?.name || user?.email || "Admin",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Failed to create Pre OD template."
        );
      }

      clearAdminListCache(ADMIN_CACHE_KEYS.preOdTemplates);
      alert(`Pre OD template "${name}" created successfully.`);
      navigate("/template");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create Pre OD template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="template-page">
      <Sidebar />

      <div className="template-content">
        <Header user={user} />

        <div className="template-body">
          <div className="breadcrumb">
            <span className="link" onClick={() => navigate("/template")}>
              Template
            </span>
            {" > "}
            <span>{fromId ? "Copy Pre OD Template" : "Create Pre OD Template"}</span>
          </div>

          <div className="template-page-header">
            <h1 className="page-title">
              {fromId ? "Copy Pre OD Template" : "Create Pre OD Template"}
            </h1>
          </div>

          {loading ? (
            <div className="template-card">Loading...</div>
          ) : error ? (
            <div className="template-card">
              <p>{error}</p>
              <button
                type="button"
                className="save-btn"
                onClick={() => navigate("/template")}
              >
                Back
              </button>
            </div>
          ) : (
            <div className="template-card">
              <div className="form-row">
                <div className="form-group">
                  <label>Template Name</label>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter Pre OD template name"
                  />
                </div>
                <div className="form-group">
                  <label>Selected questions</label>
                  <input value={String(selected.size)} disabled />
                </div>
              </div>

              <table className="template-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Select</th>
                    <th style={{ width: 80 }}>S.No.</th>
                    <th>Question</th>
                    <th>Topmost category</th>
                    <th style={{ width: 140 }}>Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(
                    ([categoryName, categoryQuestions]) => {
                      const allSelected = categoryQuestions.every((item) =>
                        selected.has(String(item.srNo))
                      );
                      return (
                        <Fragment key={categoryName}>
                          <tr className="category-header-row">
                            <td>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) =>
                                  toggleCategory(
                                    categoryQuestions,
                                    e.target.checked
                                  )
                                }
                                aria-label={`Select all in ${categoryName}`}
                              />
                            </td>
                            <td colSpan={4}>{categoryName}</td>
                          </tr>
                          {categoryQuestions.map((item) => (
                            <tr key={item.srNo}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selected.has(String(item.srNo))}
                                  onChange={() => toggleSrNo(item.srNo)}
                                  aria-label={`Select question ${item.srNo}`}
                                />
                              </td>
                              <td>{item.srNo}</td>
                              <td>{item.question}</td>
                              <td>{item.category}</td>
                              <td>
                                <select
                                  value={attachments[String(item.srNo)] || "N"}
                                  onChange={(e) =>
                                    setAttachmentFlag(
                                      item.srNo,
                                      e.target.value === "Y" ? "Y" : "N"
                                    )
                                  }
                                  disabled={!selected.has(String(item.srNo))}
                                  aria-label={`Attachment for question ${item.srNo}`}
                                >
                                  <option value="N">No</option>
                                  <option value="Y">Yes</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    }
                  )}
                </tbody>
              </table>

              <div className="card-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate("/template")}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
