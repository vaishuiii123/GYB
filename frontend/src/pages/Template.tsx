import { useState } from "react";

export default function Template() {
  const [templates, setTemplates] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [templateName, setTemplateName] = useState("");

  const [questions, setQuestions] = useState<string[]>([""]);

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
        padding: "40px",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "34px",
            fontWeight: "700",
          }}
        >
          Template
        </h1>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "#7a0019",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Create Template
        </button>
      </div>

      {/* TABLE */}

      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Sr No.</th>
              <th style={thStyle}>Template Name</th>
              <th style={thStyle}>Question Count</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {templates.map((template, index) => (
              <tr key={template.id}>
                <td style={tdStyle}>{index + 1}</td>

                <td style={tdStyle}>
                  {template.name}
                </td>

                <td style={tdStyle}>
                  {template.questions.length}
                </td>

                <td style={tdStyle}>
                  <button
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      marginRight: "10px",
                    }}
                  >
                    View
                  </button>

                  <button
                    onClick={() =>
                      setTemplates(
                        templates.filter(
                          (t) => t.id !== template.id
                        )
                      )
                    }
                    style={{
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: "700px",
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                marginBottom: "25px",
                fontSize: "32px",
              }}
            >
              Create Template
            </h2>

            <input
              type="text"
              placeholder="Template Name"
              value={templateName}
              onChange={(e) =>
                setTemplateName(e.target.value)
              }
              style={inputStyle}
            />

            <h3
              style={{
                marginBottom: "15px",
              }}
            >
              Questions
            </h3>

            {questions.map((question, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Question ${
                  index + 1
                }`}
                value={question}
                onChange={(e) =>
                  handleQuestionChange(
                    index,
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            ))}

            <button
              onClick={addQuestionField}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                marginBottom: "30px",
              }}
            >
              + Add Question
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "15px",
              }}
            >
              <button
                onClick={() =>
                  setShowModal(false)
                }
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={createTemplate}
                style={{
                  background: "#7a0019",
                  color: "white",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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