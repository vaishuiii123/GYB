import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  DeleteIconBtn,
  EditIconBtn,
  ViewIconBtn,
} from "../../components/AdminActionIcons";
import "../../styles/CategoryManagement.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type PageProps = {
  user?: any;
};

export default function CategoryManagement({ user }: PageProps) {

  const [showModal, setShowModal] = useState(false);
  const [topCategoryName, setTopCategoryName] = useState("");
  const [topCategories, setTopCategories] = useState<any[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const navigate = useNavigate();

  // CREATE TOP CATEGORY
  const handleSaveTopCategory = async () => {

    if (!topCategoryName.trim()) {
      alert("Please enter Top Category Name");
      return;
    }

    try {

      const response = await fetch("/api/create-top-category", {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          topCategoryName,
          createdBy: "Admin",
        }),

      });


      const result = await response.json();


      if (result.success) {

        alert(result.message);

        setShowModal(false);

        setTopCategoryName("");

        fetchTopCategories();

      } 
      else {

        alert(result.message);

      }


    } 
    catch (error) {

      console.error(error);

      alert("Something went wrong.");

    }

  };



  // GET TOP CATEGORIES
  const fetchTopCategories = async () => {

    try {

      const response = await fetch("/api/get-top-categories");

      const result = await response.json();


      if (result.success) {

        setTopCategories(result.data);

      }


    } 
    catch (error) {

      console.error(
        "Error fetching categories:",
        error
      );

    }

  };

  // DELETE TOP CATEGORY
  const handleDeleteCategory = async (id:string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this category?"
    );
    if (!confirmDelete) {
      return;
    }
    try {
      const response = await fetch(`/api/delete-top-category?id=${id}`,
        {
          method: "DELETE"
        }
      );
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        fetchTopCategories();
      }
      else {
        alert(result.message);
      }
    }
    catch(error) {
      console.error(error);
      alert("Delete failed.");
    }
  };

const handleUpdateTopCategory = async () => {

  if (!topCategoryName.trim()) {
    alert("Please enter Top Category Name");
    return;
  }

  try {

    const response = await fetch(
      `/api/update-top-category?id=${selectedCategoryId}`,
      {
        method:"PUT",
        headers:{
          "Content-Type":"application/json",
        },
        body:JSON.stringify({
          topCategoryName,
          modifiedBy:"Admin"
        })
      }
    );
    const result = await response.json();

    if(result.success){
      alert(result.message);
      setShowModal(false);
      setTopCategoryName("");
      setEditMode(false);
      fetchTopCategories();
    }
    else{
      alert(result.message);
    }
  }
  catch(error){
    console.error(error);
    alert("Update failed.");
  }
};



  // LOAD DATA
  useEffect(() => {

    fetchTopCategories();

  }, []);

const handleEditCategory = (category:any) => {
  setEditMode(true);
  setSelectedCategoryId(category.id);
  setTopCategoryName(category.topCategoryName);
  setShowModal(true);
};

  return (
    <div className="category-page">
      <Sidebar />

      <div className="category-content">

        <Header user={user} />

        <div className="category-body">
          <div className="breadcrumb">
            Category Management
          </div>

          <div className="page-header">
            <h1 className="page-title">
              Top Categories
            </h1>

            <div className="page-header-actions">
              <button
                className="create-btn"
                onClick={() => setShowModal(true)}
              >
                + Create Top Category
              </button>
            </div>
          </div>
          {/* Table */}
          <div className="category-card">
            <table className="category-table">
              <thead>
                <tr>
                  <th>
                    Top Category Name
                  </th>
                  <th>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
              {topCategories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {category.topCategoryName}
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <ViewIconBtn
                          onClick={() =>
                            navigate(`/middle-category/${category.id}`, {
                              state: {
                                topCategoryName: category.topCategoryName,
                              },
                            })
                          }
                        />
                        <EditIconBtn
                          onClick={() => handleEditCategory(category)}
                        />
                        <DeleteIconBtn
                          onClick={() => handleDeleteCategory(category.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>
                Create Top Category
              </h2>

              <div className="form-group">
                <label>
                  Top Category Name
                </label>

                <input
                  type="text"
                  value={topCategoryName}
                  onChange={(e) =>
                    setTopCategoryName(e.target.value)
                  }
                  placeholder="Enter Top Category Name"
                />
              </div>
              <div className="modal-buttons">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    setTopCategoryName("");
                  }}
                >
                  Cancel
                </button>

                <button
                className="save-btn"
                onClick={
                  editMode
                  ? handleUpdateTopCategory
                  : handleSaveTopCategory
                }
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
