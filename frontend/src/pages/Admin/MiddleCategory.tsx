import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/CategoryManagement.css";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

type PageProps = {
  user?: any;
};

export default function MiddleCategory({ user }: PageProps) {

    const { topCategoryId } = useParams();
    const location = useLocation();

    const topCategoryName = location.state?.topCategoryName || "";

    const [middleCategories, setMiddleCategories] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [middleCategoryName, setMiddleCategoryName] = useState("");

    const fetchMiddleCategories = async () => {
        try {
            if (!topCategoryId) {
                alert("Top Category not found");
                return;
            }

            const response = await fetch(
                `/api/get-middle-categories?topCategoryId=${topCategoryId}`
            );

            const result = await response.json();

            if (result.success) {
                setMiddleCategories(result.data);
            }

        } catch(error) {
            console.error("Error fetching middle categories:", error);
        }
    };

    useEffect(() => {
        fetchMiddleCategories();
    }, [topCategoryId]);

    const handleSaveMiddleCategory = async () => {

        if (!middleCategoryName.trim()) {
            alert("Please enter Middle Category Name");
            return;
        }

        try {
            const response = await fetch("/api/create-middle-category", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topCategoryId,
                    middleCategoryName,
                    createdBy: "Admin",
                }),
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message);
                setShowModal(false);
                setMiddleCategoryName("");
                fetchMiddleCategories();
            } else {
                alert(result.message);
            }

        } catch(error) {
            console.error(error);
            alert("Something went wrong.");
        }
    };

    return (
        <div className="category-page">

            <Sidebar />

            <div className="category-content">

                <Header user={user} />

                <div className="category-body">

                    <div className="breadcrumb">
                        Category Management
                        {" > "}
                        {topCategoryName}
                    </div>

                    <div className="page-header">

                        <h1 className="page-title">
                            Middle Categories
                        </h1>

                        <button
                            className="create-btn"
                            onClick={() => setShowModal(true)}
                        >
                            + Create Middle Category
                        </button>

                    </div>

                    <div className="category-card">

                        <table className="category-table">

                            <thead>
                                <tr>
                                    <th>Middle Category Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                            {
                                middleCategories.length === 0 ? (
                                    <tr>
                                        <td>
                                            No Middle Categories Available
                                        </td>
                                        <td></td>
                                    </tr>
                                ) : (
                                    middleCategories.map((category) => (
                                        <tr key={category.id}>

                                            <td>
                                                {category.middleCategoryName}
                                            </td>

                                            <td>

                                                <button className="view-btn">
                                                    View
                                                </button>

                                                <button className="edit-btn">
                                                    Edit
                                                </button>

                                                <button className="delete-btn">
                                                    Delete
                                                </button>

                                            </td>

                                        </tr>
                                    ))
                                )
                            }

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

            {
                showModal && (
                    <div className="modal-overlay">

                        <div className="modal">

                            <h2>
                                Create Middle Category
                            </h2>

                            <div className="form-group">

                                <label>
                                    Middle Category Name
                                </label>

                                <input
                                    type="text"
                                    value={middleCategoryName}
                                    onChange={(e) => setMiddleCategoryName(e.target.value)}
                                    placeholder="Enter Middle Category Name"
                                />

                            </div>

                            <div className="modal-buttons">

                                <button
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowModal(false);
                                        setMiddleCategoryName("");
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="save-btn"
                                    onClick={handleSaveMiddleCategory}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}