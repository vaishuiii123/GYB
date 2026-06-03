import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Organization({ user }: PageProps) {

  const [showParticipantModal, setShowParticipantModal] =
  useState(false);

const [participantForm, setParticipantForm] =
  useState({
    organization: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    password: "",
  });

 useEffect(() => {
  if (user?.email) {
    fetchOrganizations();
  }
}, [user]);

  const generatePassword = () => {
  const first =
    participantForm.firstName.charAt(0).toLowerCase();

  const last =
    participantForm.lastName.charAt(0).toLowerCase();

  setParticipantForm({
    ...participantForm,
    password: `${first}${last}123`,
  });
};

  const handleCreateParticipant = async () => {

  try {

  const response = await fetch(
    "/api/create-participant",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...participantForm,
        createdBy: user?.email || "",
      }),
    }
  );

  const text = await response.text();

  console.log("Status:", response.status);
  console.log("Response:", text);

  if (!response.ok) {
    alert("API Error");
    return;
  }

  if (!text || text.trim() === "") {
    alert("API returned empty response");
    return;
  }

  const result = JSON.parse(text);

  if (result.success) {

    alert("Participant created successfully");

    setShowParticipantModal(false);

    setParticipantForm({
      organization: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phoneNo: "",
      password: "",
    });

  } else {
    alert(result.error || "Failed to create participant");
  }

} catch (error) {
  console.error("Create Participant Error:", error);
  alert("Failed to create participant");
}
  
  // ================= ORGANIZATIONS =================
  const [organizations, setOrganizations] = useState<any[]>([]);

  // ================= FETCH FROM AZURE =================
  const fetchOrganizations = async () => {
    try {
      const res = await fetch(
              `/api/get-organizations?createdBy=${encodeURIComponent(
                user?.email || ""
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
          createdBy: user?.email || "",
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
      marginTop: "70px", // Header height + spacing
    }}
  >

        {/* HEADER */}
         <div style={pageHeader}>
      <h1 style={pageTitle}>Organization</h1>
    
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setShowParticipantModal(true)}
          style={saveBtn}
        >
          Create Participant
        </button>
    
        <button
          onClick={() => setShowOrgModal(true)}
          style={saveBtn}
        >
          Create Organization
        </button>
      </div>
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
              </tr>
            </thead>

            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
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

  {showParticipantModal && (
  <div style={modalOverlay}>
    <div style={modalBox}>

      <h2>Add Participant</h2>

      <select
        style={inputStyle}
        value={participantForm.organization}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            organization: e.target.value,
          })
        }
      >
        <option value="">
          Select Organization
        </option>

        {organizations.map((org: any) => (
          <option
            key={org.id}
            value={org.organizationName}
          >
            {org.organizationName}
          </option>
        ))}
      </select>

      <input
        style={inputStyle}
        placeholder="First Name"
        value={participantForm.firstName}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            firstName: e.target.value,
          })
        }
      />

      <input
        style={inputStyle}
        placeholder="Middle Name"
        value={participantForm.middleName}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            middleName: e.target.value,
          })
        }
      />

      <input
        style={inputStyle}
        placeholder="Last Name"
        value={participantForm.lastName}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            lastName: e.target.value,
          })
        }
      />

      <input
        style={inputStyle}
        placeholder="Email"
        value={participantForm.email}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            email: e.target.value,
          })
        }
      />

      <input
        style={inputStyle}
        placeholder="Phone Number"
        value={participantForm.phoneNo}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            phoneNo: e.target.value,
          })
        }
      />

      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        <input
          style={{
            ...inputStyle,
            flex: 1,
          }}
          placeholder="Password"
          value={participantForm.password}
          readOnly
        />

        <button
          style={saveBtn}
          onClick={generatePassword}
        >
          Generate
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "end",
          gap: "10px",
        }}
      >
        <button
          onClick={() =>
            setShowParticipantModal(false)
          }
        >
          Cancel
        </button>

        <button
          style={saveBtn}
          onClick={handleCreateParticipant}
        >
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

