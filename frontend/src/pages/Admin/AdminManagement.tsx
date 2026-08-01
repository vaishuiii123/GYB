import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { DeleteIconBtn } from "../../components/AdminActionIcons";
import { getEmailError, isValidEmail } from "../../utils/validation";
import "../../styles/Organization.css";

type PageProps = {
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
};

type AdminUser = {
  id: string;
  partitionKey: string;
  name: string;
  email: string;
  role: string;
  createdDate?: string;
};

type AdminForm = {
  name: string;
  email: string;
  role: "Admin" | "Organizer";
};

const emptyForm: AdminForm = {
  name: "",
  email: "",
  role: "Admin",
};

export default function AdminManagement({ user }: PageProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AdminForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const currentUser = (() => {
    if (user?.email) return user;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const currentEmail = String(currentUser?.email || "")
    .trim()
    .toLowerCase();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setFetchError("");

      const response = await fetch("/api/get-admins");
      const data = await response.json();

      if (!data.success) {
        setFetchError(data.message || "Unable to load admins.");
        setAdmins([]);
        return;
      }

      setAdmins(data.admins || []);
    } catch (error) {
      console.error(error);
      setFetchError("Unable to load admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) {
      return admins;
    }

    return admins.filter((admin) =>
      [admin.name, admin.email, admin.role]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [admins, tableSearch]);

  const showToast = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const handleCreate = async () => {
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setFormError("Name is required.");
      return;
    }

    const emailError = getEmailError(email);
    if (emailError) {
      setFormError(emailError);
      return;
    }

    if (!isValidEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const response = await fetch("/api/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role: form.role,
          createdBy: currentUser?.email || "",
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setFormError(data.message || "Unable to add admin.");
        return;
      }

      setShowModal(false);
      setForm(emptyForm);
      showToast("Admin added successfully.");
      await fetchAdmins();
    } catch (error) {
      console.error(error);
      setFormError("Unable to add admin.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminUser) => {
    if (currentEmail && admin.email.toLowerCase() === currentEmail) {
      showToast("You cannot remove your own admin access.");
      return;
    }

    if (
      !window.confirm(
        `Remove admin access for ${admin.name || admin.email}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/delete-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          partitionKey: admin.partitionKey || "User",
          requesterEmail: currentUser?.email || "",
        }),
      });
      const data = await response.json();

      if (!data.success) {
        showToast(data.message || "Unable to remove admin.");
        return;
      }

      showToast("Admin removed successfully.");
      await fetchAdmins();
    } catch (error) {
      console.error(error);
      showToast("Unable to remove admin.");
    }
  };

  return (
    <div className="organization-layout">
      <Sidebar />
      <div className="organization-main">
        <Header />
        <div className="organization-content">
          <div className="org-page-header">
            <div>
              <h1 className="org-page-title">Admin Management</h1>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                Add people who can sign in to the admin portal. All admins share
                the same view of organizations, workshops, questions, and
                responses.
              </p>
            </div>
            <button
              type="button"
              className="org-btn org-btn-primary"
              onClick={openCreateModal}
            >
              + Add Admin
            </button>
          </div>

          {successMessage ? (
            <div className="org-fetch-error" style={{ background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0" }}>
              {successMessage}
            </div>
          ) : null}

          <div className="org-card">
            <input
              className="org-input org-search-input"
              type="text"
              placeholder="Search by name, email, or role"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
            />

            {fetchError ? (
              <div className="org-fetch-error">{fetchError}</div>
            ) : null}

            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ width: 90 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="org-empty-cell" colSpan={4}>
                        Loading admins...
                      </td>
                    </tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr>
                      <td className="org-empty-cell" colSpan={4}>
                        No admins found.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((admin) => {
                      const isSelf =
                        Boolean(currentEmail) &&
                        admin.email.toLowerCase() === currentEmail;

                      return (
                        <tr key={`${admin.partitionKey}-${admin.id}`}>
                          <td>
                            {admin.name || "—"}
                            {isSelf ? (
                              <span
                                style={{
                                  marginLeft: 8,
                                  color: "#9b304a",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                (You)
                              </span>
                            ) : null}
                          </td>
                          <td>{admin.email}</td>
                          <td>{admin.role}</td>
                          <td>
                            <div className="org-action-group">
                              <DeleteIconBtn
                                onClick={() => handleDelete(admin)}
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? "You cannot remove yourself"
                                    : "Remove admin"
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal ? (
        <div className="org-modal-overlay">
          <div className="org-modal org-modal-md">
            <h2 className="org-modal-title">Add Admin</h2>

            <label className="org-field-label">
              Name <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
            />

            <label className="org-field-label">
              Email <span className="org-required">*</span>
            </label>
            <input
              className="org-input"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="name@company.com"
            />

            <label className="org-field-label">Role</label>
            <select
              className="org-input"
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value as AdminForm["role"],
                }))
              }
            >
              <option value="Admin">Admin</option>
              <option value="Organizer">Organizer</option>
            </select>

            {formError ? (
              <div className="org-fetch-error" role="alert">
                {formError}
              </div>
            ) : null}

            <div className="org-modal-footer">
              <button
                type="button"
                className="org-btn org-btn-cancel"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="org-btn org-btn-primary"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Admin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
