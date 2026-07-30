import { useEffect, useState, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Template.css";

type PageProps = {
  user?: any;
};

export default function TemplateDetails({ user }: PageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      const response = await fetch(
        `/api/get-template-details?templateId=${id}`
      );
      const data = await response.json();

      if (data.success) {
        setTemplate(data.template);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const groupedQuestions = useMemo(() => {
    if (!template?.questions) return {};

    return template.questions.reduce((groups: Record<string, any[]>, question: any) => {
      const key = question.categoryName || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(question);
      return groups;
    }, {});
  }, [template]);

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
            <span>Template Details</span>
          </div>

          <h1 className="page-title">Template Details</h1>

          <div className="template-card">
            <div className="form-row">
              <div className="form-group">
                <label>Template Name</label>
                <input value={template.templateName} disabled />
              </div>
              <div className="form-group">
                <label>Categories</label>
                <input
                  value={
                    template.categoryNames?.length > 0
                      ? template.categoryNames.join(", ")
                      : template.categoryName || "-"
                  }
                  disabled
                />
              </div>
            </div>

            <table className="template-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Question</th>
                  <th>Question Category</th>
                  <th>Answer Type</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedQuestions).map(([categoryName, questions]) => (
                  <Fragment key={categoryName}>
                    <tr className="category-header-row">
                      <td colSpan={4}>{categoryName}</td>
                    </tr>
                    {(questions as any[]).map((q) => {
                      rowIndex += 1;
                      return (
                        <tr key={q.id}>
                          <td>{rowIndex}</td>
                          <td>{q.question}</td>
                          <td>{categoryName}</td>
                          <td>{q.answerType}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
