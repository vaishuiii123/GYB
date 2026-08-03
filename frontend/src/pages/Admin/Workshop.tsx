import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import {
  DeleteIconBtn,
  EditIconBtn,
  ViewIconBtn,
} from "../../components/AdminActionIcons";
import styles from "../../styles/Workshop.module.css";
import { appConfirm } from "../../utils/appDialog";
import {
  getWorkshopLifecycleStatus,
  parseWorkshopStatusParam,
  workshopStatusLabel,
} from "../../utils/workshopLifecycle";

type PageProps = {
  user?: any;
};

export default function Workshop({ user }: PageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = parseWorkshopStatusParam(searchParams.get("status"));

  const [templates, setTemplates] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [deletingWorkshopId, setDeletingWorkshopId] = useState("");
  const [showOrgViewModal, setShowOrgViewModal] = useState(false);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState<any>(null);
  const [viewWorkshopDetails, setViewWorkshopDetails] = useState<any>(null);
  const [viewParticipants, setViewParticipants] = useState<any[]>([]);
  const [loadingOrgView, setLoadingOrgView] = useState(false);

  const [formData, setFormData] = useState({
    workshopName: "",
    preOdStartDate: "",
    startDate: "",
    endDate: "",
    templateId: "",
    organizationId: "",
  });
  const [editingWorkshopId, setEditingWorkshopId] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const emptyForm = {
    workshopName: "",
    preOdStartDate: "",
    startDate: "",
    endDate: "",
    templateId: "",
    organizationId: "",
  };

  const toDateTimeLocal = (value?: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 16);
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  /** Admin can edit workshop details until the workshop start time. */
  const canEditWorkshop = (workshop: any) => {
    if (!workshop?.startDate) {
      return true;
    }

    const startMs = new Date(workshop.startDate).getTime();
    if (Number.isNaN(startMs)) {
      return true;
    }

    return Date.now() < startMs;
  };

  const formatDateTime = (value?: string) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setParticipants([]);
    setEditingWorkshopId("");
    setModalMode("create");
  };

  useEffect(() => {
    loadTemplates();
    loadOrganizations();
    loadWorkshops();
  }, [user?.email, user?.role]);

  const filteredWorkshops = useMemo(() => {
    if (!statusFilter) {
      return workshops;
    }
    return workshops.filter(
      (workshop) => getWorkshopLifecycleStatus(workshop) === statusFilter
    );
  }, [workshops, statusFilter]);

  const listTitle = statusFilter
    ? workshopStatusLabel(statusFilter)
    : "Scheduled Workshops";

  const getCurrentUser = () => {
    if (user?.email) return user;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  useEffect(() => {
    if (formData.organizationId) {
      loadParticipants(formData.organizationId).then(setParticipants);
    } else {
      setParticipants([]);
    }
  }, [formData.organizationId]);



  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/get-templates");
      const data = await response.json();

      console.log("Templates:", data);

      if (data.success) {
        setTemplates(data.templates || []);
       
      }
    } catch (error) {
      console.error("Error loading templates", error);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await fetch("/api/get-organizations");
      const data = await response.json();

      console.log("Organizations:", data);

      if (data.success) {
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Error loading organizations", error);
    }
  };

  const loadParticipants = async (organizationId: string) => {
    try {
      const response = await fetch(
        `/api/get-participants-by-organization?organizationId=${organizationId}`
      );

      const data = await response.json();

      if (data.success) {
        return data.participants || [];
      }
    } catch (error) {
      console.error(error);
    }

    return [];
  };

  const handleOrganizationSelect = async (organizationId: string) => {
    setFormData((prev) => ({
      ...prev,
      organizationId,
    }));

    if (organizationId) {
      const orgParticipants = await loadParticipants(organizationId);
      setParticipants(orgParticipants);
    } else {
      setParticipants([]);
    }
  };

  const handleViewOrganization = async (org: any, workshop?: any) => {
    try {
      setLoadingOrgView(true);
      setSelectedOrgDetails(org);
      setViewWorkshopDetails(workshop || null);
      const orgParticipants = await loadParticipants(org.id);
      setViewParticipants(orgParticipants);
      setShowOrgViewModal(true);
    } catch (error) {
      console.error(error);
      alert("Failed to load organization participants");
    } finally {
      setLoadingOrgView(false);
    }
  };

  const handleViewWorkshopOrganization = async (workshop: any) => {
    const org =
      organizations.find((item) => item.id === workshop.organizationId) || {
        id: workshop.organizationId,
        organizationName: workshop.organizationName,
        contactPerson: "-",
        email: "-",
      };

    await handleViewOrganization(org, workshop);
  };


  const openCreatePopup = () => {
    resetForm();
    setModalMode("create");
    setShowCreatePopup(true);
  };

  const openEditPopup = async (workshop: any) => {
    if (!canEditWorkshop(workshop)) {
      alert("This workshop has started and can no longer be edited.");
      return;
    }

    setModalMode("edit");
    setEditingWorkshopId(workshop.id);
    setFormData({
      workshopName: workshop.workshopName || "",
      preOdStartDate: toDateTimeLocal(workshop.preOdStartDate),
      startDate: toDateTimeLocal(workshop.startDate),
      endDate: toDateTimeLocal(workshop.endDate),
      templateId: workshop.templateId || "",
      organizationId: workshop.organizationId || "",
    });

    if (workshop.organizationId) {
      const orgParticipants = await loadParticipants(workshop.organizationId);
      setParticipants(orgParticipants);
    } else {
      setParticipants([]);
    }

    setShowCreatePopup(true);
  };

  const handleSaveWorkshop = async () => {
    if (
      !formData.workshopName ||
      !formData.preOdStartDate ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.templateId ||
      !formData.organizationId
    ) {
      alert("Please fill all required fields");
      return;
    }

    const preOdStartMs = new Date(formData.preOdStartDate).getTime();
    const startMs = new Date(formData.startDate).getTime();
    const endMs = new Date(formData.endDate).getTime();

    if (
      Number.isNaN(preOdStartMs) ||
      Number.isNaN(startMs) ||
      Number.isNaN(endMs) ||
      !(preOdStartMs < startMs && startMs < endMs)
    ) {
      alert(
        "Dates must be in order: Pre OD Start < Workshop Start < Workshop End."
      );
      return;
    }

    try {
      setLoading(true);

      const selectedTemplate = templates.find(
        (t) => t.id === formData.templateId
      );

      const selectedOrganization = organizations.find(
        (o) => o.id === formData.organizationId
      );

      const payload = {
        workshopName: formData.workshopName,
        preOdStartDate: new Date(formData.preOdStartDate).toISOString(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.templateName,
        organizationId: selectedOrganization?.id,
        organizationName: selectedOrganization?.organizationName,
        participantCount: participants.length,
        createdBy: getCurrentUser().email || "",
      };

      const response = await fetch(
        modalMode === "edit" ? "/api/update-workshop" : "/api/create-workshop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            modalMode === "edit"
              ? { ...payload, workshopId: editingWorkshopId }
              : payload
          ),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(
          modalMode === "edit"
            ? "Workshop updated successfully"
            : "Workshop created successfully"
        );
        resetForm();
        await loadWorkshops();
        setShowCreatePopup(false);
      } else {
        alert(data.message || data.error || "Failed to save workshop");
      }
    } catch (error) {
      console.error("Error saving workshop:", error);
      alert("Failed to save workshop");
    } finally {
      setLoading(false);
    }
  };
  const loadWorkshops = async () => {
  try {
    const response = await fetch("/api/get-workshops");
    const data = await response.json();

    if (data.success) {
      setWorkshops(data.workshops || []);
    } else {
      console.error(data.error || "Failed to load workshops");
      setWorkshops([]);
    }
  } catch (error) {
    console.error("Error loading workshops", error);
    setWorkshops([]);
  }
};

  const handleDeleteWorkshop = async (workshop: any) => {
    const confirmed = await appConfirm(
      `Delete workshop "${workshop.workshopName}"?`,
      {
        title: "Delete workshop",
        confirmLabel: "Delete",
        variant: "error",
      }
    );

    if (!confirmed) return;

    try {
      setDeletingWorkshopId(workshop.id);

      const response = await fetch("/api/delete-workshop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workshopId: workshop.id }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || "Workshop deleted successfully");
        await loadWorkshops();
      } else {
        alert(data.message || data.error || "Failed to delete workshop");
      }
    } catch (error) {
      console.error("Error deleting workshop:", error);
      alert("Failed to delete workshop");
    } finally {
      setDeletingWorkshopId("");
    }
  };

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.content}>
        <Header user={user} />

        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>
                {statusFilter ? workshopStatusLabel(statusFilter) : "Workshops"}
              </h1>
              {statusFilter ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  style={{ marginTop: 10 }}
                  onClick={() => navigate("/dashboard")}
                >
                  ← Back to Dashboard
                </button>
              ) : null}
            </div>

            {!statusFilter ? (
              <button
                className={styles.primaryButton}
                onClick={openCreatePopup}
              >
                + Create Workshop
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate("/workshop")}
              >
                All Workshops
              </button>
            )}
          </div>

          {showCreatePopup && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                    {modalMode === "edit" ? "Edit Workshop" : "Create Workshop"}
                  </h3>
                </div>

                <div className={styles.formGridTwo}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Workshop Name *
                    </label>

                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Enter workshop name"
                      value={formData.workshopName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          workshopName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className={styles.formGridThree}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Pre OD Start Date-Time *
                    </label>

                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={formData.preOdStartDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preOdStartDate: e.target.value,
                        })
                      }
                    />
                    <p className={styles.fieldHint}>
                      Participants can fill Pre OD from this time.
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Workshop Start Date-Time *
                    </label>

                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          startDate: e.target.value,
                        })
                      }
                    />
                    <p className={styles.fieldHint}>
                      Pre OD closes and admin editing locks at this time.
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Workshop End Date-Time *
                    </label>

                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          endDate: e.target.value,
                        })
                      }
                    />
                    <p className={styles.fieldHint}>
                      Participant responses lock after this time.
                    </p>
                  </div>
                </div>

                <div className={styles.formGridTwo}>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Select OD Template *
                    </label>

                    <select
                      className={styles.select}
                      value={formData.templateId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          templateId: e.target.value,
                        })
                      }
                    >
                      <option value="">Select OD Template</option>

                      {templates.map((template: any) => (
                        <option
                          key={template.id}
                          value={template.id}
                        >
                          {template.templateName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGridTwo}>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Select Organization *
                    </label>

                    <select
                      className={styles.select}
                      value={formData.organizationId}
                      onChange={(e) =>
                        handleOrganizationSelect(e.target.value)
                      }
                    >
                      <option value="">
                        Select Organization
                      </option>

                      {organizations.map((org: any) => (
                        <option
                          key={org.id}
                          value={org.id}
                        >
                          {org.organizationName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.organizationId && (
                  <div className={styles.modalParticipants}>
                    {formData.templateId && (
                      <p className={styles.selectedTemplateName}>
                        OD Template:{" "}
                        <strong>
                          {templates.find((t) => t.id === formData.templateId)
                            ?.templateName || "-"}
                        </strong>
                      </p>
                    )}

                    <h4 className={styles.modalParticipantsTitle}>
                      Participants in selected organization ({participants.length})
                    </h4>

                    {participants.length > 0 ? (
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.th}>Sr No</th>
                            <th className={styles.th}>Name</th>
                            <th className={styles.th}>Email</th>
                            <th className={styles.th}>Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((p, index) => (
                            <tr key={p.id}>
                              <td className={styles.td}>{index + 1}</td>
                              <td className={styles.td}>
                                {p.firstName} {p.lastName}
                              </td>
                              <td className={styles.td}>{p.email}</td>
                              <td className={styles.td}>{p.phoneNo || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className={styles.emptyText}>
                        No participants assigned to this organization yet.
                      </p>
                    )}
                  </div>
                )}

                <div className={styles.buttonRow}>
                  <button
                    className={styles.primaryButton}
                    onClick={handleSaveWorkshop}
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : modalMode === "edit"
                        ? "Save Changes"
                        : "Create"}
                  </button>

                  <button
                    className={styles.secondaryButton}
                    onClick={() => {
                      resetForm();
                      setShowCreatePopup(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          )}

          <div className={styles.tableCard}>
            <h3 className={styles.tableTitle}>{listTitle}</h3>

  <table className={styles.table}>
    <thead>
      <tr>
        <th className={styles.th}>Sr No</th>
        <th className={styles.th}>Workshop Name</th>
        <th className={styles.th}>OD Template</th>
        <th className={styles.th}>Pre OD Questions</th>
        <th className={styles.th}>Organization</th>
        <th className={styles.th}>Pre OD Start</th>
        <th className={styles.th}>Workshop Start</th>
        <th className={styles.th}>Workshop End</th>
        <th className={styles.th}>Participants</th>
        <th className={styles.th}>Actions</th>
      </tr>
    </thead>

    <tbody>
      {filteredWorkshops.length > 0 ? (
        filteredWorkshops.map((workshop: any, index: number) => (
          <tr key={workshop.id}>
            <td className={styles.td}>{index + 1}</td>
            <td className={styles.td}>{workshop.workshopName}</td>
            <td className={styles.td}>{workshop.templateName}</td>
            <td className={styles.td}>
              {workshop.preOdQuestionCount
                ? `${workshop.preOdQuestionCount} questions`
                : "-"}
            </td>
            <td className={styles.td}>{workshop.organizationName}</td>
            <td className={styles.td}>
              {formatDateTime(workshop.preOdStartDate)}
            </td>
            <td className={styles.td}>
              {formatDateTime(workshop.startDate)}
            </td>
            <td className={styles.td}>
              {formatDateTime(workshop.endDate)}
            </td>
            <td className={styles.td}>{workshop.participantCount}</td>
            <td className={styles.td}>
              <div className={styles.actionGroup}>
                <ViewIconBtn
                  onClick={() => handleViewWorkshopOrganization(workshop)}
                  disabled={loadingOrgView}
                />
                {canEditWorkshop(workshop) ? (
                  <EditIconBtn
                    onClick={() => openEditPopup(workshop)}
                    title="Edit workshop (available before workshop start)"
                  />
                ) : (
                  <span
                    className={styles.fieldHint}
                    title="Editing locks when the workshop starts"
                  >
                    Locked
                  </span>
                )}
                <DeleteIconBtn
                  onClick={() => handleDeleteWorkshop(workshop)}
                  disabled={deletingWorkshopId === workshop.id}
                  title={
                    deletingWorkshopId === workshop.id
                      ? "Deleting..."
                      : "Delete"
                  }
                />
              </div>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td className={styles.td} colSpan={10}>
            {statusFilter === "upcoming"
              ? "No upcoming workshops."
              : statusFilter === "in-progress"
                ? "No workshops in progress."
                : statusFilter === "completed"
                  ? "No completed workshops."
                  : "No workshops scheduled."}
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

          {showOrgViewModal && selectedOrgDetails && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>
                    {viewWorkshopDetails ? "Workshop Details" : "Organization Details"}
                  </h3>
                  <button
                    className={styles.closeButton}
                    onClick={() => {
                      setShowOrgViewModal(false);
                      setSelectedOrgDetails(null);
                      setViewWorkshopDetails(null);
                      setViewParticipants([]);
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className={styles.orgInfoGrid}>
                  {viewWorkshopDetails && (
                    <>
                      <div>
                        <span className={styles.infoLabel}>Workshop Name</span>
                        <p className={styles.infoValue}>
                          {viewWorkshopDetails.workshopName}
                        </p>
                      </div>
                      <div>
                        <span className={styles.infoLabel}>Template</span>
                        <p className={styles.infoValue}>
                          {viewWorkshopDetails.templateName || "-"}
                        </p>
                      </div>
                      <div>
                        <span className={styles.infoLabel}>Pre OD Start</span>
                        <p className={styles.infoValue}>
                          {formatDateTime(viewWorkshopDetails.preOdStartDate)}
                        </p>
                      </div>
                      <div>
                        <span className={styles.infoLabel}>Workshop Start</span>
                        <p className={styles.infoValue}>
                          {formatDateTime(viewWorkshopDetails.startDate)}
                        </p>
                      </div>
                      <div>
                        <span className={styles.infoLabel}>Workshop End</span>
                        <p className={styles.infoValue}>
                          {formatDateTime(viewWorkshopDetails.endDate)}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className={styles.infoLabel}>Organization</span>
                    <p className={styles.infoValue}>
                      {selectedOrgDetails.organizationName}
                    </p>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>Contact Person</span>
                    <p className={styles.infoValue}>
                      {selectedOrgDetails.contactPerson || "-"}
                    </p>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>Email</span>
                    <p className={styles.infoValue}>
                      {selectedOrgDetails.email || "-"}
                    </p>
                  </div>
                  <div>
                    <span className={styles.infoLabel}>Total Participants</span>
                    <p className={styles.infoValue}>{viewParticipants.length}</p>
                  </div>
                </div>

                <h4 className={styles.modalParticipantsTitle}>
                  Assigned Participants
                </h4>

                {viewParticipants.length > 0 ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Sr No</th>
                        <th className={styles.th}>Name</th>
                        <th className={styles.th}>Email</th>
                        <th className={styles.th}>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewParticipants.map((participant, index) => (
                        <tr key={participant.id}>
                          <td className={styles.td}>{index + 1}</td>
                          <td className={styles.td}>
                            {participant.firstName} {participant.lastName}
                          </td>
                          <td className={styles.td}>{participant.email}</td>
                          <td className={styles.td}>
                            {participant.phoneNo || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.emptyText}>
                    No participants assigned to this organization.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
