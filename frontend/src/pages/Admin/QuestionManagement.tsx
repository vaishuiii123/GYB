import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/QuestionManagement.css";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import {
  DeleteIconBtn,
  EditIconBtn,
} from "../../components/AdminActionIcons";
import { appConfirm } from "../../utils/appDialog";

type PageProps = {
    user?: any;
};

export default function QuestionManagement({ user }: PageProps) {
    const [tags, setTags] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedQuestionId, setSelectedQuestionId] = useState("");
    const [questionText, setQuestionText] = useState("");
    const [questionType, setQuestionType] = useState("");
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [selectedTag, setSelectedTag] = useState("");
    const [questions, setQuestions] = useState<any[]>([]);

    const fetchTags = async () => {
        try {
            const response = await fetch("/api/get-tags");
            const result = await response.json();
            if (result.success) {
                setTags(result.data);
            }
        } catch (error) {
            console.error("Error fetching tags:", error);
        }
    };

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

    const fetchQuestions = async () => {
        try {
            const response = await fetch("/api/get-questions");
            const result = await response.json();
            if (result.success) {
                const questionsWithOptions = await Promise.all(
                    result.data.map(async (question: any) => {
                        const questionOptions = await fetchQuestionOptions(
                            question.id
                        );
                        return { ...question, options: questionOptions };
                    })
                );
                setQuestions(questionsWithOptions);
            }
        } catch (error) {
            console.error("Error fetching questions:", error);
        }
    };

  const downloadExcelTemplate = async () => {
    try {
        // Question types used in Question Management
        const questionTypes = [
            "Multiple Choice",
            "Single Choice",
            "Text",
            "Rating",
        ];

        // Get tag names dynamically from Tag Management
        const tagNames = tags
            .map((tag) => tag.tagName)
            .filter(
                (name) =>
                    name &&
                    name.trim() !== ""
            );

        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();

        // Create Questions sheet
        const worksheet =
            workbook.addWorksheet("Questions");

        // Add headers
        worksheet.addRow([
            "Question",
            "Question Type",
            "Tag",
            "Option 1",
            "Option 2",
            "Option 3",
            "Option 4",
            "Option 5",
        ]);

        // Style the header row
        const headerRow = worksheet.getRow(1);

        headerRow.font = {
            bold: true,
        };

        headerRow.alignment = {
            vertical: "middle",
            horizontal: "center",
        };

        // Set column widths
        worksheet.getColumn(1).width = 50;
        worksheet.getColumn(2).width = 22;
        worksheet.getColumn(3).width = 30;
        worksheet.getColumn(4).width = 20;
        worksheet.getColumn(5).width = 20;
        worksheet.getColumn(6).width = 20;
        worksheet.getColumn(7).width = 20;
        worksheet.getColumn(8).width = 20;

        // Add dropdowns to rows 2 to 500
        for (let row = 2; row <= 500; row++) {

            // Question Type dropdown
            worksheet.getCell(row, 2).dataValidation = {
                type: "list",
                allowBlank: true,
                formulae: [
                    `"${questionTypes.join(",")}"`,
                ],
                showErrorMessage: true,
                errorTitle: "Invalid Question Type",
                error: "Please select a Question Type from the dropdown.",
            };

            // Tag dropdown
            if (tagNames.length > 0) {
                worksheet.getCell(row, 3).dataValidation = {
                    type: "list",
                    allowBlank: true,
                    formulae: [
                        `"${tagNames.join(",")}"`,
                    ],
                    showErrorMessage: true,
                    errorTitle: "Invalid Tag",
                    error: "Please select a Tag from the dropdown.",
                };
            }
        }

        // Freeze the header row
        worksheet.views = [
            {
                state: "frozen",
                ySplit: 1,
            },
        ];

        // Create Excel file
        const buffer =
            await workbook.xlsx.writeBuffer();

        // Create downloadable file
        const blob = new Blob(
            [buffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
        );

        // Create download link
        const url =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            "Question_Upload_Template.xlsx";

        document.body.appendChild(link);

        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error(
            "Error creating Excel template:",
            error
        );

        alert(
            "Unable to create Excel template."
        );
    }
};

    useEffect(() => {
        fetchTags();
        fetchQuestions();
    }, []);

    const getTagName = (tagId: string) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? tag.tagName : "-";
    };

    const getTagColor = (tagId: string) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? tag.tagColor : "#9B304A";
    };

    const addOption = () => {
        setOptions([...options, ""]);
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, value: string) => {
        const updatedOptions = [...options];
        updatedOptions[index] = value;
        setOptions(updatedOptions);
    };

    const resetForm = () => {
        setQuestionText("");
        setQuestionType("");
        setOptions(["", ""]);
        setSelectedTag("");
        setEditMode(false);
        setSelectedQuestionId("");
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleEditQuestion = (question: any) => {
        setEditMode(true);
        setSelectedQuestionId(question.id);
        setQuestionText(question.questionText);
        setQuestionType(question.questionType);
        setSelectedTag(question.tagId || "");
        setOptions(
            question.options?.length > 0
                ? question.options.map((o: any) => o.optionText)
                : ["", ""]
        );
        setShowModal(true);
    };

    const handleDeleteQuestion = async (id: string) => {
        const confirmDelete = await appConfirm(
            "Are you sure you want to delete this question?"
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/delete-question?id=${id}`, {
                method: "DELETE",
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                fetchQuestions();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Delete failed");
        }
    };

    const saveOptions = async (questionId: string) => {
        const filteredOptions = options.filter((o) => o.trim() !== "");
        if (filteredOptions.length === 0) return;

        await fetch("/api/create-question-options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                questionId,
                options: filteredOptions,
                createdBy: user?.name || "Admin",
            }),
        });
    };

    const handleSaveQuestion = async () => {
        if (!questionText.trim() || !questionType) {
            alert("Please enter question text and select a type.");
            return;
        }

        try {
            if (editMode) {
                const response = await fetch("/api/update-question", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        questionId: selectedQuestionId,
                        questionText,
                        questionType,
                        tagId: selectedTag,
                        modifiedBy: user?.name || "Admin",
                    }),
                });
                const result = await response.json();

                if (result.success) {
                    const existingOptions = await fetchQuestionOptions(
                        selectedQuestionId
                    );
                    for (const opt of existingOptions) {
                        await fetch(
                            `/api/delete-question-option?id=${opt.id}`,
                            { method: "DELETE" }
                        );
                    }
                    await saveOptions(selectedQuestionId);
                    alert("Question updated successfully");
                    fetchQuestions();
                    setShowModal(false);
                    resetForm();
                } else {
                    alert(result.message);
                }
            } else {
                const response = await fetch("/api/create-question", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        questionText,
                        questionType,
                        tagId: selectedTag,
                        createdBy: user?.name || "Admin",
                    }),
                });
                const result = await response.json();

                if (result.success) {
                    const questionId = result.data.rowKey;
                    await saveOptions(questionId);
                    alert("Question created successfully");
                    fetchQuestions();
                    setShowModal(false);
                    resetForm();
                } else {
                    alert(result.message);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        }
    };

    return (
        <div className="category-page">
            <Sidebar />

            <div className="category-content">
                <Header user={user} />

                <div className="category-body">
                    <div className="page-header">
                        <h1 className="page-title">Questions</h1>
                        <div className="page-actions">

                            <button
                                className="create-btn"
                                onClick={downloadExcelTemplate}
                            >
                                Download Excel Template
                            </button>

                            <button
                                className="create-btn"
                                onClick={openCreateModal}
                            >
                                + Add Question
                            </button>

                        </div>
                    </div>

                    <div className="question-table-card">
                        <table className="question-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Question</th>
                                    <th>Type</th>
                                    <th>Tag</th>
                                    <th>Options</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="empty-question"
                                        >
                                            No questions found.
                                            <br />
                                            Click on "Add Question" to create
                                            your first question.
                                        </td>
                                    </tr>
                                ) : (
                                    questions.map((question, index) => (
                                        <tr key={question.id}>
                                            <td>{index + 1}</td>
                                            <td>{question.questionText}</td>
                                            <td>{question.questionType}</td>
                                            <td>
                                                {question.tagId ? (
                                                    <span
                                                        style={{
                                                            color: getTagColor(
                                                                question.tagId
                                                            ),
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {getTagName(
                                                            question.tagId
                                                        )}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td>
                                                {question.options?.length >
                                                0 ? (
                                                    <ul className="question-options-list">
                                                        {question.options.map(
                                                            (option: any) => (
                                                                <li
                                                                    key={
                                                                        option.id
                                                                    }
                                                                >
                                                                    {
                                                                        option.optionText
                                                                    }
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td>
                                                <div className="question-actions">
                                                    <EditIconBtn
                                                        onClick={() =>
                                                            handleEditQuestion(
                                                                question
                                                            )
                                                        }
                                                    />
                                                    <DeleteIconBtn
                                                        onClick={() =>
                                                            handleDeleteQuestion(
                                                                question.id
                                                            )
                                                        }
                                                    />
                                                </div>
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
                    <div className="modal question-modal">
                        <h2>
                            {editMode ? "Edit Question" : "Add Question"}
                        </h2>

                        <div className="form-group">
                            <label>Question Text</label>
                            <textarea
                                value={questionText}
                                onChange={(e) =>
                                    setQuestionText(e.target.value)
                                }
                                placeholder="Enter your question"
                            />
                        </div>

                        <div className="form-group">
                            <label>Question Type</label>
                            <select
                                value={questionType}
                                onChange={(e) =>
                                    setQuestionType(e.target.value)
                                }
                            >
                                <option value="">Select type</option>
                                <option value="Multiple Choice">
                                    Multiple Choice
                                </option>
                                <option value="Single Choice">
                                    Single Choice
                                </option>
                                <option value="Text">Text</option>
                                <option value="Rating">Rating</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tag</label>
                            <select
                                value={selectedTag}
                                onChange={(e) =>
                                    setSelectedTag(e.target.value)
                                }
                            >
                                <option value="">Select tag</option>
                                {tags.map((tag) => (
                                    <option key={tag.id} value={tag.id}>
                                        {tag.tagName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(questionType === "Multiple Choice" ||
                            questionType === "Single Choice") && (
                            <div className="form-group">
                                <label>Options</label>
                                {options.map((option, index) => (
                                    <div
                                        key={index}
                                        className="option-row"
                                    >
                                        <input
                                            value={option}
                                            onChange={(e) =>
                                                updateOption(
                                                    index,
                                                    e.target.value
                                                )
                                            }
                                            placeholder={`Option ${index + 1}`}
                                        />
                                        <button
                                            className="delete-option"
                                            onClick={() =>
                                                removeOption(index)
                                            }
                                            type="button"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className="add-option-btn"
                                    onClick={addOption}
                                    type="button"
                                >
                                    + Add Option
                                </button>
                            </div>
                        )}

                        <div className="modal-buttons">
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleSaveQuestion}
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
