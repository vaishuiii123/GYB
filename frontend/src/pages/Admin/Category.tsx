import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  DeleteIconBtn,
  EditIconBtn,
  ViewIconBtn,
} from "../../components/AdminActionIcons";
import "../../styles/CategoryManagement.css";
import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

type PageProps = {
    user?: any;
};

export default function Category({ user }: PageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { parentCategoryId } = useParams();
    const middleCategoryId = location.state?.middleCategoryId || "";
    const parentCategoryIdFromState =
        location.state?.parentCategoryId || parentCategoryId;

    const topCategoryName =
        location.state?.topCategoryName || "Top Category";
    const middleCategoryName =
        location.state?.middleCategoryName || "Middle Category";
    const parentCategoryName =
        location.state?.parentCategoryName || "Parent Category";

    const [categories, setCategories] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [categoryName, setCategoryName] = useState("");
    const [selectedTag, setSelectedTag] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");

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

    const fetchCategories = async () => {
        try {
            if (!parentCategoryId) {
                alert("Parent Category not found");
                return;
            }
            const response = await fetch(
                `/api/get-category?parentCategoryId=${parentCategoryId}`
            );
            const result = await response.json();
            if (result.success) {
                setCategories(result.data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchTags();
        fetchCategories();
    }, [parentCategoryId]);

    const getTagName = (tagId: string) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? tag.tagName : "-";
    };

    const getTagColor = (tagId: string) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? tag.tagColor : "#9B304A";
    };

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            alert("Please enter Category Name");
            return;
        }

        try {
            const response = await fetch("/api/create-category", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentCategoryId,
                    categoryName,
                    tagId: selectedTag,
                    createdBy: user?.name || "Admin",
                }),
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                setShowModal(false);
                setCategoryName("");
                setSelectedTag("");
                fetchCategories();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Something went wrong.");
        }
    };

    const handleEditCategory = (category: any) => {
        setEditMode(true);
        setSelectedCategoryId(category.id);
        setCategoryName(category.categoryName);
        setSelectedTag(category.tagId || "");
        setShowModal(true);
    };

    const handleUpdateCategory = async () => {
        if (!categoryName.trim()) {
            alert("Please enter Category Name");
            return;
        }

        try {
            const response = await fetch(
                `/api/update-category?id=${selectedCategoryId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        categoryName,
                        tagId: selectedTag,
                        modifiedBy: user?.name || "Admin",
                    }),
                }
            );
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                setShowModal(false);
                setCategoryName("");
                setSelectedTag("");
                setEditMode(false);
                setSelectedCategoryId("");
                fetchCategories();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Update failed.");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this Category?"
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/delete-category?id=${id}`, {
                method: "DELETE",
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                fetchCategories();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Delete failed.");
        }
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
                            {middleCategoryName}
                        </span>
                        {" > "}
                        <span
                            onClick={() =>
                                navigate(
                                    `/category/${parentCategoryIdFromState}`,
                                    {
                                        state: {
                                            topCategoryName,
                                            middleCategoryId,
                                            middleCategoryName,
                                            parentCategoryName,
                                        },
                                    }
                                )
                            }
                            style={{ cursor: "pointer" }}
                        >
                            {parentCategoryName}
                        </span>
                        {" > "}
                        Category
                    </div>

                    <div className="page-header">
                        <h1 className="page-title">Categories</h1>
                        <button
                            className="create-btn"
                            onClick={() => {
                                setEditMode(false);
                                setCategoryName("");
                                setSelectedTag("");
                                setShowModal(true);
                            }}
                        >
                            + Create Category
                        </button>
                    </div>

                    <div className="category-card">
                        <table className="category-table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Tag</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={3}>
                                            No Categories Available
                                        </td>
                                    </tr>
                                ) : (
                                    categories.map((category) => (
                                        <tr key={category.id}>
                                            <td>{category.categoryName}</td>
                                            <td>
                                                {category.tagId ? (
                                                    <span
                                                        style={{
                                                            color: getTagColor(
                                                                category.tagId
                                                            ),
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {getTagName(
                                                            category.tagId
                                                        )}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td>
                                                <div className="admin-action-group">
                                                    <ViewIconBtn
                                                        onClick={() =>
                                                            navigate(
                                                                `/category-questions/${category.id}`,
                                                                {
                                                                    state: {
                                                                        topCategoryName,
                                                                        middleCategoryId,
                                                                        middleCategoryName,
                                                                        parentCategoryId:
                                                                            parentCategoryIdFromState,
                                                                        parentCategoryName,
                                                                        categoryName:
                                                                            category.categoryName,
                                                                    },
                                                                }
                                                            )
                                                        }
                                                    />
                                                    <EditIconBtn
                                                        onClick={() =>
                                                            handleEditCategory(
                                                                category
                                                            )
                                                        }
                                                    />
                                                    <DeleteIconBtn
                                                        onClick={() =>
                                                            handleDeleteCategory(
                                                                category.id
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
                    <div className="modal">
                        <h2>
                            {editMode
                                ? "Edit Category"
                                : "Create Category"}
                        </h2>

                        <div className="form-group">
                            <label>Category Name</label>
                            <input
                                type="text"
                                value={categoryName}
                                onChange={(e) =>
                                    setCategoryName(e.target.value)
                                }
                                placeholder="Enter Category Name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Assign Tag (Questions)</label>
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

                        <div className="modal-buttons">
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setShowModal(false);
                                    setCategoryName("");
                                    setSelectedTag("");
                                    setEditMode(false);
                                    setSelectedCategoryId("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={
                                    editMode
                                        ? handleUpdateCategory
                                        : handleSaveCategory
                                }
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
