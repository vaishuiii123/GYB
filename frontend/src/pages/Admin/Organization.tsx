import { useState, useEffect, useMemo, useRef } from "react";
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
  const hasFetchedOrganizations = useRef(false);

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

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [orgForm, setOrgForm] = useState<OrganizationForm>(emptyOrgForm);
  const [editOrganization, setEditOrganization] = useState<any>({
    id: "",
    ...emptyOrgForm,
  });

  const emptyNewParticipant = {
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    username: "",
    phoneNo: "",
    password: "",
  };
  
  const [newParticipant, setNewParticipant] = useState(emptyNewParticipant);
  const [newParticipantError, setNewParticipantError] = useState("");
  const [savingNewParticipant, setSavingNewParticipant] = useState(false);

  useEffect(() => {
  if (hasFetchedOrganizations.current) {
    return;
  }

  hasFetchedOrganizations.current = true;
  fetchOrganizations();
}, []);
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
  const organizationName = orgForm.organizationName.trim();
  const contactPerson = orgForm.contactPerson.trim();
  const email = orgForm.email.trim();

  if (!organizationName) {
    appAlert("Organization name is required.");
    return;
  }

  if (!contactPerson) {
    appAlert("Contact person is required.");
    return;
  }

  if (!email) {
    appAlert("Email is required.");
    return;
  }

  if (!isValidEmail(email)) {
    appAlert("Enter a valid email address.");
    return;
  }

  try {
    const currentUser = getCurrentUser();

    const createdBy =
      currentUser?.email ||
      currentUser?.username ||
      "";

    const payload = {
      organizationName,
      contactPerson,
      email,
      createdBy,
    };

    const response = await fetch("/api/create-organization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          data.error ||
          "Failed to create organization."
      );
    }

    // Add the newly created organization directly to the table.
    // No second /api/get-organizations call is required.
    const newOrganization = {
      id: data.organizationId,
      organizationName,
      contactPerson,
      email,
      createdBy,
    };

    setOrganizations((previousOrganizations) => {
      const updatedOrganizations = [
        ...previousOrganizations,
        newOrganization,
      ];

      return updatedOrganizations.sort((a, b) =>
        String(a.organizationName || "").localeCompare(
          String(b.organizationName || "")
        )
      );
    });

    // Close modal
    setShowOrgModal(false);

    // Reset form
    setOrgForm(emptyOrgForm);

    appAlert("Organization created successfully.");
  } catch (error: any) {
    console.error(
      "Error creating organization:",
      error
    );

    appAlert(
      error?.message ||
        "Failed to create organization."
    );
  }
};

  const handleEdit = (org: any) => {
    setEditOrganization(org);
    setShowEditModal(true);
  };

  
  const handleUpdateOrganization = async () => {
  const payload = {
    ...editOrganization,
    organizationName: String(
      editOrganization.organizationName || ""
    ).trim(),
    contactPerson: String(
      editOrganization.contactPerson || ""
    ).trim(),
    email: String(
      editOrganization.email || ""
    ).trim(),
  };

  if (!payload.organizationName || !payload.contactPerson) {
    alert(
      "Organization Name, Contact Person, and Email are all required."
    );
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      // Update UI immediately.
      // Do NOT call fetchOrganizations().
      setOrganizations((previousOrganizations) =>
        previousOrganizations.map((organization) =>
          organization.id === payload.id
            ? {
                ...organization,
                organizationName: payload.organizationName,
                contactPerson: payload.contactPerson,
                email: payload.email,
              }
            : organization
        )
      );

      showToast("Organization updated successfully");
      setShowEditModal(false);
    } else {
      alert(data.message || data.error);
    }
  } catch (error) {
    console.error(error);
    alert("Failed to update organization");
  }
};

  const handleDelete = async (org: any) => {
  if (
    !(await appConfirm(`Delete ${org.organizationName}?`, {
      title: "Delete organization",
      confirmLabel: "Delete",
      variant: "error",
    }))
  ) {
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

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          data.error ||
          "Failed to delete organization"
      );
    }

    // Remove immediately from the screen
    setOrganizations((prev) =>
      prev.filter((item) => item.id !== org.id)
    );

    showToast("Organization deleted successfully");
  } catch (error) {
    console.error("Delete organization error:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Failed to delete organization"
    );
  }
};

  const handleDeleteFromModal = async () => {
  if (!selectedOrganization) {
    return;
  }

  if (
    !(await appConfirm(
      `Delete ${selectedOrganization.organizationName}?`,
      {
        title: "Delete organization",
        confirmLabel: "Delete",
        variant: "error",
      }
    ))
  ) {
    return;
  }

  const organizationId = selectedOrganization.id;

  try {
    const response = await fetch("/api/delete-organization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          data.error ||
          "Failed to delete organization"
      );
    }

    // Remove immediately from the table
    setOrganizations((prev) =>
      prev.filter((item) => item.id !== organizationId)
    );

    setShowViewModal(false);
    setSelectedOrganization(null);

    showToast("Organization deleted successfully");
  } catch (error) {
    console.error(
      "Delete organization error:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to delete organization"
    );
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
    setNewParticipant(emptyNewParticipant);
setNewParticipantError("");
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

  const handleCreateAndAssignParticipant = async () => {
    if (!selectedOrganization?.id) return;
  
    const payload = {
      firstName: newParticipant.firstName.trim(),
      middleName: newParticipant.middleName.trim(),
      lastName: newParticipant.lastName.trim(),
      email: newParticipant.email.trim(),
      username: newParticipant.email.trim(),
      phoneNo: newParticipant.phoneNo.trim(),
      password: newParticipant.password,
      createdBy: user?.email,
    };
  
    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phoneNo || !payload.password) {
      setNewParticipantError("First name, last name, email, phone, and password are required.");
      return;
    }
  
    try {
      setSavingNewParticipant(true);
      setNewParticipantError("");
  
      const createRes = await fetch("/api/create-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json();
  
      if (!createRes.ok || !createData.success) {
        setNewParticipantError(createData.message || createData.error || "Failed to create participant");
        return;
      }
  
      await fetch("/api/save-organization-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrganization.id,
          participantIds: [createData.participantId],
          createdBy: user?.email,
        }),
      });
  
      await loadAssignedParticipants(selectedOrganization.id);
      await loadParticipants();
      setNewParticipant(emptyNewParticipant);
      showToast("Participant created and assigned");
    } catch (error) {
      console.error(error);
      setNewParticipantError("Failed to create participant");
    } finally {
      setSavingNewParticipant(false);
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
                onClick={async () => {
                  setSelectedParticipantIds([]);
                  setSearchText("");
                  setAssignedParticipants([]);
                  await loadParticipants();
                  setShowOrgModal(true);
                }}
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
          <div className="org-modal org-modal-lg">
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
                  setSelectedParticipantIds([]);
                  setSearchText("");
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
                <label className="org-field-label">
                  First Name <span className="org-required">*</span>
                </label>
                <input
                  className="org-input"
                  placeholder="First Name"
                  value={newParticipant.firstName}
                  onChange={(e) =>
                    setNewParticipant({ ...newParticipant, firstName: e.target.value })
                  }
                />

                <label className="org-field-label">Middle Name</label>
                <input
                  className="org-input"
                  placeholder="Middle Name (optional)"
                  value={newParticipant.middleName}
                  onChange={(e) =>
                    setNewParticipant({ ...newParticipant, middleName: e.target.value })
                  }
                />

                <label className="org-field-label">
                  Last Name <span className="org-required">*</span>
                </label>
                <input
                  className="org-input"
                  placeholder="Last Name"
                  value={newParticipant.lastName}
                  onChange={(e) =>
                    setNewParticipant({ ...newParticipant, lastName: e.target.value })
                  }
                />

                <label className="org-field-label">
                  Email <span className="org-required">*</span>
                </label>
                <input
                  className="org-input"
                  type="email"
                  placeholder="Email"
                  value={newParticipant.email}
                  onChange={(e) =>
                    setNewParticipant({ ...newParticipant, email: e.target.value })
                  }
                />

                <label className="org-field-label">
                  Phone Number <span className="org-required">*</span>
                </label>
                <input
                  className="org-input"
                  placeholder="Phone Number"
                  value={newParticipant.phoneNo}
                  onChange={(e) =>
                    setNewParticipant({ ...newParticipant, phoneNo: e.target.value })
                  }
                />

                  <label className="org-field-label">
                    Password <span className="org-required">*</span>
                  </label>
                  <div className="org-password-wrap">
                    <input
                      className="org-input"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Password"
                      value={newParticipant.password}
                      onChange={(e) =>
                        setNewParticipant({ ...newParticipant, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="org-password-toggle"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                {newParticipantError ? (
                  <div className="org-fetch-error" role="alert">
                    {newParticipantError}
                  </div>
                ) : null}

                <button
                  className="org-btn org-btn-primary"
                  onClick={handleCreateAndAssignParticipant}
                  disabled={savingNewParticipant}
                >
                  {savingNewParticipant ? "Saving..." : "Create and add to organization"}
                </button>

<br></br>
<br></br>
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
