import { useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function CreateTemplate({
  user,
}: PageProps) {

  const [templateName, setTemplateName] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [selectedQuestions,
    setSelectedQuestions] =
    useState<string[]>([]);

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
                }}
              >
                <option value="">
                  Select Question Category
                </option>

                <option>
                  Marketing & Sales
                </option>
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
                  <th>Sr No.</th>
                  <th>Question</th>
                  <th>Question Category</th>
                  <th></th>
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
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {
                          question.question
                        }
                      </td>

                      <td>
                        {
                          question.category
                        }
                      </td>

                      <td>
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
