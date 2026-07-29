import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/CategoryManagement.css";
import { useState, useEffect } from "react";

type PageProps = {
  user?: any;
};

export default function CategoryManagement({ user }: PageProps) {

  const [activeTab, setActiveTab] = useState("top");

  return (
  <div className="category-page">
    <Sidebar />

    <div className="category-content">
      <Header user={user} />

      <div className="category-body">
        <div className="page-header">
          <h1 className="page-title">
            Category Management
          </h1>

          <button className="create-btn">
            + Create Top Category
          </button>
        </div>

        <div className="tabs">
          {[
            { id: "top", label: "Top Category" },
            { id: "middle", label: "Middle Category" },
            { id: "parent", label: "Parent Category" },
            { id: "category", label: "Category" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);
  
 }
