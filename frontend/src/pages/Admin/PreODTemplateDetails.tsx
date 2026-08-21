import { useEffect, useMemo, useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Template.css";

type PageProps = {
  user?: any;
};

export default function PreODTemplateDetails({ user }: PageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      setError("");
      const response = await fetch(
        `/api/get-pre-od-template-details?templateId=${encodeURIComponent(
          String(id || "")
        )}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to load Pre OD template.");
        setTemplate(null);
        return;
      }

      setTemplate(data.template);
    } catch (err) {
      console.error(err);
      setError("Unable to load Pre OD template.");
      setTemplate(null);
    }
  };

  const groupedQuestions = useMemo(() => {
    if (!template?.questions) return {};

    return template.questions.reduce(
      (groups: Record<string, any[]>, question: any) => {
        const key = question.category || "General";
        if (!groups[key]) groups[key] = [];
        groups[key].push(question);
        return groups;
      },
      {}
    );
  }, [template]);

  if (error) {
    return (
      <div className="template-page">
        <Sidebar />
        <div className="template-content">
          <Header user={user} />
          <div className="template-body">
            <p>{error}</p>
            <button
              type="button"
              className="save-btn"
              onClick={() => navigate("/template")}
            >
              Back to Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="template-page">
        <Sidebar />
        <div className="template-content">
          <Header user={user} />
          <div className="template-body">Loading...</div>
        </div>
      </div>
    );
  }

  let rowIndex = 0;

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
            <span>Pre OD Template Details</span>
          </div>

          <h1 className="page-title">Pre OD Template Details</h1>

          <div className="template-card">
            <div className="form-row">
              <div className="form-group">
                <label>Template Name</label>
                <input value={template.templateName} disabled />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input value="Pre OD" disabled />
              </div>
            </div>

            <table className="template-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Question</th>
                  <th>Topmost category</th>
                  <th>Answer Type</th>
                  <th>Attachment Applicable</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedQuestions).map(
                  ([categoryName, questions]) => (
                    <Fragment key={categoryName}>
                      <tr className="category-header-row">
                        <td colSpan={5}>{categoryName}</td>
                      </tr>
                      {(questions as any[]).map((q) => {
                        rowIndex += 1;
                        return (
                          <tr key={`${q.srNo}-${rowIndex}`}>
                            <td>{q.srNo ?? rowIndex}</td>
                            <td>{q.question}</td>
                            <td>{categoryName}</td>
                            <td>{q.answerType || "Text"}</td>
                            <td>
                              {String(q.attachmentsApplicable || "N").toUpperCase() ===
                              "Y"
                                ? "Yes"
                                : "No"}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  )
                )}
              </tbody>
            </table>

            <div className="card-footer">
              <button
                type="button"
                className="save-btn"
                onClick={() =>
                  navigate(`/create-pre-od-template?from=${id}`)
                }
              >
                Use as New Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
