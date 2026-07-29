import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/CategoryManagement.css";

type PageProps = {
  user?: any;
};

export default function CategoryManagement({ user }: PageProps) {
  return (
    <div className="category-page">
      <Sidebar />

      <div className="category-content">
        <Header user={user} />

        <div className="category-body">

          {/* Breadcrumb */}

          <div className="breadcrumb">
            Category Management
          </div>

          {/* Header */}

          <div className="page-header">
            <h1 className="page-title">
              Top Categories
            </h1>

            <button className="create-btn">
              + Create Top Category
            </button>
          </div>

          {/* Table Card */}

          <div className="category-card">
            <table className="category-table">
              <thead>
                <tr>
                  <th>Top Category Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Business Assessment</td>
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
                <tr>
                  <td>Markets & Customers</td>
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

              </tbody>

            </table>

          </div>

        </div>
      </div>
    </div>
  );
}
