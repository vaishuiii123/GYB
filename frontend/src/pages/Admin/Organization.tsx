import { useState, useEffect } from "react";
//import * as XLSX from "xlsx";

import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Organization({ user }: PageProps) {

  const [assignedParticipants, setAssignedParticipants] = useState<any[]>([]);

const [allParticipants, setAllParticipants] = useState<any[]>([]);

const [showParticipantModal, setShowParticipantModal] = useState(false);

const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  
 const [editOrganization, setEditOrganization] =
  useState<any>({
    id: "",
    organizationName: "",
    contactPerson: "",
    email: "",
  });

  const [showViewModal, setShowViewModal] =
  useState(false);

  const [selectedOrganization, setSelectedOrganization] =
  useState<any>(null);
  


useEffect(() => {
  if (user?.email) {
    fetchOrganizations();
    loadParticipants();
  }
}, [user]);

 const handleEdit = (org: any) => {
  console.log("EDIT CLICKED");
  setEditOrganization(org);
  setShowEditModal(true);
};

  const handleDelete = async (org: any) => {

  const response = await fetch(
    `/api/get-participants?organization=${encodeURIComponent(
      org.organizationName
    )}`
  );

  const data = await response.json();

  if (
    data.participants &&
    data.participants.length > 0
  ) {
    alert(
      "You cannot delete this organization because participants are already added."
    );
    return;
  }

  const confirmDelete =
    window.confirm(
      `Delete ${org.organizationName}?`
    );

  if (!confirmDelete) return;

  alert(
    "Delete API will be called here."
  );
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

  //===================================== VIEW ORGANIZATION AND ADD PARTICIPANTS INTO ORGANIZATION ======================================================

  const handleView = async (
  organization: any
) => {
    console.log(organization);

  setSelectedOrganization(
    organization
  );

  setShowViewModal(true);

  const response =
    await fetch(
      `/api/get-organization-participants?organizationId=${organization.id}`
    );

  const data =
    await response.json();

  if (data.success) {

    setAssignedParticipants(
      data.participants
    );

    setSelectedParticipantIds(
      data.participants.map(
        (p: any) => p.id
      )
    );
  }
};

// ====================================================== LOAD PARTICIPANTS ===========================================================================

  const loadParticipants =
  async () => {

    const response =
      await fetch(
        "/api/get-participants"
      );

    const data =
      await response.json();

    if (data.success) {

      setAllParticipants(
        data.participants
      );
    }
  };

  const toggleParticipant =
  (
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
            id !==
            participantId
        )
      );

    } else {

      setSelectedParticipantIds([
        ...selectedParticipantIds,
        participantId,
      ]);
    }
  };

  const saveParticipants =
  async () => {

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
              selectedOrganization.id,

            participantIds:
              selectedParticipantIds,

            createdBy:
              user?.username,
          }),
        }
      );

    const data =
      await response.json();

            if (data.success) {
        
          alert(
            "Participants Assigned Successfully"
          );
        
          setShowParticipantModal(false);
        
          handleView(selectedOrganization);
        
          setShowViewModal(true);
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

          {showParticipantModal && (
              <div style={modalOverlay}>
                <div
                  style={{
                    ...modalBox,
                    width: "500px",
                    maxHeight: "600px",
                    overflowY: "auto",
                  }}
                >
                  <h2>
                    Add Participants
                  </h2>
            
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {allParticipants.length > 0 ? (
                      allParticipants.map(
                        (participant) => (
                          <label
                            key={participant.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px",
                              borderBottom:
                                "1px solid #f1f1f1",
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
            
                            <span>
                              {
                                participant.firstName
                              }{" "}
                              {
                                participant.lastName
                              }
                            </span>
                          </label>
                        )
                      )
                    ) : (
                      <p>
                        No Participants Found
                      </p>
                    )}
                  </div>
            
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "flex-end",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setShowParticipantModal(
                          false
                        )
                      }
                    >
                      Cancel
                    </button>
            
                    <button
                      style={saveBtn}
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

            {showViewModal && (
              <div style={modalOverlay}>
                <div
                  style={{
                    ...modalBox,
                    width: "700px",
                  }}
                >
                  <h2>Organization Details</h2>
            
                  <p>
                    <b>Organization Name:</b>{" "}
                    {selectedOrganization?.organizationName}
                  </p>
            
                  <p>
                    <b>Contact Person:</b>{" "}
                    {selectedOrganization?.contactPerson}
                  </p>
            
                  <p>
                    <b>Email:</b>{" "}
                    {selectedOrganization?.email}
                  </p>
            <button
              style={saveBtn}
              onClick={() => {
                setShowViewModal(false);
                setShowParticipantModal(true);
              }}
            >
              Add Participant
            </button>
            
                  <h3
                    style={{
                      marginTop: "20px",
                      marginBottom: "10px",
                    }}
                  >
                    Assigned Participants
                  </h3>
            
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={tableHeader}>
                          Name
                        </th>
            
                        <th style={tableHeader}>
                          Email
                        </th>
                      </tr>
                    </thead>
            
                    <tbody>
                      {assignedParticipants.length >
                      0 ? (
                        assignedParticipants.map(
                          (participant) => (
                            <tr
                              key={
                                participant.id
                              }
                            >
                              <td style={tableCell}>
                                {
                                  participant.firstName
                                }{" "}
                                {
                                  participant.lastName
                                }
                              </td>
            
                              <td style={tableCell}>
                                {
                                  participant.email
                                }
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            No Participants Assigned
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
            
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      style={saveBtn}
                      onClick={() =>
                        setShowViewModal(false)
                      }
                    >
                      Close
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
