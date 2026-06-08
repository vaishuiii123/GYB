import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Category({ user }: PageProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [masterCategoryName, setMasterCategoryName] =
    useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "/api/get-master-categories"
      );

      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch(
        "/api/create-master-category",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            masterCategoryName,
            createdBy: user?.username || "",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Master Category Created");

        setShowModal(false);
        setMasterCategoryName("");

        fetchCategories();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create category");
    }
  };

  const handleView = (category: any) => {
    alert(
      `View clicked for ${category.masterCategoryName}`
    );
  };

  const handleEdit = (category: any) => {
    alert(
      `Edit clicked for ${category.masterCategoryName}`
    );
  };

  const handleDelete = (category: any) => {
    alert(
      `Delete clicked for ${category.masterCategoryName}`
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
            {/* HEADER */}

            <div style={pageHeader}>
              <h1 style={pageTitle}>
                Category Management
              </h1>

              <button
                style={saveBtn}
                onClick={() =>
                  setShowModal(true)
                }
              >
                Create Master Category
              </button>
            </div>

            {/* TABLE */}

            <div style={card}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeader}>
                      Master Category Name
                    </th>

                    <th style={tableHeader}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td style={tableCell}>
                        {cat.masterCategoryName}
                      </td>

                      <td style={tableCell}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            style={viewBtn}
                            onClick={() =>
                              handleView(cat)
                            }
                          >
                            👁 View
                          </button>

                          <button
                            style={editBtn}
                            onClick={() =>
                              handleEdit(cat)
                            }
                          >
                            ✏ Edit
                          </button>

                          <button
                            style={deleteBtn}
                            onClick={() =>
                              handleDelete(cat)
                            }
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CREATE MODAL */}

            {showModal && (
              <div style={modalOverlay}>
                <div style={modalBox}>
                  <h2>
                    Create Master Category
                  </h2>

                  <input
                    style={inputStyle}
                    placeholder="Master Category Name"
                    value={masterCategoryName}
                    onChange={(e) =>
                      setMasterCategoryName(
                        e.target.value
                      )
                    }
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "end",
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

/* ================= STYLES ================= */

const card: any = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow:
    "0 4px 20px rgba(0,0,0,0.06)",
};

const pageHeader: any = {
  display: "flex",
  justifyContent: "space-between",
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
  borderBottom:
    "1px solid #e5e7eb",
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
  justifyContent: "center",
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
  border:
    "1px solid #d1d5db",
  borderRadius: "6px",
};
