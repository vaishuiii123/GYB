import { useEffect, useState } from "react";
import {
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function QuestionAssignment({
  user,
}: PageProps) {

  const { subCategoryId } =
    useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const subCategoryName =
    location.state?.subCategoryName ||
    "Sub Category";

  const categoryName =
    location.state?.categoryName ||
    "Category";

  const masterCategoryName =
    location.state?.masterCategoryName ||
    "Master Category";

  const categoryId =
    location.state?.categoryId;

  const masterCategoryId =
    location.state?.masterCategoryId;

  const [questions,
    setQuestions] =
    useState<any[]>([]);

  const [selectedQuestionIds,
    setSelectedQuestionIds] =
    useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {

    try {

      const questionsResponse =
        await fetch(
          "/api/get-questions"
        );

      const questionsData =
        await questionsResponse.json();

      const assignedResponse =
        await fetch(
          `/api/get-subcategory-questions?subCategoryId=${subCategoryId}`
        );

      const assignedData =
        await assignedResponse.json();

      if (
        questionsData.success
      ) {

        setQuestions(
          questionsData.questions
        );
      }

      if (
        assignedData.success
      ) {

        setSelectedQuestionIds(
          assignedData.questionIds
        );
      }

    } catch (error) {

      console.error(error);
    }
  };

  const toggleQuestion =
    (questionId: string) => {

      if (
        selectedQuestionIds.includes(
          questionId
        )
      ) {

        setSelectedQuestionIds(
          selectedQuestionIds.filter(
            (id) =>
              id !== questionId
          )
        );

      } else {

        setSelectedQuestionIds([
          ...selectedQuestionIds,
          questionId,
        ]);
      }
    };

  const saveQuestions =
    async () => {

      try {

        const response =
          await fetch(
            "/api/save-subcategory-questions",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                subCategoryId,
                questionIds:
                  selectedQuestionIds,
                createdBy:
                  user?.username || "",
              }),
            }
          );

        const data =
          await response.json();

        if (data.success) {

          alert(
            "Questions Saved Successfully"
          );
        }

      } catch (error) {

        console.error(error);

        alert(
          "Failed to save questions"
        );
      }
    };

  const assignedQuestions =
    questions.filter((q) =>
      selectedQuestionIds.includes(
        q.id
      )
    );

  const availableQuestions =
    questions.filter(
      (q) =>
        !selectedQuestionIds.includes(
          q.id
        )
    );

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
                  navigate("/category")
                }
              >
                Master Category
              </span>

              {" > "}

              <span
                style={{
                  cursor: "pointer",
                  color: "#2563eb",
                }}
                onClick={() =>
                  navigate(
                    `/category/${masterCategoryId}`,
                    {
                      state: {
                        masterCategoryName,
                      },
                    }
                  )
                }
              >
                {masterCategoryName}
              </span>

              {" > "}

              <span
                style={{
                  cursor: "pointer",
                  color: "#2563eb",
                }}
                onClick={() =>
                  navigate(
                    `/subcategory/${categoryId}`,
                    {
                      state: {
                        categoryName,
                        masterCategoryName,
                        masterCategoryId,
                      },
                    }
                  )
                }
              >
                {categoryName}
              </span>

              {" > "}

              <b>
                {subCategoryName}
              </b>
            </div>

            <h1
              style={{
                fontSize: "30px",
                fontWeight: "700",
                marginBottom: "25px",
              }}
            >
              Questions for{" "}
              {subCategoryName}
            </h1>

            {/* Assigned Questions */}

            <div style={card}>
              <h2>
                Assigned Questions
              </h2>

              {assignedQuestions.length ===
              0 ? (
                <p>
                  No Questions Assigned
                </p>
              ) : (
                assignedQuestions.map(
                  (question) => (
                    <div
                      key={
                        question.id
                      }
                      style={
                        questionRow
                      }
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked
                          onChange={() =>
                            toggleQuestion(
                              question.id
                            )
                          }
                        />

                        <span
                          style={{
                            marginLeft:
                              "10px",
                            color:
                              question.color,
                            fontWeight:
                              "600",
                          }}
                        >
                          {
                            question.question
                          }
                        </span>
                      </label>
                    </div>
                  )
                )
              )}
            </div>

            {/* Available Questions */}

            <div
              style={{
                ...card,
                marginTop: "20px",
              }}
            >
              <h2>
                Available Questions
              </h2>

              {availableQuestions.map(
                (question) => (
                  <div
                    key={
                      question.id
                    }
                    style={
                      questionRow
                    }
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() =>
                          toggleQuestion(
                            question.id
                          )
                        }
                      />

                      <span
                        style={{
                          marginLeft:
                            "10px",
                          color:
                            question.color,
                          fontWeight:
                            "600",
                        }}
                      >
                        {
                          question.question
                        }
                      </span>
                    </label>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop: "25px",
                textAlign: "right",
              }}
            >
              <button
                style={saveBtn}
                onClick={
                  saveQuestions
                }
              >
                Save Questions
              </button>
            </div>

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

const questionRow: any = {
  padding: "10px 0",
  borderBottom:
    "1px solid #f1f1f1",
};

const saveBtn: any = {
  background: "#3b5bcc",
  color: "white",
  padding: "12px 18px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
