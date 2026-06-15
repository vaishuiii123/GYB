import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";

type PageProps = {
  user?: any;
};

export default function CreateTemplate({
  user,
}: PageProps) {

  const navigate = useNavigate();

  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedQuestions,setSelectedQuestions] = useState<string[]>([]);

  const questions = [
    {
      id: "1",
      question:
        "Focus on most profitable products & services",
      category:
        "Marketing & Sales",
    },
    {
      id: "2",
      question:
        "Focus on most effective sales & advertising channels",
      category:
        "Marketing & Sales",
    },
  ];

  const toggleQuestion = (
    id: string
  ) => {

    if (
      selectedQuestions.includes(id)
    ) {

      setSelectedQuestions(
        selectedQuestions.filter(
          (q) => q !== id
        )
      );

    } else {

      setSelectedQuestions([
        ...selectedQuestions,
        id,
      ]);
    }
  };

  useEffect(() => {
  loadCategories();
}, []);

  //=========================== LOAD CATEGORIES ============================

    const loadCategories = async () => {
      try {
        const response = await fetch(
          "/api/get-categories"
        );
    
        const data = await response.json();
            console.log("Categories API Response:", data);

    
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error(error);
      }
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

          {/* Breadcrumb */}

          <div
            style={{
              color: "#6b7280",
              fontSize: "14px",
              marginBottom: "15px",
            }}
          >
            <span
              style={{
                cursor: "pointer",
                color: "#2563eb",
              }}
              onClick={() =>
                navigate("/template")
              }
            >
              Template
            </span>

            {" > "}

            <span>
              Create Template
            </span>
          </div>

          {/* Page Title */}

          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              marginBottom: "20px",
              color: "#111827",
            }}
          >
            Create Template
          </h1>

          <div style={card}>

            <div
              style={{
                display: "flex",
                gap: "20px",
                marginBottom: "25px",
              }}
            >
              <input
                placeholder="Template Name"
                value={templateName}
                onChange={(e) =>
                  setTemplateName(
                    e.target.value
                  )
                }
                style={{
                  flex: 1,
                  padding: "12px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "8px",
                }}
              />

              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value
                  )
                }
                style={{
                  flex: 1,
                  padding: "12px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "8px",
                }}
              >
                <option value="">
                  Select Question Category
                </option>
                  
                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.categoryName}
                      </option>
                    )
                  )}
              </select>
            </div>

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
                    Question
                  </th>

                  <th style={thStyle}>
                    Question Category
                  </th>

                  <th style={thStyle}>
                    Select
                  </th>
                </tr>
              </thead>

              <tbody>
                {questions.map(
                  (
                    question,
                    index
                  ) => (
                    <tr
                      key={
                        question.id
                      }
                    >
                      <td style={tdStyle}>
                        {index + 1}
                      </td>

                      <td style={tdStyle}>
                        {
                          question.question
                        }
                      </td>

                      <td style={tdStyle}>
                        {
                          question.category
                        }
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(
                            question.id
                          )}
                          onChange={() =>
                            toggleQuestion(
                              question.id
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div
              style={{
                marginTop: "20px",
                textAlign: "right",
              }}
            >
              <button
                style={saveBtn}
              >
                Save Template
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// =================== STYLES ===================

const card = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow:
    "0 4px 20px rgba(0,0,0,0.06)",
};

const saveBtn = {
  background: "#3b5bcc",
  color: "white",
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: "600",
};

const tdStyle = {
  padding: "14px",
  borderBottom: "1px solid #f3f4f6",
};
