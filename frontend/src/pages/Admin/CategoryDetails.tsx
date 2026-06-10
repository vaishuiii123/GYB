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

export default function CategoryDetails({
  user,
}: PageProps) {

  const { masterCategoryId } =
    useParams();

  const location = useLocation();

  const navigate = useNavigate();

  const [categories, setCategories] =
    useState<any[]>([]);

  const [showModal, setShowModal] =
    useState(false);

  const [categoryName, setCategoryName] =
    useState("");

  const [error, setError] =
    useState("");

  const masterCategoryName =
    location.state?.masterCategoryName ||
    "Category";

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {

    try {

      const response = await fetch(
        `/api/get-categories?masterCategoryId=${masterCategoryId}`
      );

      const data =
        await response.json();

      if (data.success) {
        setCategories(
          data.categories
        );
      }

    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateCategory =
    async () => {

      if (!categoryName.trim()) {
        setError(
          "Category Name is required"
        );
        return;
      }

      try {

        const response =
          await fetch(
            "/api/create-category",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                masterCategoryId,
                categoryName,
                createdBy:
                  user?.username || "",
              }),
            }
          );

        const data =
          await response.json();

        if (data.success) {

          setShowModal(false);

          setCategoryName("");

          setError("");

          fetchCategories();
        }

      } catch (error) {
        console.error(error);
      }
    };

  const handleView = (category: any) => {
      navigate(
        `/subcategory/${category.id}`,
        {
          state: {
            categoryName:
              category.categoryName,
      
            categoryId:
              category.id,
      
            masterCategoryName:
              masterCategoryName,
      
            masterCategoryId:
              masterCategoryId,
          },
        }
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

            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "15px",
                cursor: "pointer",
              }}
            >
              <span
                onClick={() =>
                  navigate("/category/categoryId")
                }
              >
                Master Categories
              </span>

              {" > "}

              <b>
                {masterCategoryName}
              </b>
            </div>

            <div style={pageHeader}>
              <h1 style={pageTitle}>
                Categories
              </h1>

              <button
                style={saveBtn}
                onClick={() =>
                  setShowModal(true)
                }
              >
                Create Category
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
                      Category Name
                    </th>

                    <th style={tableHeader}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {categories.map(
                    (category) => (
                      <tr
                        key={category.id}
                      >
                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            category.categoryName
                          }
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              gap: "8px",
                            }}
                          >
                            <button
                              style={viewBtn}
                              onClick={() =>
                                handleView(category)
                              }
                            >
                              👁 View
                            </button>

                            <button
                              style={
                                editBtn
                              }
                            >
                              ✏ Edit
                            </button>

                            <button
                              style={
                                deleteBtn
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
                <div
                  style={modalBox}
                >
                  <h2>
                    Create Category
                  </h2>

                  <input
                    style={{
                      ...inputStyle,
                      border: error
                        ? "1px solid #dc2626"
                        : "1px solid #d1d5db",
                    }}
                    placeholder="Category Name"
                    value={
                      categoryName
                    }
                    onChange={(e) => {
                      setCategoryName(
                        e.target.value
                      );

                      setError("");
                    }}
                  />

                  {error && (
                    <div
                      style={{
                        color:
                          "#dc2626",
                        fontSize:
                          "14px",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "end",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setShowModal(
                          false
                        )
                      }
                    >
                      Cancel
                    </button>

                    <button
                      style={saveBtn}
                      onClick={
                        handleCreateCategory
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
  textAlign: "left",
  background: "#f9fafb",
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
};

const editBtn: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
};

const deleteBtn: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
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
  width: "450px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const inputStyle: any = {
  padding: "10px",
  borderRadius: "6px",
};
