import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";

type PageProps = {
  user?: any;
};

export default function Template({ user }: PageProps) {

  const navigate = useNavigate();
  
  const [templates, setTemplates] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [templateName, setTemplateName] = useState("");

  const [questions, setQuestions] = useState<string[]>([""]);

  useEffect(() => {
    loadTemplates();
  }, []);

    const loadTemplates = async () => {
      try {
    
        const response = await fetch(
          "/api/get-templates"
        );
    
        const data =
          await response.json();
    
        if (data.success) {
    
          const formatted =
            data.templates.map(
              (item: any) => ({
                id: item.id,
                name: item.templateName,
                questionCount:
                  item.questionCount
              })
            );
    
          setTemplates(formatted);
        }
    
      } catch (error) {
    
        console.error(
          "Error loading templates",
          error
        );
      }
    };
      
  const addQuestionField = () => {
    setQuestions([...questions, ""]);
  };

  const handleQuestionChange = (
    index: number,
    value: string
  ) => {
    const updated = [...questions];

    updated[index] = value;

    setQuestions(updated);
  };

  const createTemplate = () => {
    if (!templateName) return;

    const newTemplate = {
      id: Date.now(),
      name: templateName,
      questions: questions.filter(
        (q) => q.trim() !== ""
      ),
    };

    setTemplates([...templates, newTemplate]);

    setTemplateName("");
    setQuestions([""]);

    setShowModal(false);
  };

  return (
  <div
    style={{
      display: "flex",
      background: "#f3f4f6",
      minHeight: "100vh",
    }}
  >
    <Sidebar />

    <div
      style={{
        flex: 1,
        marginLeft: "220px",
      }}
    >
      <Header user={user} />

      <div
        style={{
          padding: "25px",
          marginTop: "70px",
        }}
      >
        <div style={pageHeader}>
          <h1 style={pageTitle}>
            Template
          </h1>

          <button
            style={saveBtn}
            onClick={() => navigate("/create-template")}
          >
            Create Template
          </button>
        </div>

        <div style={card}>
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>
                  Sr No.
                </th>

                <th style={thStyle}>
                  Template Name
                </th>

                <th style={thStyle}>
                  Question Count
                </th>

                <th style={thStyle}>
                  Action
                </th>
              </tr>
            </thead>

           <tbody>
              {templates.length === 0 ? (
            
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      padding: "30px"
                    }}
                  >
                    No templates found
                  </td>
                </tr>
            
              ) : (
            
                templates.map(
                  (
                    template,
                    index
                  ) => (
                    <tr key={template.id}>
            
                      <td style={tdStyle}>
                        {index + 1}
                      </td>
            
                      <td style={tdStyle}>
                        {template.name}
                      </td>
            
                      <td style={tdStyle}>
                        {template.questionCount}
                      </td>
            
                      <td style={tdStyle}>
                        <button
                          style={viewBtn}
                        >
                          View
                        </button>
                      </td>
            
                    </tr>
                  )
                )
            
              )}
            
            </tbody>
          </table>
        </div>

        {showModal && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent:
                "center",
              alignItems:
                "center",
              zIndex: 999,
            }}
          >
            <div
              style={{
                width: "700px",
                background:
                  "white",
                borderRadius:
                  "16px",
                padding:
                  "30px",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto",
              }}
            >
              <h2
                style={{
                  marginBottom:
                    "25px",
                  fontSize:
                    "32px",
                }}
              >
                Create Template
              </h2>

              <input
                type="text"
                placeholder="Template Name"
                value={
                  templateName
                }
                onChange={(e) =>
                  setTemplateName(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

              <h3
                style={{
                  marginBottom:
                    "15px",
                }}
              >
                Questions
              </h3>

              {questions.map(
                (
                  question,
                  index
                ) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`Question ${
                      index + 1
                    }`}
                    value={
                      question
                    }
                    onChange={(e) =>
                      handleQuestionChange(
                        index,
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                )
              )}

              <button
                onClick={
                  addQuestionField
                }
                style={{
                  background:
                    "#16a34a",
                  color:
                    "white",
                  border:
                    "none",
                  padding:
                    "12px 20px",
                  borderRadius:
                    "8px",
                  cursor:
                    "pointer",
                  marginBottom:
                    "30px",
                }}
              >
                + Add Question
              </button>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: "15px",
                }}
              >
                <button
                  onClick={() =>
                    setShowModal(
                      false
                    )
                  }
                  style={{
                    background:
                      "#6b7280",
                    color:
                      "white",
                    border:
                      "none",
                    padding:
                      "12px 22px",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={
                    createTemplate
                  }
                  style={{
                    background:
                      "#7a0019",
                    color:
                      "white",
                    border:
                      "none",
                    padding:
                      "12px 22px",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

const pageHeader: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const pageTitle: any = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};

const saveBtn: any = {
  background: "#3b5bcc",
  color: "white",
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};



const viewBtn: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  marginRight: "8px",
};

const card: any = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "16px",
  borderBottom: "1px solid #ddd",
  fontSize: "15px",
};

const tdStyle = {
  padding: "16px",
  borderBottom: "1px solid #eee",
  fontSize: "16px",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "16px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "15px",
  boxSizing: "border-box" as const,
};
