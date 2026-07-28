import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Organization.css";

type PageProps = {
  user?: any;
};

export default function Organization({ user }: PageProps) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);

  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [assignedParticipants, setAssignedParticipants] = useState<any[]>([]);

  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    []
  );

  const [
    selectedAssignedParticipants,
    setSelectedAssignedParticipants,
  ] = useState<string[]>([]);

  const [searchText, setSearchText] = useState("");

  const [orgForm, setOrgForm] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
  });

  const [editOrganization, setEditOrganization] = useState<any>({
    id: "",
    organizationName: "",
    contactPerson: "",
    email: "",
  });

  useEffect(() => {
    if (user?.email) {
      fetchOrganizations();
    }
  }, [user]);

  // ================= FETCH ORGANIZATIONS =================

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

  // ================= CREATE ORGANIZATION =================

  const handleCreateOrganization = async () => {
    if (!orgForm.organizationName || !orgForm.contactPerson || !orgForm.email) {
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
        fetchOrganizations();
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create organization");
    }
  };

  // ================= EDIT ORGANIZATION =================

  const handleEdit = (org: any) => {
    setEditOrganization(org);
    setShowEditModal(true);
  };

  const handleUpdateOrganization = async () => {
    try {
      const response = await fetch("/api/update-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editOrganization.id,
          organizationName: editOrganization.organizationName,
          contactPerson: editOrganization.contactPerson,
          email: editOrganization.email,
        }),
      });

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

  // ================= DELETE ORGANIZATION =================

  const handleDelete = async (org: any) => {
    const confirmDelete = window.confirm(`Delete ${org.organizationName}?`);

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch("/api/delete-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: org.id,
        }),
      });

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

  // ================= VIEW ORGANIZATION =================

  const handleView = async (org: any) => {
    setSelectedOrganization(org);

    await loadParticipants();
    await loadAssignedParticipants(org.id);

    setShowViewModal(true);
    setSelectedAssignedParticipants([]);
  };

  // ================= LOAD PARTICIPANTS =================

  const loadParticipants = async () => {
    try {
      const response = await fetch("/api/get-participants");
      const data = await response.json();

      if (data.success) {
        setAllParticipants(data.participants);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadAssignedParticipants = async (organizationId: string) => {
    try {
      const response = await fetch(
        `/api/get-organization-participants?organizationId=${organizationId}`
      );

      const data = await response.json();

      if (data.success) {
        setAssignedParticipants(data.participants);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ================= SAVE PARTICIPANTS =================

  const saveParticipants = async () => {
    try {
      const response = await fetch("/api/save-organization-participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: selectedOrganization?.id,
          participantIds: selectedParticipantIds,
          createdBy: user?.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Participants Assigned Successfully");

        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);

        setShowParticipantModal(false);

        const response = await fetch(
          `/api/get-organization-participants?organizationId=${selectedOrganization?.id}`
        );

        const participantsData = await response.json();

        if (participantsData.success) {
          setAssignedParticipants(participantsData.participants);
        }

        setSelectedParticipantIds([]);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleParticipant = (participantId: string) => {
    if (selectedParticipantIds.includes(participantId)) {
      setSelectedParticipantIds(
        selectedParticipantIds.filter((id) => id !== participantId)
      );
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, participantId]);
    }
  };

  // ================= DELETE PARTICIPANT =================

  const deleteParticipant = async (participantId: string) => {
    const confirmDelete = window.confirm(
      "Remove this participant from the organization?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch("/api/delete-organization-participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: selectedOrganization.id,
          participantIds: [participantId],
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadAssignedParticipants(selectedOrganization.id);

        setSuccessMessage("Participant removed successfully");

        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to remove participant");
    }
  };

  const deleteSelectedParticipants = async () => {
    if (selectedAssignedParticipants.length === 0) {
      return;
    }

    const confirmDelete = window.confirm(
      `Remove ${selectedAssignedParticipants.length} participant(s) from this organization?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch("/api/delete-organization-participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: selectedOrganization.id,
          participantIds: selectedAssignedParticipants,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedAssignedParticipants([]);

        await loadAssignedParticipants(selectedOrganization.id);

        setSuccessMessage(
          `${
            data.deletedCount || selectedAssignedParticipants.length
          } participant(s) removed successfully`
        );

        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to remove participants");
    }
  };

  const toggleAssignedParticipant = (participantId: string) => {
    if (selectedAssignedParticipants.includes(participantId)) {
      setSelectedAssignedParticipants(
        selectedAssignedParticipants.filter((id) => id !== participantId)
      );
    } else {
      setSelectedAssignedParticipants([
        ...selectedAssignedParticipants,
        participantId,
      ]);
    }
  };

  const toggleSelectAllParticipants = () => {
    if (selectedAssignedParticipants.length === assignedParticipants.length) {
      setSelectedAssignedParticipants([]);
    } else {
      setSelectedAssignedParticipants(
        assignedParticipants.map((participant) => participant.id)
      );
    }
  };

  return (
    <>
      <div className="organization-layout">
        <Sidebar />

        <div className="organization-main">
          <Header user={user} />

          <div className="organization-content">
            {/* HEADER */}
            <div className="page-header">
              <h1 className="page-title">Organization</h1>

              <div className="header-actions">
                <button
                  onClick={() => setShowOrgModal(true)}
                  className="save-btn"
                >
                  Create Organization
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="card">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Organization Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {organizations.map((org, index) => (
                    <tr key={index}>
                      <td>{org.organizationName}</td>
                      <td>{org.contactPerson}</td>
                      <td>{org.email}</td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="view-btn"
                            onClick={() => handleView(org)}
                          >
                            👁 View
                          </button>

                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(org)}
                          >
                            ✏ Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(org)}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {organizations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-text">
                        No organizations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CREATE ORGANIZATION MODAL */}
          {showOrgModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h2>Create Organization</h2>

                <input
                  className="input-style"
                  placeholder="Organization Name"
                  value={orgForm.organizationName}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      organizationName: e.target.value,
                    })
                  }
                />

                <input
                  className="input-style"
                  placeholder="Contact Person"
                  value={orgForm.contactPerson}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      contactPerson: e.target.value,
                    })
                  }
                />

                <input
                  className="input-style"
                  placeholder="Email"
                  value={orgForm.email}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      email: e.target.value,
                    })
                  }
                />

                <div className="modal-footer">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowOrgModal(false)}
                  >
                    Cancel
                  </button>

                  <button onClick={handleCreateOrganization} className="save-btn">
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW ORGANIZATION MODAL */}
          {showViewModal && (
            <div className="modal-overlay">
              <div className="view-modal">
                <div className="view-modal-content">
                  <h2 className="modal-title">Organization Details</h2>

                  <div className="details-card">
                    <div className="detail-row">
                      <div className="detail-label">Organization Name</div>
                      <div className="detail-value bold">
                        {selectedOrganization?.organizationName}
                      </div>
                    </div>

                    <div className="detail-row">
                      <div className="detail-label">Contact Person</div>
                      <div className="detail-value">
                        {selectedOrganization?.contactPerson}
                      </div>
                    </div>

                    <div className="detail-row no-border">
                      <div className="detail-label">Email</div>
                      <div className="detail-value">
                        {selectedOrganization?.email}
                      </div>
                    </div>
                  </div>

                  <button
                    className="save-btn add-participant-btn"
                    onClick={() => {
                      setShowViewModal(false);
                      setShowParticipantModal(true);
                    }}
                  >
                    Add Participants
                  </button>

                  <div className="participants-card">
                    <h3>
                      Assigned Participants ({assignedParticipants.length})
                    </h3>

                    <div className="participants-table-wrapper">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                checked={
                                  assignedParticipants.length > 0 &&
                                  selectedAssignedParticipants.length ===
                                    assignedParticipants.length
                                }
                                onChange={toggleSelectAllParticipants}
                              />
                            </th>

                            <th>Name</th>
                            <th>Email</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {assignedParticipants.length > 0 ? (
                            assignedParticipants.map((participant) => (
                              <tr key={participant.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedAssignedParticipants.includes(
                                      participant.id
                                    )}
                                    onChange={() =>
                                      toggleAssignedParticipant(participant.id)
                                    }
                                  />
                                </td>

                                <td>
                                  {participant.firstName} {participant.lastName}
                                </td>

                                <td>{participant.email}</td>

                                <td>
                                  <button
                                    onClick={() =>
                                      deleteParticipant(participant.id)
                                    }
                                    className="small-delete-btn"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="empty-text">
                                No Participants Assigned
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="view-modal-footer">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>

                  <button
                    onClick={deleteSelectedParticipants}
                    disabled={selectedAssignedParticipants.length === 0}
                    className={
                      selectedAssignedParticipants.length === 0
                        ? "delete-selected-btn disabled"
                        : "delete-selected-btn"
                    }
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADD PARTICIPANTS MODAL */}
          {showParticipantModal && (
            <div className="modal-overlay">
              <div className="participant-modal">
                <div className="participant-modal-header">
                  <h2>Add Participants</h2>

                  <button
                    onClick={() => setShowParticipantModal(false)}
                    className="close-icon-btn"
                  >
                    ×
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search Participant"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="search-input"
                />

                <div className="participants-list">
                  {allParticipants
                    .filter((participant) =>
                      `${participant.firstName} ${participant.lastName}`
                        .toLowerCase()
                        .includes(searchText.toLowerCase())
                    )
                    .map((participant) => (
                      <label key={participant.id} className="participant-item">
                        <input
                          type="checkbox"
                          checked={selectedParticipantIds.includes(
                            participant.id
                          )}
                          onChange={() => toggleParticipant(participant.id)}
                        />

                        <span>
                          {participant.firstName} {participant.lastName}
                        </span>
                      </label>
                    ))}

                  {allParticipants.filter((participant) =>
                    `${participant.firstName} ${participant.lastName}`
                      .toLowerCase()
                      .includes(searchText.toLowerCase())
                  ).length === 0 && (
                    <div className="empty-text">No participants found</div>
                  )}
                </div>

                <div className="participant-modal-footer">
                  <button
                    onClick={() => setShowParticipantModal(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>

                  <button onClick={saveParticipants} className="save-btn">
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDIT ORGANIZATION MODAL */}
          {showEditModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h2>Edit Organization</h2>

                <input
                  className="input-style"
                  value={editOrganization.organizationName}
                  onChange={(e) =>
                    setEditOrganization({
                      ...editOrganization,
                      organizationName: e.target.value,
                    })
                  }
                />

                <input
                  className="input-style"
                  value={editOrganization.contactPerson}
                  onChange={(e) =>
                    setEditOrganization({
                      ...editOrganization,
                      contactPerson: e.target.value,
                    })
                  }
                />

                <input
                  className="input-style"
                  value={editOrganization.email}
                  onChange={(e) =>
                    setEditOrganization({
                      ...editOrganization,
                      email: e.target.value,
                    })
                  }
                />

                <div className="modal-footer">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="save-btn"
                    onClick={handleUpdateOrganization}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {successMessage && (
            <div className="success-toast">✅ {successMessage}</div>
          )}
        </div>
      </div>
    </>
  );
}
