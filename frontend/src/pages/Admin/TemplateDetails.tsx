import { useEffect, useState, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Template.css";
import {
  fetchOnce,
  isAdminListCacheFresh,
  readAdminListCache,
  writeAdminListCache,
} from "../../utils/adminListCache";

type PageProps = {
  user?: any;
};

export default function TemplateDetails({ user }: PageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoadError("Template ID is missing.");
      setLoading(false);
      return;
    }

    let active = true;
    const cacheKey = `template_details_${id}`;
    const cached = readAdminListCache<any>(cacheKey);

    if (cached) {
      setTemplate(cached);
      setLoading(false);
    } else {
      setTemplate(null);
      setLoading(true);
    }
    setLoadError("");

    if (isAdminListCacheFresh(cacheKey)) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const response = await fetchOnce(
          `/api/get-template-details?templateId=${encodeURIComponent(id)}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || data.error || "Unable to load template.");
        }

        writeAdminListCache(cacheKey, data.template);
        if (active) {
          setTemplate(data.template);
        }
      } catch (error) {
        console.error(error);
        if (active && !cached) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load template."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const groupedQuestions = useMemo(() => {
    if (!template?.questions) return {};

    return template.questions.reduce(
      (groups: Record<string, any[]>, question: any) => {
        const key = question.categoryName || "General";
        if (!groups[key]) groups[key] = [];
        groups[key].push(question);
        return groups;
      },
      {}
    );
  }, [template]);

  if (loading && !template) {
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

  if (!template) {
    return (
      <div className="template-page">
        <Sidebar />
        <div className="template-content">
          <Header user={user} />
          <div className="template-body">
            <p>{loadError || "Template not found."}</p>
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
            <span>Template Details</span>
          </div>

          <h1 className="page-title">Template Details</h1>

          <div className="template-card">
            <div className="form-row">
              <div className="form-group">
                <label>Template Name</label>
                <input value={template.templateName} disabled />
              </div>
            </div>

            <table className="template-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Question</th>
                  <th>Question Category</th>
                  <th>Tag</th>
                  <th>Answer Type</th>
                  <th>Attachment Applicable</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedQuestions).map(
                  ([categoryName, questions]) => (
                    <Fragment key={categoryName}>
                      <tr className="category-header-row">
                        <td colSpan={6}>{categoryName}</td>
                      </tr>
                      {(questions as any[]).map((q) => {
                        rowIndex += 1;
                        const tagColor = String(q.tagColor || "").trim();
                        return (
                          <tr
                            key={`${categoryName}-${q.id}`}
                            className={tagColor ? "tag-colored-row" : undefined}
                            style={
                              tagColor
                                ? {
                                    color: tagColor,
                                    borderLeft: `4px solid ${tagColor}`,
                                  }
                                : undefined
                            }
                          >
                            <td>{rowIndex}</td>
                            <td>{q.question}</td>
                            <td>{categoryName}</td>
                            <td>
                              {q.tagName ? (
                                <span
                                  className="template-tag-label"
                                  style={{ color: tagColor || undefined }}
                                >
                                  {q.tagName}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>{q.answerType}</td>
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
                onClick={() => navigate(`/create-template?from=${id}`)}
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
