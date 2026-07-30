import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/CategoryManagement.css";
import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

type PageProps = {
    user?: any;
};

export default function CategoryQuestions({ user }: PageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { categoryId } = useParams();

    const topCategoryName =
        location.state?.topCategoryName || "Top Category";
    const middleCategoryId = location.state?.middleCategoryId || "";
    const middleCategoryName =
        location.state?.middleCategoryName || "Middle Category";
    const parentCategoryId = location.state?.parentCategoryId || "";
    const parentCategoryName =
        location.state?.parentCategoryName || "Parent Category";
    const categoryName =
        location.state?.categoryName || "Category";

    const [assignedQuestions, setAssignedQuestions] = useState<any[]>([]);
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedQuestionId, setSelectedQuestionId] = useState("");

    const fetchQuestionOptions = async (questionId: string) => {
        try {
            const response = await fetch(
                `/api/get-question-options?questionId=${questionId}`
            );
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
        } catch (error) {
            console.error("Error fetching options:", error);
        }
        return [];
    };

    const fetchAllQuestions = async () => {
        try {
            const response = await fetch("/api/get-questions");
            const result = await response.json();
            if (result.success) {
                const questionsWithOptions = await Promise.all(
                    result.data.map(async (question: any) => {
                        const options = await fetchQuestionOptions(
                            question.id
                        );
                        return { ...question, options };
                    })
                );
                setAllQuestions(questionsWithOptions);
            }
        } catch (error) {
            console.error("Error fetching questions:", error);
        }
    };

    const fetchAssignedQuestions = async () => {
        if (!categoryId) return;

        try {
            const response = await fetch(
                `/api/get-category-questions?categoryId=${categoryId}`
            );
            const result = await response.json();
            if (result.success) {
                setAssignedQuestions(result.data);
            }
        } catch (error) {
            console.error("Error fetching assigned questions:", error);
        }
    };

    useEffect(() => {
        fetchAssignedQuestions();
    }, [categoryId]);

    const getSelectedQuestionPreview = () => {
        return allQuestions.find((q) => q.id === selectedQuestionId);
    };

    const openAddModal = async () => {
        setSelectedQuestionId("");
        setShowModal(true);
        await fetchAllQuestions();
    };

    const handleAssignQuestion = async () => {
        if (!selectedQuestionId || !categoryId) {
            alert("Please select a question.");
            return;
        }

        try {
            const response = await fetch("/api/assign-category-question", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId,
                    questionId: selectedQuestionId,
                    createdBy: user?.name || "Admin",
                }),
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                setShowModal(false);
                setSelectedQuestionId("");
                fetchAssignedQuestions();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to assign question.");
        }
    };

    const handleRemoveQuestion = async (questionId: string) => {
        const confirmRemove = window.confirm(
            "Remove this question from category?"
        );
        if (!confirmRemove || !categoryId) return;

        try {
            const response = await fetch(
                `/api/remove-category-question?categoryId=${categoryId}&questionId=${questionId}`,
                { method: "DELETE" }
            );
            const result = await response.json();

            if (result.success) {
                fetchAssignedQuestions();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to remove question.");
        }
    };

    const formatOptions = (options: any[]) => {
        if (!options || options.length === 0) return "-";
        return options.map((opt) => opt.optionText).join(", ");
    };

    return (
        <div className="category-page">
            <Sidebar />

            <div className="category-content">
                <Header user={user} />

                <div className="category-body">
                    <div className="breadcrumb">
                        <span
                            onClick={() => navigate("/category")}
                            style={{ cursor: "pointer" }}
                        >
                            {topCategoryName}
                        </span>
                        {" > "}
                        <span
                            onClick={() =>
                                navigate(
                                    `/middle-category/${middleCategoryId}`,
                                    {
                                        state: {
                                            topCategoryName,
                                        },
                                    }
                                )
                            }
                            style={{ cursor: "pointer" }}
                        >
                            {middleCategoryName}
                        </span>
                        {" > "}
                        <span
                            onClick={() =>
                                navigate(
                                    `/parent-category/${middleCategoryId}`,
                                    {
                                        state: {
                                            topCategoryName,
                                            middleCategoryId,
                                            middleCategoryName,
                                        },
                                    }
                                )
                            }
                            style={{ cursor: "pointer" }}
                        >
                            {parentCategoryName}
                        </span>
                        {" > "}
                        <span
                            onClick={() =>
                                navigate(`/category/${parentCategoryId}`, {
                                    state: {
                                        topCategoryName,
                                        middleCategoryId,
                                        middleCategoryName,
                                        parentCategoryId,
                                        parentCategoryName,
                                    },
                                })
                            }
                            style={{ cursor: "pointer" }}
                        >
                            {categoryName}
                        </span>
                        {" > "}
                        Questions
                    </div>

                    <div className="page-header">
                        <h1 className="page-title">Questions</h1>
                        <button className="create-btn" onClick={openAddModal}>
                            + Add Question
                        </button>
                    </div>

                    <div className="category-card">
                        <table className="category-table">
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Type</th>
                                    <th>Options</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignedQuestions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            No Questions Available
                                        </td>
                                    </tr>
                                ) : (
                                    assignedQuestions.map((q) => (
                                        <tr key={q.questionId}>
                                            <td>{q.questionText}</td>
                                            <td>{q.questionType}</td>
                                            <td>
                                                {formatOptions(q.options)}
                                            </td>
                                            <td>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() =>
                                                        handleRemoveQuestion(
                                                            q.questionId
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Add Question</h2>

                        <div className="form-group">
                            <label>Select Question</label>
                            <select
                                value={selectedQuestionId}
                                onChange={(e) =>
                                    setSelectedQuestionId(e.target.value)
                                }
                            >
                                <option value="">Select a question</option>
                                {allQuestions
                                    .filter(
                                        (q) =>
                                            !assignedQuestions.some(
                                                (aq) =>
                                                    aq.questionId === q.id
                                            )
                                    )
                                    .map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.questionText}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {selectedQuestionId && (
                            <div className="form-group">
                                <label>Type</label>
                                <input
                                    type="text"
                                    value={
                                        getSelectedQuestionPreview()
                                            ?.questionType || ""
                                    }
                                    disabled
                                />
                            </div>
                        )}

                        {selectedQuestionId &&
                            getSelectedQuestionPreview()?.options?.length >
                                0 && (
                                <div className="form-group">
                                    <label>Options</label>
                                    <input
                                        type="text"
                                        value={formatOptions(
                                            getSelectedQuestionPreview()
                                                ?.options
                                        )}
                                        disabled
                                    />
                                </div>
                            )}

                        <div className="modal-buttons">
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedQuestionId("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleAssignQuestion}
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
