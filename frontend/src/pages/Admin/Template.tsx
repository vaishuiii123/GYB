import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CopyIconBtn,
  DeleteIconBtn,
  ViewIconBtn,
} from "../../components/AdminActionIcons";
import "../../styles/Template.css";
import { appConfirm } from "../../utils/appDialog";

type PageProps = {
  user?: any;
};

export default function Template({ user }: PageProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [pageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/get-templates");
      const data = await response.json();

      if (data.success) {
        setTemplates(
          data.templates.map((item: any) => ({
            id: item.id,
            name: item.templateName,
            questionCount: item.questionCount,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading templates", error);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!filter.trim()) return templates;
    return templates.filter((t) =>
      t.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [templates, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTemplates.length / pageSize)
  );
  const paginatedTemplates = filteredTemplates.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const deleteTemplate = async (templateId: string) => {
    const confirmed = await appConfirm(
      "Are you sure you want to delete this template?"
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/delete-template?id=${templateId}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (data.success) {
        setTemplates(templates.filter((item) => item.id !== templateId));
        alert("Template deleted successfully");
      } else {
        alert(data.error || "Failed to delete template");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting template");
    }
  };

  return (
    <div className="template-page">
      <Sidebar />

      <div className="template-content">
        <Header user={user} />

        <div className="template-body">
          <div className="breadcrumb">Template</div>

          <div className="template-page-header">
            <h1 className="page-title">Template</h1>
            <button
              className="create-btn"
              onClick={() => navigate("/create-template")}
            >
              + Create New Template
            </button>
          </div>

          <div className="template-card">
            <div className="filter-box">
              <Search size={18} className="filter-icon" />
              <input
                placeholder="Filter templates..."
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <table className="template-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Template Name</th>
                  <th>Question Count</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      No templates found
                    </td>
                  </tr>
                ) : (
                  paginatedTemplates.map((template, index) => (
                    <tr key={template.id}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td>{template.name}</td>
                      <td>{template.questionCount}</td>
                      <td>
                        <div className="action-icons">
                          <ViewIconBtn
                            onClick={() =>
                              navigate(`/template-details/${template.id}`)
                            }
                          />
                          <CopyIconBtn
                            title="Use as new template"
                            onClick={() =>
                              navigate(`/create-template?from=${template.id}`)
                            }
                          />
                          <DeleteIconBtn
                            onClick={() => deleteTemplate(template.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="pagination">
              <span>
                Items per page: {pageSize}
              </span>
              <span>
                {filteredTemplates.length === 0
                  ? "0 of 0"
                  : `${(page - 1) * pageSize + 1} - ${Math.min(
                      page * pageSize,
                      filteredTemplates.length
                    )} of ${filteredTemplates.length}`}
              </span>
              <span>
                <button
                  className="icon-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ‹
                </button>
                <button
                  className="icon-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{ marginLeft: "8px" }}
                >
                  ›
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
