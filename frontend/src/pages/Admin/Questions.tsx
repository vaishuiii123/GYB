import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Questions({
  user,
}: PageProps) {

  const [questions, setQuestions] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [error, setError] =  useState("");

 const [questionForm,
  setQuestionForm] =
  useState({
    question: "",
    answerType: "Textbox",
    required: "No",
    weightage: 0,
    color: "#2563eb",
  });

const [options, setOptions] =
  useState<string[]>([""]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions =
    async () => {

      try {

        const response =
          await fetch(
            "/api/get-questions"
          );

        const data =
          await response.json();

        if (data.success) {
          setQuestions(
            data.questions
          );
        }

      } catch (error) {
        console.error(error);
      }
    };

  const handleCreateQuestion =
    async () => {

      if (
        !questionForm.question.trim()
      ) {
        setError(
          "Question is required"
        );
        return;
      }

      try {

        const response =
          await fetch(
            "/api/create-question",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                question:
                  questionForm.question,

                answerType:
                  questionForm.answerType,

                color:
                  questionForm.color,

                createdBy:
                  user?.username || "",

                required:
                  questionForm.required === "Yes",
                
                weightage:
                  Number(questionForm.weightage),
                
                options:
                  options.join("|"),
              }),
            }
          );

        const data =
          await response.json();

        if (data.success) {

          setShowModal(false);

          setError("");

         setQuestionForm({
            question: "",
            answerType: "Textbox",
            required: "No",
            weightage: 0,
            color: "#2563eb",
          });
          
          setOptions([""]);

          fetchQuestions();
        }

      } catch (error) {
        console.error(error);
      }
    };


  const handleView = (
      question: any
    ) => {
    
      const questionOptions =
        question.options
          ? question.options
              .split("|")
              .join("\n")
          : "No Options";
    
      alert(
    `Question: ${question.question}
    
    Answer Type: ${question.answerType}
    
    Required: ${question.required ? "Yes" : "No"}
    
    Weightage: ${question.weightage}
    
    Options:
    ${questionOptions}`
      );
    };
  
  const handleEdit = (
    question: any
  ) => {

    alert(
      `Edit ${question.question}`
    );
  };

  const handleDelete = (
    question: any
  ) => {

    alert(
      `Delete ${question.question}`
    );
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f3f4f6",
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
                Questions
              </h1>

              <button
                style={saveBtn}
                onClick={() =>
                  setError("");
                  setShowModal(true);
              >
                Create Question
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
                
                    <th style={tableHeader}>
                      Question
                    </th>
                
                    <th style={tableHeader}>
                      Answer Type
                    </th>
                
                    <th style={tableHeader}>
                      Required
                    </th>
                
                    <th style={tableHeader}>
                      Weightage
                    </th>
                
                    <th style={tableHeader}>
                      Color
                    </th>
                
                    <th style={tableHeader}>
                      Actions
                    </th>
                
                  </tr>
                </thead>
                <tbody>
                  {questions.map(
                    (question) => (
                      <tr
                        key={
                          question.id
                        }
                      >
                
                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            question.question
                          }
                        </td>
                
                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            question.answerType
                          }
                        </td>
                
                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            question.required
                              ? "Yes"
                              : "No"
                          }
                        </td>
                
                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            question.weightage
                          }
                        </td>
                
                        <td
                          style={
                            tableCell
                          }
                        >
                          <div
                            style={{
                              width: "25px",
                              height: "25px",
                              borderRadius:
                                "50%",
                              background:
                                question.color,
                            }}
                          />
                        </td>
                
                        <td
                          style={
                            tableCell
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                            }}
                          >
                
                            <button
                              style={
                                viewBtn
                              }
                              onClick={() =>
                                handleView(
                                  question
                                )
                              }
                            >
                              👁 View
                            </button>
                
                            <button
                              style={
                                editBtn
                              }
                              onClick={() =>
                                handleEdit(
                                  question
                                )
                              }
                            >
                              ✏ Edit
                            </button>
                
                            <button
                              style={
                                deleteBtn
                              }
                              onClick={() =>
                                handleDelete(
                                  question
                                )
                              }
                            >
                              🗑 Delete
                            </button>
                
                          </div>
                        </td>
                
                      </tr>
                    )
                  )}
                
                </tbody>
              </table>
            </div>

            {showModal && (
              <div
                style={
                  modalOverlay
                }
              >
               <div style={modalBox}>
                  <h2>
                    Create Question
                  </h2>
                
                  <input
                    placeholder="Enter Option"
                    style={{
                      ...inputStyle,
                      border: error
                        ? "1px solid red"
                        : "1px solid #d1d5db",
                    }}
                    placeholder="Question"
                    value={
                      questionForm.question
                    }
                    onChange={(e) => {
                
                      setQuestionForm({
                        ...questionForm,
                        question:
                          e.target.value,
                      });
                
                      setError("");
                    }}
                  />
                
                  {error && (
                    <div
                      style={{
                        color:
                          "#dc2626",
                      }}
                    >
                      {error}
                    </div>
                  )}
                
                  <select
                    style={inputStyle}
                    value={
                      questionForm.answerType
                    }
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        answerType:
                          e.target.value,
                      })
                    }
                  >
                    <option>Textbox</option>
                    <option>Textarea</option>
                    <option>Yes / No</option>
                    <option>Dropdown</option>
                    <option>Multi Select</option>
                    <option>Number</option>
                    <option>Date</option>
                  </select>
                
                  <select
                    style={inputStyle}
                    value={
                      questionForm.required
                    }
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        required:
                          e.target.value,
                      })
                    }
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                
                  <input
                    type="number"
                    placeholder="Weightage"
                    style={inputStyle}
                    value={
                      questionForm.weightage
                    }
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        weightage:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                  />
                
                  {(questionForm.answerType ===
                    "Dropdown" ||
                    questionForm.answerType ===
                      "Multi Select") && (
                
                    <div>
                
                      <label>
                        Options
                      </label>
                
                      {options.map(
                        (
                          option,
                          index
                        ) => (
                          <div
                            key={index}
                            style={{
                              display:
                                "flex",
                              gap: "10px",
                              marginTop:
                                "8px",
                            }}
                          >
                            <input
                              style={{
                                ...inputStyle,
                                flex: 1,
                              }}
                              value={option}
                              onChange={(e) => {
                
                                const updated =
                                  [...options];
                
                                updated[
                                  index
                                ] =
                                  e.target.value;
                
                                setOptions(
                                  updated
                                );
                              }}
                            />
                
                            <button
                              style={
                                deleteBtn
                              }
                              type="button"
                              onClick={() => {
                
                                const updated =
                                  options.filter(
                                    (
                                      _,
                                      i
                                    ) =>
                                      i !==
                                      index
                                  );
                
                                setOptions(
                                  updated.length
                                    ? updated
                                    : [""]
                                );
                              }}
                            >
                              X
                            </button>
                
                          </div>
                        )
                      )}
                
                      <button
                        type="button"
                        style={{
                          ...saveBtn,
                          marginTop:
                            "10px",
                        }}
                        onClick={() =>
                          setOptions([
                            ...options,
                            "",
                          ])
                        }
                      >
                        + Add Option
                      </button>
                
                    </div>
                  )}
                
                  <div>
                    <label>
                      Question Color
                    </label>
                
                    <input
                      type="color"
                      value={
                        questionForm.color
                      }
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          color:
                            e.target.value,
                        })
                      }
                    />
                  </div>
                
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "end",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setShowModal(false)
                      }
                    >
                      Cancel
                    </button>
                
                    <button
                      style={saveBtn}
                      onClick={
                        handleCreateQuestion
                      }
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
    </>
  );
}

/* STYLES */

const card: any = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow:
    "0 4px 20px rgba(0,0,0,0.06)",
};

const pageHeader: any = {
  display: "flex",
  justifyContent:
    "space-between",
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

const tableHeader: any = {
  padding: "16px",
  background: "#f9fafb",
  textAlign: "left",
};

const tableCell: any = {
  padding: "12px",
  borderBottom:
    "1px solid #f1f1f1",
};

const viewBtn: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const editBtn: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const deleteBtn: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const modalOverlay: any = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background:
    "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent:
    "center",
  alignItems: "center",
};

const modalBox: any = {
  background: "white",
  padding: "25px",
  borderRadius: "12px",
  width: "500px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const inputStyle: any = {
  padding: "10px",
  border:
    "1px solid #d1d5db",
  borderRadius: "6px",
};
