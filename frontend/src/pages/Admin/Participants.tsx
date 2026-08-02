import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useState, useEffect, useMemo } from "react";
import {
  DeleteIconBtn,
  EditIconBtn,
} from "../../components/AdminActionIcons";
import {
  getEmailError,
  getPhoneError,
  isValidEmail,
  isValidPhone,
} from "../../utils/validation";
import "../../styles/Organization.css";
import { appConfirm } from "../../utils/appDialog";

type PageProps = {
  user?: any;
};

type ParticipantForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  password: string;
};

const emptyParticipantForm: ParticipantForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phoneNo: "",
  password: "",
};

export default function Participants({ user }: PageProps) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [formError, setFormError] = useState("");

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantForm, setParticipantForm] =
    useState<ParticipantForm>(emptyParticipantForm);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editParticipant, setEditParticipant] = useState<any>(null);

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const response = await fetch("/api/get-participants");
      const data = await response.json();

      if (data.success) {
        setParticipants(data.participants);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isParticipantFormValid = (form: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNo?: string;
    password?: string;
  }) =>
    Boolean(
      String(form.firstName || "").trim() &&
        String(form.lastName || "").trim() &&
        isValidEmail(String(form.email || "")) &&
        isValidPhone(String(form.phoneNo || "")) &&
        String(form.password || "").trim()
    );

  const validateParticipantFields = (form: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNo?: string;
    password?: string;
  }) => {
    if (!String(form.firstName || "").trim() || !String(form.lastName || "").trim()) {
      return "First name and last name are required. Middle name is optional.";
    }

    const emailError = getEmailError(String(form.email || ""));
    if (emailError) {
      return emailError;
    }

    const phoneError = getPhoneError(String(form.phoneNo || ""));
    if (phoneError) {
      return phoneError;
    }

    if (!String(form.password || "").trim()) {
      return "Password is required.";
    }

    return "";
  };

  const handleCreateParticipant = async () => {
    const payload = {
      firstName: participantForm.firstName.trim(),
      middleName: participantForm.middleName.trim(),
      lastName: participantForm.lastName.trim(),
      email: participantForm.email.trim(),
      phoneNo: participantForm.phoneNo.trim(),
      password: participantForm.password,
    };

    const error = validateParticipantFields(payload);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

      const response = await fetch("/api/create-participant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          createdBy: currentUser.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setParticipantForm(emptyParticipantForm);
        setFormError("");
        setShowParticipantModal(false);
        fetchParticipants();
      } else {
        setFormError(data.message || data.error || "Failed to create participant");
      }
    } catch (error) {
      console.error(error);
      setFormError("Failed to create participant");
    }
  };

  const handleEditParticipant = (participant: any) => {
    setEditParticipant(participant);
    setFormError("");
    setShowEditModal(true);
  };

  const handleUpdateParticipant = async () => {
    const payload = {
      id: editParticipant.id,
      firstName: String(editParticipant.firstName || "").trim(),
      middleName: String(editParticipant.middleName || "").trim(),
      lastName: String(editParticipant.lastName || "").trim(),
      email: String(editParticipant.email || "").trim(),
      phoneNo: String(editParticipant.phoneNo || "").trim(),
      password: String(editParticipant.password || ""),
    };

    const error = validateParticipantFields(payload);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      const response = await fetch("/api/update-participant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setFormError("");
        setShowEditModal(false);
        fetchParticipants();
      } else {
        setFormError(data.message || "Update failed");
      }
    } catch (error) {
      console.error(error);
      setFormError("Failed to update participant");
    }
  };

  const handleDeleteParticipant = async (p: any) => {
    if (!(await appConfirm(`Delete ${formatParticipantName(p)}?`, {
      title: "Delete participant",
      confirmLabel: "Delete",
      variant: "error",
    }))) return;

    await fetch("/api/delete-participant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: p.id,
      }),
    });

    fetchParticipants();
  };

  const formatParticipantName = (p: any) =>
    [p.firstName, p.middleName, p.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "-";

  const filteredParticipants = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) {
      return participants;
    }

    return participants.filter((p) => {
      const name = formatParticipantName(p).toLowerCase();
      const email = String(p.email || "").toLowerCase();
      const phone = String(p.phoneNo || "").toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [participants, tableSearch]);

  return (
    <>
      <div className="organization-layout">
        <Sidebar />

        <div className="organization-main">
          <Header user={user} />

          <div className="organization-content">
            <div className="org-page-header">
              <h1 className="org-page-title">Participants</h1>
              <button
                className="org-btn org-btn-primary"
                onClick={() => {
                  setFormError("");
                  setShowParticipantModal(true);
                }}
              >
                Create Participant
              </button>
            </div>

            <div className="org-card">
              <input
                type="text"
                placeholder="Search participants by name, email, or phone..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="org-input org-search-input"
              />

              <table className="org-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone No</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((p) => (
                      <tr key={p.id}>
                        <td>{formatParticipantName(p)}</td>
                        <td>{p.email}</td>
                        <td>{p.phoneNo || "-"}</td>
                        <td>
                          <div className="org-action-group">
                            <EditIconBtn
                              onClick={() => handleEditParticipant(p)}
                            />
                            <DeleteIconBtn
                              onClick={() => handleDeleteParticipant(p)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="org-empty-cell">
                        No participants found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showParticipantModal && (
        <div className="org-modal-overlay">
          <div className="org-modal org-modal-md">
            <h2 className="org-modal-title">Create Participant</h2>

            <label className="org-field-label">
              First Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              placeholder="First Name"
              value={participantForm.firstName}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  firstName: e.target.value,
                })
              }
            />

            <label className="org-field-label">Middle Name</label>
            <input
              className="org-input"
              placeholder="Middle Name (optional)"
              value={participantForm.middleName}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  middleName: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Last Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              placeholder="Last Name"
              value={participantForm.lastName}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  lastName: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Email <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              type="email"
              placeholder="Email"
              value={participantForm.email}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  email: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Phone Number <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              placeholder="Phone Number"
              value={participantForm.phoneNo}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  phoneNo: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Password <span className="org-required">*</span>
            </label>
            <input
              type="password"
              className="org-input"
              placeholder="Password"
              value={participantForm.password}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  password: e.target.value,
                })
              }
            />

            {formError ? (
              <div className="org-fetch-error" role="alert">
                {formError}
              </div>
            ) : null}

            <div className="org-modal-footer">
              <button
                className="org-btn org-btn-cancel"
                onClick={() => {
                  setShowParticipantModal(false);
                  setParticipantForm(emptyParticipantForm);
                  setFormError("");
                }}
              >
                Cancel
              </button>
              <button
                className="org-btn org-btn-primary"
                onClick={handleCreateParticipant}
                disabled={!isParticipantFormValid(participantForm)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editParticipant && (
        <div className="org-modal-overlay">
          <div className="org-modal org-modal-md">
            <h2 className="org-modal-title">Edit Participant</h2>

            <label className="org-field-label">
              First Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              value={editParticipant.firstName}
              onChange={(e) =>
                setEditParticipant({
                  ...editParticipant,
                  firstName: e.target.value,
                })
              }
            />

            <label className="org-field-label">Middle Name</label>
            <input
              className="org-input"
              placeholder="Middle Name (optional)"
              value={editParticipant.middleName || ""}
              onChange={(e) =>
                setEditParticipant({
                  ...editParticipant,
                  middleName: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Last Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              value={editParticipant.lastName}
              onChange={(e) =>
                setEditParticipant({
                  ...editParticipant,
                  lastName: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Email <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              type="email"
              value={editParticipant.email}
              onChange={(e) =>
                setEditParticipant({
                  ...editParticipant,
                  email: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Phone Number <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              value={editParticipant.phoneNo || ""}
              onChange={(e) =>
                setEditParticipant({
                  ...editParticipant,
                  phoneNo: e.target.value,
                })
              }
            />

            <label className="org-field-label">
              Password <span className="org-required">*</span>
            </label>
            <input
              type="password"
              className="org-input"
              value={editParticipant.password || ""}
              onChange={(e) =>
                setEditParticipant({
                  ...editParticipant,
                  password: e.target.value,
                })
              }
            />

            {formError ? (
              <div className="org-fetch-error" role="alert">
                {formError}
              </div>
            ) : null}

            <div className="org-modal-footer">
              <button
                className="org-btn org-btn-cancel"
                onClick={() => {
                  setShowEditModal(false);
                  setFormError("");
                }}
              >
                Cancel
              </button>
              <button
                className="org-btn org-btn-primary"
                onClick={handleUpdateParticipant}
                disabled={!isParticipantFormValid(editParticipant)}
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
