import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Organization({ user }: PageProps) {

  // ================= ORGANIZATIONS =================
  const [organizations, setOrganizations] = useState<any[]>([]);

  // ================= FETCH FROM AZURE =================
  const fetchOrganizations = async () => {
    try {
      const res = await fetch(
              `/api/get-organizations?createdBy=${encodeURIComponent(
                user?.name || ""
              )}`
            );
      const data = await res.json();

      if (data.success) {
        setOrganizations(data.organizations);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // ================= MODAL =================
  const [showOrgModal, setShowOrgModal] = useState(false);

  // ================= FORM =================
  const [orgForm, setOrgForm] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
  });

  // ================= CREATE ORGANIZATION =================
  const handleCreateOrganization = async () => {

    if (
      !orgForm.organizationName ||
      !orgForm.contactPerson ||
      !orgForm.email
    ) {
      alert("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("/api/create-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName: orgForm.organizationName,
          contactPerson: orgForm.contactPerson,
          email: orgForm.email,
          createdBy: user?.name || "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Organization created successfully ✅");

        setOrgForm({
          organizationName: "",
          contactPerson: "",
          email: "",
        });

        setShowOrgModal(false);

        // ✅ Refresh table
        fetchOrganizations();
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create organization");
    }
  };

  return (
  <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>

      <Sidebar />

<div
  style={{
    flex: 1,
    marginLeft: "220px", // Sidebar width
  }}
>
  <Header user={user} />

  <div
    style={{
      padding: "25px",
      marginTop: "80px", // Header height + spacing
    }}
  >

        {/* HEADER */}
      <div style={pageHeader}>
          <h1 style={pageTitle}>Organization</h1>
          <button onClick={() => setShowOrgModal(true)} style={saveBtn}>
            Create Organization
          </button>
        </div>

        {/* TABLE */}
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeader}>Sr No.</th>
                <th style={tableHeader}>Organization Name</th>
                <th style={tableHeader}>Contact Person</th>
                <th style={tableHeader}>Email</th>
                <th style={tableHeader}>Created By</th>
              </tr>
            </thead>

            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                    No data found
                  </td>
                </tr>
              ) : (
                organizations.map((org, index) => (
                  <tr key={index}>
                    <td style={tableCell}>{index + 1}</td>
                    <td style={tableCell}>{org.organizationName || "-"}</td>
                    <td style={tableCell}>{org.contactPerson || "-"}</td>
                    <td style={tableCell}>{org.email || "-"}</td>
                    <td style={tableCell}>{org.createdBy || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL */}
      {showOrgModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>

            <h2>Create Organization</h2>

            <input
              style={inputStyle}
              placeholder="Organization Name"
              value={orgForm.organizationName}
              onChange={(e) =>
                setOrgForm({ ...orgForm, organizationName: e.target.value })
              }
            />

            <input
              style={inputStyle}
              placeholder="Contact Person"
              value={orgForm.contactPerson}
              onChange={(e) =>
                setOrgForm({ ...orgForm, contactPerson: e.target.value })
              }
            />

            <input
              style={inputStyle}
              placeholder="Email"
              value={orgForm.email}
              onChange={(e) =>
                setOrgForm({ ...orgForm, email: e.target.value })
              }
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "end" }}>
              <button onClick={() => setShowOrgModal(false)}>Cancel</button>
              <button onClick={handleCreateOrganization} style={saveBtn}>
                Save
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
    </div>
  );
}

/* ================= STYLES ================= */

const card: any = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
};

const saveBtn: any = {
  background: "#3b5bcc",
  color: "white",
  padding: "8px 16px",
  border: "none",
  borderRadius: "8px",
  fontWeight: "500",
  cursor: "pointer",
};


const tableHeader: any = {
  padding: "16px",
  fontSize: "15px",
  textAlign: "left",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: "600",
};

const tableCell: any = {
  padding: "12px",
  borderBottom: "1px solid #f1f1f1",
};


const modalOverlay: any = {
  position: "fixed",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalBox: any = {
  background: "white",
  padding: "25px",
  borderRadius: "12px",
  width: "400px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const inputStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  borderRadius: "6px",
};


const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const pageTitle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};

