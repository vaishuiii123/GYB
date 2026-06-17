import { useState, useEffect } from "react";
//import * as XLSX from "xlsx";

import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Organization({ user }: PageProps) {

  const [selectedAssignedParticipants, setSelectedAssignedParticipants,] = useState<string[]>([]);
  
  const [showEditModal, setShowEditModal] = useState(false);

 const [editOrganization, setEditOrganization] =
  useState<any>({
    id: "",
    organizationName: "",
    contactPerson: "",
    email: "",
  });

  const [showViewModal, setShowViewModal] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  
  const [assignedParticipants, setAssignedParticipants] = useState<any[]>([]);
  
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  
  const [searchText, setSearchText] = useState("");


 useEffect(() => {
  if (user?.email) {
    fetchOrganizations();
  }
}, [user]);

 const handleEdit = (org: any) => {
  console.log("EDIT CLICKED");
  setEditOrganization(org);
  setShowEditModal(true);
};

  // ========================== DELETE ORGANIZATION ======================================

  const handleDelete = async (
      org: any
    ) => {
      const confirmDelete = window.confirm(`Delete ${org.organizationName}?`);
    
      if (!confirmDelete) 
        { return; }
        try {
          const response = await fetch("/api/delete-organization",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                organizationId:
                  org.id,
              }),
            }
          );
        const data = await response.json();
        if (data.success) {
          alert("Organization deleted successfully");
          fetchOrganizations();
        } else {
          alert(data.message || data.error);
        }
      } catch (error) {
          console.error(error);
          alert("Failed to delete organization");
      }
    };
  
  //=========================== DELETE PARTICIPANT ========================================

  const deleteParticipant = async (
        participantId: string
      ) => {
      
        const confirmDelete =
          window.confirm(
            "Remove this participant from the organization?"
          );
      
        if (!confirmDelete) {
          return;
        }
      
        try {
      
          const response =
            await fetch(
              "/api/delete-organization-participants",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  organizationId:
                    selectedOrganization.id,
                  participantIds: [
                    participantId,
                  ],
                }),
              }
            );
      
          const data =
            await response.json();
      
          if (data.success) {
      
            await loadAssignedParticipants(
              selectedOrganization.id
            );
      
            setSuccessMessage(
              "Participant removed successfully"
            );
      
            setTimeout(() => {
              setSuccessMessage("");
            }, 3000);
          }
      
        } catch (error) {
      
          console.error(error);
      
          alert(
            "Failed to remove participant"
          );
        }
      };
      
      const deleteSelectedParticipants =
        async () => {
      
          if (
            selectedAssignedParticipants.length === 0
          ) {
            return;
          }
      
          const confirmDelete =
            window.confirm(
              `Remove ${selectedAssignedParticipants.length} participant(s) from this organization?`
            );
      
          if (!confirmDelete) {
            return;
          }
      
          try {
      
            const response =
              await fetch(
                "/api/delete-organization-participants",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    organizationId:
                      selectedOrganization.id,
      
                    participantIds:
                      selectedAssignedParticipants,
                  }),
                }
              );
      
            const data =
              await response.json();
      
            if (data.success) {
      
              setSelectedAssignedParticipants([]);
      
              await loadAssignedParticipants(
                selectedOrganization.id
              );
      
              setSuccessMessage(
                `${data.deletedCount || selectedAssignedParticipants.length} participant(s) removed successfully`
              );
      
              setTimeout(() => {
                setSuccessMessage("");
              }, 3000);
            }
      
          } catch (error) {
      
            console.error(error);
      
            alert(
              "Failed to remove participants"
            );
          }
        };

  const toggleAssignedParticipant = (
  participantId: string
) => {
  if (
    selectedAssignedParticipants.includes(
      participantId
    )
  ) {
    setSelectedAssignedParticipants(
      selectedAssignedParticipants.filter(
        (id) => id !== participantId
      )
    );
  } else {
    setSelectedAssignedParticipants([
      ...selectedAssignedParticipants,
      participantId,
    ]);
  }
};

  const toggleSelectAllParticipants = () => {
  if (
    selectedAssignedParticipants.length ===
    assignedParticipants.length
  ) {
    setSelectedAssignedParticipants([]);
  } else {
    setSelectedAssignedParticipants(
      assignedParticipants.map(
        (participant) => participant.id
      )
    );
  }
};

  const handleView = async (
  org: any
) => {

  setSelectedOrganization(org);

  await loadParticipants();

  await loadAssignedParticipants(
    org.id
  );

  setShowViewModal(true);

  setSelectedAssignedParticipants([]);
};

  //======================================== SAVE PARTICIPANTS ====================================================================

  const saveParticipants =
      async () => {
    
        try {
    
          const response =
            await fetch(
              "/api/save-organization-participants",
              {
                method: "POST",
    
                headers: {
                  "Content-Type":
                    "application/json",
                },
    
                body: JSON.stringify({
                  organizationId:
                  selectedOrganization?.id,
    
                  participantIds:
                    selectedParticipantIds,
    
                  createdBy:
                    user?.email,
                }),
              }
            );
    
          const data =
            await response.json();
    
      if (data.success) {
        setSuccessMessage(
          "Participants Assigned Successfully"
        );
      
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
          
            setShowParticipantModal(false);
          
            const response = await fetch(
              `/api/get-organization-participants?organizationId=${selectedOrganization?.id}`
            );
          
            const participantsData =
              await response.json();
          
            if (participantsData.success) {
              setAssignedParticipants(
                participantsData.participants
              );
            }
          
            setShowViewModal(true);
          }
    
        } catch (error) {
    
          console.error(error);
        }
      };
  const toggleParticipant = (
      participantId: string
    ) => {
    
      if (
        selectedParticipantIds.includes(
          participantId
        )
      ) {
    
        setSelectedParticipantIds(
          selectedParticipantIds.filter(
            (id) =>
              id !== participantId
          )
        );
    
      } else {
    
        setSelectedParticipantIds([
          ...selectedParticipantIds,
          participantId,
        ]);
      }
    };

  //============================= UPDATE ORGANIZATION =====================================

        const handleUpdateOrganization = async () => {
        try {
          const response = await fetch(
            "/api/update-organization",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: editOrganization.id,
                organizationName:
                  editOrganization.organizationName,
                contactPerson:
                  editOrganization.contactPerson,
                email: editOrganization.email,
              }),
            }
          );
      
          const data = await response.json();
      
          if (data.success) {
            alert("Organization updated successfully");
      
            setShowEditModal(false);
      
            fetchOrganizations();
          } else {
            alert(data.error);
          }
        } catch (error) {
          console.error(error);
          alert("Failed to update organization");
        }
      };
  
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

  //========================================= LOAD PARTICIPANTS ===========================================================

  const loadParticipants = async () => {
    try {
      const response = await fetch(
        "/api/get-participants"
      );
  
      const data =
        await response.json();
  
      if (data.success) {
        setAllParticipants(
          data.participants
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadAssignedParticipants =
  async (
    organizationId: string
  ) => {

    try {

      const response =
        await fetch(
          `/api/get-organization-participants?organizationId=${organizationId}`
        );

      const data =
        await response.json();

      if (data.success) {

        setAssignedParticipants(
          data.participants
        );
      }

    } catch (error) {

      console.error(error);
    }
  };

   return (
    <>
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
                  <th style={tableHeader}>Organization Name</th>
                  <th style={tableHeader}>Contact Person</th>
                  <th style={tableHeader}>Email</th>
                  <th style={tableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org, index) => (
                    <tr key={index}>
                      <td style={tableCell}>
                        {org.organizationName}
                      </td>
                
                      <td style={tableCell}>
                        {org.contactPerson}
                      </td>
                
                      <td style={tableCell}>
                        {org.email}
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
                            onClick={() => handleView(org)}
                          >
                            👁 View
                          </button>
                
                          <button
                            style={editBtn}
                            onClick={() => handleEdit(org)}
                          >
                            ✏ Edit
                          </button>
                
                          <button
                            style={deleteBtn}
                            onClick={() => handleDelete(org)}
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

            {showViewModal && (
              <div style={modalOverlay}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "20px",
                    width: "900px",
                    maxHeight: "85vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow:
                      "0 20px 40px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Scrollable Content */}
                  <div
                    style={{
                      padding: "30px",
                      overflowY: "auto",
                      flex: 1,
                    }}
                  >
                    <h2
                      style={{
                        marginTop: 0,
                        marginBottom: "20px",
                        fontSize: "32px",
                        fontWeight: "700",
                      }}
                    >
                      Organization Details
                    </h2>
            
                    {/* Organization Card */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "24px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          paddingBottom: "18px",
                          borderBottom: "1px solid #e5e7eb",
                          marginBottom: "18px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "5px",
                          }}
                        >
                          Organization Name
                        </div>
            
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "600",
                          }}
                        >
                          {selectedOrganization?.organizationName}
                        </div>
                      </div>
            
                      <div
                        style={{
                          paddingBottom: "18px",
                          borderBottom: "1px solid #e5e7eb",
                          marginBottom: "18px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "5px",
                          }}
                        >
                          Contact Person
                        </div>
            
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "500",
                          }}
                        >
                          {selectedOrganization?.contactPerson}
                        </div>
                      </div>
            
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "5px",
                          }}
                        >
                          Email
                        </div>
            
                        <div
                          style={{
                            fontSize: "15px",
                          }}
                        >
                          {selectedOrganization?.email}
                        </div>
                      </div>
                    </div>
            
                    {/* Add Participants */}
                    <button
                      style={{
                        ...saveBtn,
                        marginBottom: "25px",
                      }}
                      onClick={() => {
                        setShowViewModal(false);
                        setShowParticipantModal(true);
                      }}
                    >
                      Add Participants
                    </button>
            
                    {/* Assigned Participants Card */}
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "20px",
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          marginBottom: "20px",
                          fontSize: "22px",
                          fontWeight: "600",
                        }}
                      >
                        Assigned Participants (
                        {assignedParticipants.length})
                      </h3>
            
                      <div
                        style={{
                          maxHeight: "250px",
                          overflowY: "auto",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                          }}
                        >
                          <thead>
                            <tr>
                              <th style={tableHeader}>
                                <input
                                  type="checkbox"
                                  checked={
                                    assignedParticipants.length > 0 &&
                                    selectedAssignedParticipants.length ===
                                      assignedParticipants.length
                                  }
                                  onChange={
                                    toggleSelectAllParticipants
                                  }
                                />
                              </th>
            
                              <th style={tableHeader}>
                                Name
                              </th>
            
                              <th style={tableHeader}>
                                Email
                              </th>
            
                              <th style={tableHeader}>
                                Action
                              </th>
                            </tr>
                          </thead>
            
                          <tbody>
                            {assignedParticipants.length >
                            0 ? (
                              assignedParticipants.map(
                                (participant) => (
                                  <tr
                                    key={participant.id}
                                  >
                                    <td
                                      style={tableCell}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedAssignedParticipants.includes(
                                          participant.id
                                        )}
                                        onChange={() =>
                                          toggleAssignedParticipant(
                                            participant.id
                                          )
                                        }
                                      />
                                    </td>
            
                                    <td
                                      style={tableCell}
                                    >
                                      {
                                        participant.firstName
                                      }{" "}
                                      {
                                        participant.lastName
                                      }
                                    </td>
            
                                    <td
                                      style={tableCell}
                                    >
                                      {
                                        participant.email
                                      }
                                    </td>
            
                                    <td
                                      style={tableCell}
                                    >
                                      <button
                                        onClick={() =>
                                          deleteParticipant(
                                            participant.id
                                          )
                                        }
                                        style={{
                                          background:
                                            "#dc2626",
                                          color:
                                            "white",
                                          border:
                                            "none",
                                          padding:
                                            "8px 12px",
                                          borderRadius:
                                            "6px",
                                          cursor:
                                            "pointer",
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                )
                              )
                            ) : (
                              <tr>
                                <td
                                  colSpan={4}
                                  style={{
                                    textAlign:
                                      "center",
                                    padding:
                                      "20px",
                                  }}
                                >
                                  No Participants Assigned
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
            
                  {/* Footer */}
                  <div
                    style={{
                      borderTop:
                        "1px solid #e5e7eb",
                      padding: "20px 30px",
                      display: "flex",
                      justifyContent:
                        "flex-end",
                      gap: "15px",
                    }}
                  >
                    <button
                      style={{
                        padding: "10px 20px",
                        border:
                          "1px solid #d1d5db",
                        background: "#fff",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setShowViewModal(false)
                      }
                    >
                      Close
                    </button>
            
                    <button
                      onClick={
                        deleteSelectedParticipants
                      }
                      disabled={
                        selectedAssignedParticipants.length ===
                        0
                      }
                      style={{
                        background:
                          selectedAssignedParticipants.length ===
                          0
                            ? "#9ca3af"
                            : "#dc2626",
                        color: "white",
                        border: "none",
                        padding: "10px 18px",
                        borderRadius: "8px",
                        cursor:
                          selectedAssignedParticipants.length ===
                          0
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            )}

          {showParticipantModal && (
              <div style={modalOverlay}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "20px",
                    width: "850px",
                    maxHeight: "85vh",
                    overflowY: "auto",
                    padding: "30px",
                    boxShadow:
                      "0 20px 40px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Header */}
            
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      marginBottom: "25px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "32px",
                        fontWeight: "700",
                        color: "#1f2937",
                      }}
                    >
                      Add Participants
                    </h2>
            
                    <button
                      onClick={() =>
                        setShowParticipantModal(
                          false
                        )
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        fontSize: "28px",
                        cursor: "pointer",
                        color: "#6b7280",
                      }}
                    >
                      ×
                    </button>
                  </div>
            
                  {/* Search */}
            
                  <input
                    type="text"
                    placeholder="Search Participant"
                    value={searchText}
                    onChange={(e) =>
                      setSearchText(
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "14px",
                      border:
                        "1px solid #d1d5db",
                      borderRadius: "10px",
                      marginBottom: "20px",
                      fontSize: "15px",
                      boxSizing: "border-box",
                    }}
                  />
            
                  {/* Participants List */}
            
                  <div
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "15px",
                      maxHeight: "350px",
                      overflowY: "auto",
                      marginBottom: "25px",
                    }}
                  >
                    {allParticipants
                      .filter(
                        (participant) =>
                          `${participant.firstName} ${participant.lastName}`
                            .toLowerCase()
                            .includes(
                              searchText.toLowerCase()
                            )
                      )
                      .map(
                        (participant) => (
                          <label
                            key={
                              participant.id
                            }
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "12px",
                              padding:
                                "12px 8px",
                              borderBottom:
                                "1px solid #f3f4f6",
                              cursor:
                                "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedParticipantIds.includes(
                                participant.id
                              )}
                              onChange={() =>
                                toggleParticipant(
                                  participant.id
                                )
                              }
                            />
            
                            <span
                              style={{
                                fontSize:
                                  "16px",
                                color:
                                  "#111827",
                              }}
                            >
                              {
                                participant.firstName
                              }{" "}
                              {
                                participant.lastName
                              }
                            </span>
                          </label>
                        )
                      )}
            
                    {allParticipants.filter(
                      (participant) =>
                        `${participant.firstName} ${participant.lastName}`
                          .toLowerCase()
                          .includes(
                            searchText.toLowerCase()
                          )
                    ).length === 0 && (
                      <div
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "20px",
                          color:
                            "#6b7280",
                        }}
                      >
                        No participants found
                      </div>
                    )}
                  </div>
            
                  {/* Footer Buttons */}
            
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "flex-end",
                      gap: "12px",
                      borderTop:
                        "1px solid #e5e7eb",
                      paddingTop: "20px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setShowParticipantModal(
                          false
                        )
                      }
                      style={{
                        padding:
                          "12px 24px",
                        borderRadius:
                          "10px",
                        border:
                          "1px solid #d1d5db",
                        background:
                          "#fff",
                        cursor:
                          "pointer",
                        fontWeight:
                          "500",
                      }}
                    >
                      Cancel
                    </button>
            
                    <button
                      style={{
                        background:
                          "#3b5bcc",
                        color: "white",
                        border: "none",
                        padding:
                          "12px 24px",
                        borderRadius:
                          "10px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "600",
                      }}
                      onClick={
                        saveParticipants
                      }
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
                      
            {showEditModal && (
              <div style={modalOverlay}>
                <div style={modalBox}>
                  <h2>Edit Organization</h2>

                  <input style={inputStyle} value={editOrganization.organizationName}
                    onChange={(e) =>
                      setEditOrganization({
                        ...editOrganization,
                        organizationName: e.target.value,
                      })
                    }
                  />

                  <input style={inputStyle} value={editOrganization.contactPerson}
                    onChange={(e) =>
                      setEditOrganization({
                        ...editOrganization,
                        contactPerson: e.target.value,
                      })
                    }
                  />

                  <input style={inputStyle} value={editOrganization.email}
                    onChange={(e) =>
                      setEditOrganization({
                        ...editOrganization,
                        email: e.target.value,
                      })
                    }
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "end",
                      gap: "10px",
                    }}
                  >
                    <button onClick={() => setShowEditModal(false)}>
                      Cancel
                    </button>

                    <button style={saveBtn} onClick={handleUpdateOrganization}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

          {successMessage && (
              <div
                style={{
                  position: "fixed",
                  top: "90px",
                  right: "30px",
                  background: "#22c55e",
                  color: "white",
                  padding: "14px 22px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow:
                    "0 8px 20px rgba(0,0,0,0.15)",
                  zIndex: 99999,
                  animation: "slideIn 0.3s ease",
                }}
              >
                ✅ Participants Assigned Successfully
              </div>
            )}
        </div> {/* Main Content */}

      </div> {/* Right Side */}  

    </>
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

const viewBtn: any = {
  background: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "13px",
};

const editBtn: any = {
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "13px",
};

const deleteBtn: any = {
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "13px",
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
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
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
