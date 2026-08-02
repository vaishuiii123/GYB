import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  DeleteIconBtn,
  EditIconBtn,
  ViewIconBtn,
} from "../../components/AdminActionIcons";
import { getEmailError, isValidEmail } from "../../utils/validation";
import "../../styles/Organization.css";
import { appAlert, appConfirm } from "../../utils/appDialog";

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
  const [fetchError, setFetchError] = useState("");

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

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
    fetchOrganizations();
  }, [user?.email, user?.role]);

  const getCurrentUser = () => {
    if (user?.email) return user;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const showToast = (message: string) => {
    appAlert(message);
  };

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setFetchError("");

      const res = await fetch("/api/get-organizations");
      const raw = await res.text();

      if (!raw.trim()) {
        throw new Error(
          "Empty response from /api/get-organizations. Make sure the API is running (func start in the api folder)."
        );
      }

      const data = JSON.parse(raw);

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }

      setOrganizations(data.organizations || []);
    } catch (err: any) {
      console.error(err);
      setOrganizations([]);
      setFetchError(err?.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const isOrgFormValid = (form: {
    organizationName?: string;
    contactPerson?: string;
    email?: string;
  }) =>
    Boolean(
      String(form.organizationName || "").trim() &&
        String(form.contactPerson || "").trim() &&
        isValidEmail(String(form.email || ""))
    );

  const handleCreateOrganization = async () => {
    const payload = {
      organizationName: orgForm.organizationName.trim(),
      contactPerson: orgForm.contactPerson.trim(),
      email: orgForm.email.trim(),
    };

    if (!payload.organizationName || !payload.contactPerson) {
      alert("Organization Name, Contact Person, and Email are all required.");
      return;
    }

    const emailError = getEmailError(payload.email);
    if (emailError) {
      alert(emailError);
      return;
    }

    try {
      const response = await fetch("/api/create-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
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
        alert(data.message || data.error || "Something went wrong");
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
    const payload = {
      ...editOrganization,
      organizationName: String(editOrganization.organizationName || "").trim(),
      contactPerson: String(editOrganization.contactPerson || "").trim(),
      email: String(editOrganization.email || "").trim(),
    };

    if (!payload.organizationName || !payload.contactPerson) {
      alert("Organization Name, Contact Person, and Email are all required.");
      return;
    }

    const emailError = getEmailError(payload.email);
    if (emailError) {
      alert(emailError);
      return;
    }

    try {
      const response = await fetch("/api/update-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Organization updated successfully");
        setShowEditModal(false);
        fetchOrganizations();
      } else {
        alert(data.message || data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update organization");
    }
  };

  const handleDelete = async (org: any) => {
    if (!(await appConfirm(`Delete ${org.organizationName}?`, {
      title: "Delete organization",
      confirmLabel: "Delete",
      variant: "error",
    }))) return;

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
    if (!(await appConfirm(`Delete ${selectedOrganization.organizationName}?`, {
      title: "Delete organization",
      confirmLabel: "Delete",
      variant: "error",
    }))) return;

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
        const addedCount = data.addedCount ?? selectedParticipantIds.length;
        showToast(
          addedCount > 0
            ? `${addedCount} participant(s) assigned successfully`
            : "Selected participants are already assigned"
        );
        await loadAssignedParticipants(selectedOrganization.id);
        setSelectedParticipantIds([]);
        setShowAddParticipants(false);
        setSearchText("");
      } else {
        alert(data.message || data.error || "Failed to assign participants");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to assign participants");
    }
  };

  const deleteParticipant = async (participantId: string) => {
    if (!(await appConfirm("Remove this participant from the organization?", {
      title: "Remove participant",
      confirmLabel: "Remove",
      variant: "warning",
    }))) return;

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
    const query = tableSearch.trim().toLowerCase();
    if (!query) {
      return organizations;
    }

    return organizations.filter((org) => {
      const name = String(org.organizationName || "").toLowerCase();
      const contact = String(org.contactPerson || "").toLowerCase();
      const email = String(org.email || "").toLowerCase();
      return (
        name.includes(query) ||
        contact.includes(query) ||
        email.includes(query)
      );
    });
  }, [organizations, tableSearch]);

  const assignedParticipantIds = useMemo(
    () => new Set(assignedParticipants.map((p) => p.id)),
    [assignedParticipants]
  );

  const availableParticipants = useMemo(() => {
    const query = searchText.toLowerCase();
    return allParticipants.filter(
      (p) =>
        !assignedParticipantIds.has(p.id) &&
        (`${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query))
    );
  }, [allParticipants, assignedParticipantIds, searchText]);

  return (
    <>
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
              {fetchError && (
                <div className="org-fetch-error" role="alert">
                  {fetchError}
                </div>
              )}

              <input
                type="text"
                placeholder="Search organizations..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="org-input org-search-input"
              />

              <table className="org-table">
                <thead>
                  <tr>
                    <th>Organization Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Actions</th>
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
                            <ViewIconBtn onClick={() => handleView(org)} />
                            <EditIconBtn onClick={() => handleEdit(org)} />
                            <DeleteIconBtn onClick={() => handleDelete(org)} />
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
      </div>

      {/* Create Modal */}
      {showOrgModal && (
        <div className="org-modal-overlay">
          <div className="org-modal org-modal-md">
            <h2 className="org-modal-title">Create Organization</h2>

            <label className="org-field-label">
              Organization Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              placeholder="Organization Name"
              value={orgForm.organizationName}
              required
              onChange={(e) =>
                setOrgForm({ ...orgForm, organizationName: e.target.value })
              }
            />

            <label className="org-field-label">
              Contact Person <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              placeholder="Contact Person"
              value={orgForm.contactPerson}
              required
              onChange={(e) =>
                setOrgForm({ ...orgForm, contactPerson: e.target.value })
              }
            />

            <label className="org-field-label">
              Email <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              type="email"
              placeholder="Email"
              value={orgForm.email}
              required
              onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
            />

            <div className="org-modal-footer">
              <button
                className="org-btn org-btn-cancel"
                onClick={() => {
                  setShowOrgModal(false);
                  setOrgForm(emptyOrgForm);
                }}
              >
                Cancel
              </button>
              <button
                className="org-btn org-btn-primary"
                onClick={handleCreateOrganization}
                disabled={!isOrgFormValid(orgForm)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View / Details Modal */}
      {showViewModal && selectedOrganization && (
        <div className="org-modal-overlay">
          <div className="org-modal org-modal-lg">
            <div className="org-modal-header">
              <h2 className="org-modal-title">Organization Details</h2>
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

            <div className="org-info-card">
              <div className="org-info-icon">🏢</div>
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
                    <p className="org-info-text">
                      {selectedOrganization.contactPerson}
                    </p>
                  </div>
                  <div>
                    <span className="org-info-label">Email</span>
                    <p className="org-info-text">{selectedOrganization.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="org-section-header">
              <h3>Assigned Participants ({assignedParticipants.length})</h3>
              <button
                className="org-btn org-btn-add-participant"
                onClick={() => setShowAddParticipants((prev) => !prev)}
              >
                + Add Participants
              </button>
            </div>

            <div className="org-table-wrap">
              <table className="org-table">
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
                          <DeleteIconBtn
                            onClick={() => deleteParticipant(participant.id)}
                          />
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

            {showAddParticipants && (
              <div className="org-add-panel">
                <h4 className="org-add-title">Add Participants</h4>
                <p className="org-add-subtitle">
                  Select one or more participants to assign to this organization.
                </p>

                <input
                  type="text"
                  placeholder="Search participants by name or email..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="org-input"
                />

                <div className="org-table-wrap">
                  <table className="org-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Participant Name</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableParticipants.length > 0 ? (
                        availableParticipants.map((participant) => {
                          const isSelected = selectedParticipantIds.includes(
                            participant.id
                          );

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

                <div className="org-add-footer">
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
                className="org-btn org-btn-danger-solid"
                onClick={handleDeleteFromModal}
              >
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="org-modal-overlay">
          <div className="org-modal org-modal-md">
            <h2 className="org-modal-title">Edit Organization</h2>

            <label className="org-field-label">
              Organization Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              value={editOrganization.organizationName}
              required
              onChange={(e) =>
                setEditOrganization({
                  ...editOrganization,
                  organizationName: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Contact Person <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              value={editOrganization.contactPerson}
              required
              onChange={(e) =>
                setEditOrganization({
                  ...editOrganization,
                  contactPerson: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Email <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              type="email"
              value={editOrganization.email}
              required
              onChange={(e) =>
                setEditOrganization({
                  ...editOrganization,
                  email: e.target.value,
                })
              }
            />

            <div className="org-modal-footer">
              <button
                className="org-btn org-btn-cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="org-btn org-btn-primary"
                onClick={handleUpdateOrganization}
                disabled={!isOrgFormValid(editOrganization)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
