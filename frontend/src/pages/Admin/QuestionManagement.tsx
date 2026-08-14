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
import {
  ADMIN_CACHE_KEYS,
  readAdminListCache,
  writeAdminListCache,
} from "../../utils/adminListCache";

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
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadRows, setUploadRows] = useState<any[]>([]);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const fetchTags = async () => {
        try {
            const response = await fetch("/api/get-tags");
            const result = await response.json();
            if (result.success) {
                const list = result.data || [];
                setTags(list);
                writeAdminListCache(ADMIN_CACHE_KEYS.tags, list);
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
                writeAdminListCache(
                  ADMIN_CACHE_KEYS.questions,
                  questionsWithOptions
                );
            }
        } catch (error) {
            console.error("Error fetching questions:", error);
        }
    };

   const downloadExcelTemplate = async () => {
    try {
        // Get the latest tags directly from the database
        const tagResponse = await fetch("/api/get-tags");
        const tagResult = await tagResponse.json();

        if (!tagResult.success) {
            alert("Unable to fetch the latest tags.");
            return;
        }

        // Update page state
        setTags(tagResult.data);

        // Get exact tag names from database
        const tagNames = tagResult.data
            .map((tag: any) => tag.tagName)
            .filter(
                (name: string) =>
                    name && name.trim() !== ""
            );

        // Question types
        const questionTypes = [
            "Multiple Choice",
            "Single Choice",
            "Text",
            "Rating",
        ];

        // Create workbook
        const workbook = new ExcelJS.Workbook();

        // Main Questions sheet
        const worksheet =
            workbook.addWorksheet("Questions");

        // Hidden sheet for dropdown values
        const listsWorksheet =
            workbook.addWorksheet("Lists");

        // Hide the Lists sheet completely
        listsWorksheet.state = "veryHidden";

        // --------------------------------
        // Lists sheet data
        // --------------------------------

        // Question Types
        listsWorksheet.getCell("A1").value =
            "Question Types";

        questionTypes.forEach(
            (type: string, index: number) => {
                listsWorksheet.getCell(
                    index + 2,
                    1
                ).value = type;
            }
        );

        // Tags
        listsWorksheet.getCell("B1").value =
            "Tags";

        tagNames.forEach(
            (tag: string, index: number) => {
                listsWorksheet.getCell(
                    index + 2,
                    2
                ).value = tag;
            }
        );
        // --------------------------------
        // Questions sheet
        // --------------------------------

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

        // Header styling
        const headerRow =
            worksheet.getRow(1);

        headerRow.font = {
            bold: true,
        };

        headerRow.alignment = {
            vertical: "middle",
            horizontal: "center",
        };

        // Column widths
        worksheet.getColumn(1).width = 50;
        worksheet.getColumn(2).width = 22;
        worksheet.getColumn(3).width = 45;
        worksheet.getColumn(4).width = 20;
        worksheet.getColumn(5).width = 20;
        worksheet.getColumn(6).width = 20;
        worksheet.getColumn(7).width = 20;
        worksheet.getColumn(8).width = 20;

        // --------------------------------
        // Dropdowns
        // --------------------------------

        for (let row = 2; row <= 500; row++) {

            // Question Type dropdown
            worksheet.getCell(
                row,
                2
            ).dataValidation = {
                type: "list",
                allowBlank: true,
                formulae: [
                    `='Lists'!$A$2:$A$${questionTypes.length + 1}`,
                ],
                showErrorMessage: true,
                errorTitle:
                    "Invalid Question Type",
                error:
                    "Please select a Question Type from the dropdown.",
            };

            // Tag dropdown
            if (tagNames.length > 0) {
                worksheet.getCell(
                    row,
                    3
                ).dataValidation = {
                    type: "list",
                    allowBlank: true,
                    formulae: [
                        `='Lists'!$B$2:$B$${tagNames.length + 1}`,
                    ],
                    showErrorMessage: true,
                    errorTitle:
                        "Invalid Tag",
                    error:
                        "Please select a Tag from the dropdown.",
                };
            }
        }

        // Freeze header row
        worksheet.views = [
            {
                state: "frozen",
                ySplit: 1,
            },
        ];

        // --------------------------------
        // Generate Excel file
        // --------------------------------

        const buffer =
            await workbook.xlsx.writeBuffer();

        const blob = new Blob(
            [buffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
        );

        const url =
            window.URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            "Question_Upload_Template.xlsx";

        document.body.appendChild(link);

        link.click();

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

   const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
) => {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    setUploadSuccess(false);

    // Check file type
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
        alert("Please upload an Excel (.xlsx) file.");
        event.target.value = "";
        return;
    }

    try {
        setUploadFile(file);
        setUploadErrors([]);
        setUploadRows([]);

        // Read Excel file
        const buffer = await file.arrayBuffer();

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load(buffer);

        // Get the Questions sheet from uploaded Excel
        const worksheet =
            workbook.getWorksheet("Questions");

        if (!worksheet) {
            alert(
                'Invalid template. Please upload the "Question_Upload_Template.xlsx" file.'
            );
            event.target.value = "";
            return;
        }

        // Get the latest tags from the database
        const tagResponse =
            await fetch("/api/get-tags");

        const tagResult =
            await tagResponse.json();

        if (!tagResult.success) {
            alert(
                "Unable to fetch the latest tags from the database."
            );
            event.target.value = "";
            return;
        }

        // Keep local tags up to date
        setTags(tagResult.data);

        const latestTags =
            tagResult.data;

        const rows: any[] = [];
        const errors: string[] = [];

        // Read rows starting from row 2
        worksheet.eachRow(
            (row, rowNumber) => {

                // Skip header
                if (rowNumber === 1) {
                    return;
                }

                const question =
                    row.getCell(1).value
                        ?.toString()
                        .trim() || "";

                const type =
                    row.getCell(2).value
                        ?.toString()
                        .trim() || "";

                const tag =
                    row.getCell(3).value
                        ?.toString()
                        .trim() || "";

                const option1 =
                    row.getCell(4).value
                        ?.toString()
                        .trim() || "";

                const option2 =
                    row.getCell(5).value
                        ?.toString()
                        .trim() || "";

                const option3 =
                    row.getCell(6).value
                        ?.toString()
                        .trim() || "";

                const option4 =
                    row.getCell(7).value
                        ?.toString()
                        .trim() || "";

                const option5 =
                    row.getCell(8).value
                        ?.toString()
                        .trim() || "";

                // Ignore completely empty rows
                const isEmpty =
                    !question &&
                    !type &&
                    !tag &&
                    !option1 &&
                    !option2 &&
                    !option3 &&
                    !option4 &&
                    !option5;

                if (isEmpty) {
                    return;
                }

                const rowErrors: string[] = [];

                // -----------------------------
                // Validate Question
                // -----------------------------

                if (!question) {
                    rowErrors.push(
                        "Question is required"
                    );
                }

                // -----------------------------
                // Validate Question Type
                // -----------------------------

                const validTypes = [
                    "Multiple Choice",
                    "Single Choice",
                    "Text",
                    "Rating",
                ];

                if (!type) {
                    rowErrors.push(
                        "Question Type is required"
                    );
                } else if (
                    !validTypes.includes(type)
                ) {
                    rowErrors.push(
                        `Invalid Question Type "${type}"`
                    );
                }

                // -----------------------------
                // Validate Tag
                // -----------------------------

                let matchedTag: any = null;

                if (!tag) {

                    rowErrors.push(
                        "Tag is required"
                    );

                } else {

                    matchedTag =
                        latestTags.find(
                            (t: any) =>
                                t.tagName
                                    ?.trim()
                                    .toLowerCase() ===
                                tag.toLowerCase()
                        );

                    if (!matchedTag) {
                        rowErrors.push(
                            `Tag "${tag}" does not exist`
                        );
                    }
                }

                // -----------------------------
                // Get Options
                // -----------------------------

                const rowOptions = [
                    option1,
                    option2,
                    option3,
                    option4,
                    option5,
                ].filter(
                    (option) =>
                        option !== ""
                );

                // -----------------------------
                // Validate Options
                // -----------------------------

                if (
                    type === "Multiple Choice" ||
                    type === "Single Choice"
                ) {

                    if (
                        rowOptions.length < 2
                    ) {
                        rowErrors.push(
                            "At least 2 options are required"
                        );
                    }
                }

                if (
                    type === "Text" ||
                    type === "Rating"
                ) {

                    if (
                        rowOptions.length > 0
                    ) {
                        rowErrors.push(
                            `${type} questions should not have options`
                        );
                    }
                }

                // -----------------------------
                // Create Parsed Row
                // -----------------------------

                const parsedRow = {
                    rowNumber,
                    question,
                    questionType: type,
                    tagName: tag,
                    tagId:
                        matchedTag?.id || "",
                    options: rowOptions,
                    errors: rowErrors,
                    valid:
                        rowErrors.length === 0,
                };

                rows.push(parsedRow);

                // Add errors
                if (
                    rowErrors.length > 0
                ) {
                    errors.push(
                        `Row ${rowNumber}: ${rowErrors.join(
                            ", "
                        )}`
                    );
                }
            }
        );

        // Save results
        setUploadRows(rows);
        setUploadErrors(errors);

        // No questions
        if (rows.length === 0) {
            alert(
                "No questions found in the Excel file."
            );
            return;
        }

        // Excel successfully loaded
        setUploadSuccess(true);

        // Show preview
        setShowUploadModal(true);

    } catch (error) {

        console.error(
            "Error reading Excel file:",
            error
        );

        alert(
            "Unable to read the Excel file. Please use the downloaded template."
        );
    }
};

const handleImportQuestions = async () => {
    const validRows = uploadRows.filter(
        (row) => row.valid
    );

    if (validRows.length === 0) {
        alert("There are no valid questions to import.");
        return;
    }

    try {
        let importedCount = 0;

        for (const row of validRows) {

            // --------------------------------
            // 1. Create the question
            // --------------------------------

            const questionResponse = await fetch(
                "/api/create-question",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        questionText: row.question,
                        questionType: row.questionType,
                        tagId: row.tagId,
                        createdBy:
                            user?.name || "Admin",
                    }),
                }
            );

            const questionResult =
                await questionResponse.json();

            if (!questionResponse.ok ||
                !questionResult.success) {

                throw new Error(
                    questionResult.message ||
                    `Failed to create question in Excel row ${row.rowNumber}`
                );
            }

            // Get newly created question ID
            const questionId =
                questionResult.data.rowKey;

            // --------------------------------
            // 2. Create options
            // --------------------------------

            if (row.options.length > 0) {

                const optionsResponse =
                    await fetch(
                        "/api/create-question-options",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body: JSON.stringify({
                                questionId,
                                options: row.options,
                                createdBy:
                                    user?.name ||
                                    "Admin",
                            }),
                        }
                    );

                const optionsResult =
                    await optionsResponse.json();

                if (
                    !optionsResponse.ok ||
                    !optionsResult.success
                ) {
                    throw new Error(
                        optionsResult.message ||
                        `Failed to create options for Excel row ${row.rowNumber}`
                    );
                }
            }

            importedCount++;
        }

        // --------------------------------
        // 3. Success
        // --------------------------------

        alert(
            `${importedCount} question${
                importedCount === 1
                    ? ""
                    : "s"
            } imported successfully.`
        );

        // Refresh question table
        await fetchQuestions();

        // Close upload popup
        setShowUploadModal(false);

        // Clear upload data
        setUploadFile(null);
        setUploadRows([]);
        setUploadErrors([]);
        setUploadSuccess(false);

    } catch (error) {

        console.error(
            "Error importing questions:",
            error
        );

        alert(
            error instanceof Error
                ? error.message
                : "Something went wrong while importing questions."
        );
    }
};

    useEffect(() => {
        const cachedTags = readAdminListCache<any[]>(ADMIN_CACHE_KEYS.tags);
        const cachedQuestions = readAdminListCache<any[]>(
          ADMIN_CACHE_KEYS.questions
        );
        if (cachedTags) {
            setTags(cachedTags);
        }
        if (cachedQuestions) {
            setQuestions(cachedQuestions);
        }
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
                            onClick={() =>
                                document
                                    .getElementById("questionExcelUpload")
                                    ?.click()
                            }
                        >
                            Upload Questions
                        </button>

                        <input
                            id="questionExcelUpload"
                            type="file"
                            accept=".xlsx"
                            style={{ display: "none" }}
                            onChange={handleExcelUpload}
                        />

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

            {showUploadModal && (
                <div className="modal-overlay">
                    <div
                        className="modal question-modal"
                        style={{
                            width: "90%",
                            maxWidth: "1100px",
                            maxHeight: "85vh",
                            overflowY: "auto",
                        }}
                    >
                        <h2>Upload Questions</h2>

                        {uploadSuccess && (
                            <div
                                style={{
                                    padding: "12px 16px",
                                    marginBottom: "15px",
                                    borderRadius: "6px",
                                    backgroundColor: "#e8f7ee",
                                    border: "1px solid #28a745",
                                    color: "#1f7a3d",
                                }}
                            >
                                <strong>
                                    ✓ Excel file loaded successfully
                                </strong>

                                <div
                                    style={{
                                        marginTop: "5px",
                                        fontSize: "14px",
                                    }}
                                >
                                    {uploadFile?.name}
                                </div>
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: "30px",
                                marginBottom: "20px",
                            }}
                        >
                            <div>
                                <strong>
                                    Questions Found
                                </strong>
                                <div>
                                    {uploadRows.length}
                                </div>
                            </div>

                            <div>
                                <strong>
                                    Valid Questions
                                </strong>
                                <div>
                                    {
                                        uploadRows.filter(
                                            (row) => row.valid
                                        ).length
                                    }
                                </div>
                            </div>

                            <div>
                                <strong>
                                    Errors
                                </strong>
                                <div>
                                    {uploadErrors.length}
                                </div>
                            </div>
                        </div>

                        {uploadErrors.length > 0 && (
                            <div
                                style={{
                                    padding: "12px",
                                    marginBottom: "20px",
                                    border: "1px solid #dc3545",
                                    borderRadius: "6px",
                                    color: "#842029",
                                    backgroundColor: "#f8d7da",
                                }}
                            >
                                <strong>
                                    ⚠ Please fix the following errors:
                                </strong>

                                <ul>
                                    {uploadErrors.map(
                                        (error, index) => (
                                            <li key={index}>
                                                {error}
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}

                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                marginBottom: "20px",
                            }}
                        >
                            <thead>
                                <tr>
                                    <th>Row</th>
                                    <th>Question</th>
                                    <th>Type</th>
                                    <th>Tag</th>
                                    <th>Options</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {uploadRows.map(
                                    (item, index) => (
                                        <tr key={index}>
                                            <td>
                                                {item.rowNumber}
                                            </td>

                                            <td>
                                                {item.question}
                                            </td>

                                            <td>
                                                {item.questionType}
                                            </td>

                                            <td>
                                                {item.tagName}
                                            </td>

                                            <td>
                                                {item.options.length > 0
                                                    ? item.options.join(
                                                          ", "
                                                      )
                                                    : "-"}
                                            </td>

                                            <td>
                                                {item.valid
                                                    ? "✓ Valid"
                                                    : "✕ Invalid"}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>

                        <div className="modal-buttons">
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFile(null);
                                    setUploadRows([]);
                                    setUploadErrors([]);
                                    setUploadSuccess(false);
                                }}
                            >
                                Cancel
                            </button>

                            <button
                            className="save-btn"
                            onClick={handleImportQuestions}
                            disabled={
                                uploadRows.length === 0 ||
                                uploadErrors.length > 0
                            }
                        >
                            Import Questions
                        </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}
