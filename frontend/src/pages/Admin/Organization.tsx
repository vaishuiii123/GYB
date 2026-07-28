import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Organization.css";

type PageProps = {
  user?: any;
};

type OrganizationForm = {
  organizationName: string;
  contactPerson: string;
  email: string;
};

const emptyOrgForm: OrganizationForm = {
  organizationName: "",
  contactPerson: "",
  email: "",
};

export default function Organization({ user }: PageProps) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);

  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [assignedParticipants, setAssignedParticipants] = useState<any[]>([]);
  const [showAddParticipants, setShowAddParticipants] = useState(false);

  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  const [orgForm, setOrgForm] = useState<OrganizationForm>(emptyOrgForm);
  const [editOrganization, setEditOrganization] = useState<any>({
    id: "",
    ...emptyOrgForm,
  });

  useEffect(() => {
    if (user?.email) {
      fetchOrganizations();
    }
  }, [user]);

  const showToast = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/get-organizations?createdBy=${encodeURIComponent(user?.email || "")}`
      );
      const data = await res.json();
      if (data.success) setOrganizations(data.organizations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!orgForm.organizationName || !orgForm.contactPerson || !orgForm.email) {
      alert("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("/api/create-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orgForm,
          createdBy: user?.email || "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Organization created successfully");
        setOrgForm(emptyOrgForm);
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

  const handleEdit = (org: any) => {
    setEditOrganization(org);
    setShowEditModal(true);
  };

  const handleUpdateOrganization = async () => {
    try {
      const response = await fetch("/api/update-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editOrganization),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Organization updated successfully");
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

  const handleDelete = async (org: any) => {
    if (!window.confirm(`Delete ${org.organizationName}?`)) return;

    try {
      const response = await fetch("/api/delete-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Organization deleted successfully");
        fetchOrganizations();
      } else {
        alert(data.message || data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete organization");
    }
  };

  const handleDeleteFromModal = async () => {
    if (!selectedOrganization) return;
    if (!window.confirm(`Delete ${selectedOrganization.organizationName}?`)) return;

    try {
      const response = await fetch("/api/delete-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedOrganization.id }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Organization deleted successfully");
        setShowViewModal(false);
        setSelectedOrganization(null);
        fetchOrganizations();
      } else {
        alert(data.message || data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete organization");
    }
  };

  const handleView = async (org: any) => {
    setSelectedOrganization(org);
    setShowAddParticipants(false);
    setSelectedParticipantIds([]);
    setSearchText("");
    await loadParticipants();
    await loadAssignedParticipants(org.id);
    setShowViewModal(true);
  };

  const loadParticipants = async () => {
    try {
      const response = await fetch("/api/get-participants");
      const data = await response.json();
      if (data.success) setAllParticipants(data.participants);
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
      if (data.success) setAssignedParticipants(data.participants);
    } catch (error) {
      console.error(error);
    }
  };

  const saveParticipants = async () => {
    if (selectedParticipantIds.length === 0) return;

    try {
      const response = await fetch("/api/save-organization-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrganization?.id,
          participantIds: selectedParticipantIds,
          createdBy: user?.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Participants assigned successfully");
        await loadAssignedParticipants(selectedOrganization.id);
        setSelectedParticipantIds([]);
        setShowAddParticipants(false);
        setSearchText("");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to assign participants");
    }
  };

  const deleteParticipant = async (participantId: string) => {
    if (!window.confirm("Remove this participant from the organization?")) return;

    try {
      const response = await fetch("/api/delete-organization-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrganization.id,
          participantIds: [participantId],
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadAssignedParticipants(selectedOrganization.id);
        showToast("Participant removed successfully");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to remove participant");
    }
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    );
  };

  const filteredOrganizations = useMemo(() => {
    const query = tableSearch.toLowerCase();
    return organizations.filter(
      (org) =>
        org.organizationName?.toLowerCase().includes(query) ||
        org.contactPerson?.toLowerCase().includes(query) ||
        org.email?.toLowerCase().includes(query)
    );
  }, [organizations, tableSearch]);

  const filteredParticipants = useMemo(() => {
    const query = searchText.toLowerCase();
    return allParticipants.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query)
    );
  }, [allParticipants, searchText]);

  return (
    <div className="organization-layout">
      <Sidebar />

      <div className="organization-main">
        <Header user={user} />

        <div className="organization-content">
          <div className="org-page-header">
            <h1 className="org-page-title">Organization</h1>

            <button
              onClick={() => setShowOrgModal(true)}
              className="org-btn org-btn-primary"
            >
              Create Organization
            </button>
          </div>

          <div className="org-card">
            <div className="org-card-toolbar">
              <input
                type="text"
                placeholder="Search organizations..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="org-search-input"
              />
            </div>

            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Organization Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th className="org-actions-col">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="org-empty-cell">
                        Loading organizations...
                      </td>
                    </tr>
                  ) : filteredOrganizations.length > 0 ? (
                    filteredOrganizations.map((org) => (
                      <tr key={org.id}>
                        <td>{org.organizationName}</td>
                        <td>{org.contactPerson}</td>
                        <td>{org.email}</td>
                        <td>
                          <div className="org-action-group">
                            <button
                              className="org-btn org-btn-view"
                              onClick={() => handleView(org)}
                            >
                              View
                            </button>
                            <button
                              className="org-btn org-btn-edit"
                              onClick={() => handleEdit(org)}
                            >
                              Edit
                            </button>
                            <button
                              className="org-btn org-btn-delete"
                              onClick={() => handleDelete(org)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="org-empty-cell">
                        No organizations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CREATE MODAL */}
        {showOrgModal && (
          <div className="org-modal-overlay">
            <div className="org-modal org-modal-md">
              <div className="org-modal-header">
                <h2>Create Organization</h2>
                <button className="org-close-btn" onClick={() => setShowOrgModal(false)}>
                  ×
                </button>
              </div>

              <div className="org-form">
                <label>
                  Organization Name
                  <input
                    className="org-input"
                    placeholder="Organization Name"
                    value={orgForm.organizationName}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, organizationName: e.target.value })
                    }
                  />
                </label>

                <label>
                  Contact Person
                  <input
                    className="org-input"
                    placeholder="Contact Person"
                    value={orgForm.contactPerson}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, contactPerson: e.target.value })
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    className="org-input"
                    type="email"
                    placeholder="Email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                  />
                </label>
              </div>

              <div className="org-modal-footer">
                <button className="org-btn org-btn-outline" onClick={() => setShowOrgModal(false)}>
                  Cancel
                </button>
                <button className="org-btn org-btn-primary" onClick={handleCreateOrganization}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW / DETAILS MODAL */}
        {showViewModal && selectedOrganization && (
          <div className="org-modal-overlay">
            <div className="org-modal org-modal-lg">
              <div className="org-modal-header">
                <h2>Organization Details</h2>
                <button
                  className="org-close-btn"
                  onClick={() => {
                    setShowViewModal(false);
                    setShowAddParticipants(false);
                  }}
                >
                  ×
                </button>
              </div>

              {/* Basic Information */}
              <div className="org-info-card">
                <div className="org-info-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 21H21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5 21V7L12 3L19 7V21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 21V13H15V21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="org-info-content">
                  <div className="org-info-row">
                    <span className="org-info-label">Organization Name</span>
                    <strong className="org-info-value">
                      {selectedOrganization.organizationName}
                    </strong>
                  </div>

                  <div className="org-info-grid">
                    <div>
                      <span className="org-info-label">Contact Person</span>
                      <p className="org-info-text">{selectedOrganization.contactPerson}</p>
                    </div>
                    <div>
                      <span className="org-info-label">Email</span>
                      <p className="org-info-text">{selectedOrganization.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Participants */}
              <div className="org-section-header">
                <h3>Assigned Participants ({assignedParticipants.length})</h3>
                <button
                  className="org-btn org-btn-add-participant"
                  onClick={() => setShowAddParticipants((prev) => !prev)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M20 8V14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M23 11H17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Add Participants
                </button>
              </div>

              <div className="org-table-wrap org-table-wrap-bordered">
                <table className="org-table org-table-compact">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Participant Name</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedParticipants.length > 0 ? (
                      assignedParticipants.map((participant, index) => (
                        <tr key={participant.id}>
                          <td>{index + 1}</td>
                          <td>
                            {participant.firstName} {participant.lastName}
                          </td>
                          <td>{participant.email}</td>
                          <td>
                            <button
                              className="org-icon-delete-btn"
                              onClick={() => deleteParticipant(participant.id)}
                              title="Remove participant"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M3 6H21"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                <path
                                  d="M19 6L18.2 20.1C18.0895 21.7127 16.7369 23 15.12 23H8.88C7.26311 23 5.91052 21.7127 5.8 20.1L5 6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="org-empty-cell">
                          No Participants Assigned
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Participants Section */}
              {showAddParticipants && (
                <div className="org-add-participants-panel">
                  <div className="org-add-participants-header">
                    <div className="org-add-participants-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                        <path
                          d="M20 8V14"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M23 11H17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      <h4>Add Participants</h4>
                    </div>
                    <p>Select one or more participants to assign to this organization.</p>
                  </div>

                  <div className="org-search-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M20 20L17 17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search participants by name or email..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>

                  <div className="org-table-wrap org-table-wrap-bordered">
                    <table className="org-table org-table-compact">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Participant Name</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredParticipants.length > 0 ? (
                          filteredParticipants.map((participant) => {
                            const isSelected = selectedParticipantIds.includes(participant.id);
                            return (
                              <tr
                                key={participant.id}
                                className={isSelected ? "org-row-selected" : ""}
                                onClick={() => toggleParticipant(participant.id)}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleParticipant(participant.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td>
                                  {participant.firstName} {participant.lastName}
                                </td>
                                <td>{participant.email}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="org-empty-cell">
                              No participants found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="org-add-selected-footer">
                    <span>{selectedParticipantIds.length} selected</span>
                    <button
                      className="org-btn org-btn-primary"
                      onClick={saveParticipants}
                      disabled={selectedParticipantIds.length === 0}
                    >
                      Add Selected
                    </button>
                  </div>
                </div>
              )}

              <div className="org-modal-footer org-modal-footer-split">
                <button
                  className="org-btn org-btn-outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setShowAddParticipants(false);
                  }}
                >
                  Close
                </button>

                <button className="org-btn org-btn-danger-solid" onClick={handleDeleteFromModal}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6H21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M19 6L18.2 20.1C18.0895 21.7127 16.7369 23 15.12 23H8.88C7.26311 23 5.91052 21.7127 5.8 20.1L5 6"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && (
          <div className="org-modal-overlay">
            <div className="org-modal org-modal-md">
              <div className="org-modal-header">
                <h2>Edit Organization</h2>
                <button className="org-close-btn" onClick={() => setShowEditModal(false)}>
                  ×
                </button>
              </div>

              <div className="org-form">
                <label>
                  Organization Name
                  <input
                    className="org-input"
                    value={editOrganization.organizationName}
                    onChange={(e) =>
                      setEditOrganization({
                        ...editOrganization,
                        organizationName: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Contact Person
                  <input
                    className="org-input"
                    value={editOrganization.contactPerson}
                    onChange={(e) =>
                      setEditOrganization({
                        ...editOrganization,
                        contactPerson: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    className="org-input"
                    type="email"
                    value={editOrganization.email}
                    onChange={(e) =>
                      setEditOrganization({
                        ...editOrganization,
                        email: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="org-modal-footer">
                <button className="org-btn org-btn-outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className="org-btn org-btn-primary" onClick={handleUpdateOrganization}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {successMessage && <div className="org-toast">{successMessage}</div>}
      </div>
    </div>
  );
}
