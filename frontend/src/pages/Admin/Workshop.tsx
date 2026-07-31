import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import styles from "../../styles/Workshop.module.css";

type PageProps = {
  user?: any;
};

export default function Workshop({ user }: PageProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [sendingWorkshopId, setSendingWorkshopId] = useState("");
  const [deletingWorkshopId, setDeletingWorkshopId] = useState("");
  const [showOrgViewModal, setShowOrgViewModal] = useState(false);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState<any>(null);
  const [viewWorkshopDetails, setViewWorkshopDetails] = useState<any>(null);
  const [viewParticipants, setViewParticipants] = useState<any[]>([]);
  const [loadingOrgView, setLoadingOrgView] = useState(false);

  const [formData, setFormData] = useState({
    workshopName: "",
    startDate: "",
    endDate: "",
    templateId: "",
    organizationId: "",
  });

  useEffect(() => {
    console.log("User:", user);

    if (user?.email) {
      loadTemplates();
      loadOrganizations();
      loadWorkshops();
    }
  }, [user]);

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
      const response = await fetch(
        `/api/get-organizations?createdBy=${user?.email}`
      );

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


  const handleCreateWorkshop = async () => {
  if (
    !formData.workshopName ||
    !formData.startDate ||
    !formData.endDate ||
    !formData.templateId ||
    !formData.organizationId
  ) {
    alert("Please fill all required fields");
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

    const response = await fetch("/api/create-workshop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workshopName: formData.workshopName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.templateName,
        organizationId: selectedOrganization?.id,
        organizationName: selectedOrganization?.organizationName,
        participantCount: participants.length,
        createdBy: user?.email || "",
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Workshop created successfully");

      setFormData({
        workshopName: "",
        startDate: "",
        endDate: "",
        templateId: "",
        organizationId: "",
      });

      setParticipants([]);

      // Refresh the workshop list
      await loadWorkshops();

      // Close the popup
      setShowCreatePopup(false);
    } else {
      alert(data.error || "Failed to create workshop");
    }
  } catch (error) {
    console.error("Error creating workshop:", error);
    alert("Failed to create workshop");
  } finally {
    setLoading(false);
  }
};
  const loadWorkshops = async () => {
  try {
    const response = await fetch(
      `/api/get-workshops?createdBy=${user?.email}`
    );

    const data = await response.json();

    if (data.success) {
      setWorkshops(data.workshops || []);
    }
  } catch (error) {
    console.error("Error loading workshops", error);
  }
};

  const handleSendWorkshopNotification = async (workshop: any) => {
    const confirmed = window.confirm(
      `Send workshop login details via SMS to all participants in "${workshop.organizationName}"?`
    );

    if (!confirmed) return;

    try {
      setSendingWorkshopId(workshop.id);

      const response = await fetch("/api/send-workshop-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workshopId: workshop.id,
          loginUrl: window.location.origin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || "Notifications sent successfully");
      } else {
        const failedDetails = (data.results || [])
          .filter((item: any) => !item.success)
          .slice(0, 3)
          .map((item: any) => `${item.name}: ${item.error}`)
          .join("\n");

        alert(
          data.message ||
            data.error ||
            failedDetails ||
            "Failed to send notifications"
        );
      }
    } catch (error) {
      console.error("Error sending workshop notifications:", error);
      alert("Failed to send workshop notifications");
    } finally {
      setSendingWorkshopId("");
    }
  };

  const handleDeleteWorkshop = async (workshop: any) => {
    const confirmed = window.confirm(
      `Delete workshop "${workshop.workshopName}"?`
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
            <h1 className={styles.title}>Workshops</h1>

            <button
              className={styles.primaryButton}
              onClick={() => setShowCreatePopup(true)}
            >
              + Create Workshop
            </button>
          </div>

          {showCreatePopup && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.formGridThree}>
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

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Start Date - Time *
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
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      End Date - Time *
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
                  </div>

                </div>

                <div className={styles.formGridTwo}>

                                    <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Select Template *
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
                      <option value="">Select Template</option>

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
                        Template:{" "}
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
                    onClick={handleCreateWorkshop}
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>

                  <button
                    className={styles.secondaryButton}
                    onClick={() => {
                      setFormData({
                        workshopName: "",
                        startDate: "",
                        endDate: "",
                        templateId: "",
                        organizationId: "",
                      });
                    
                      setParticipants([]);
                    
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
            <h3 className={styles.tableTitle}>Scheduled Workshops</h3>

  <table className={styles.table}>
    <thead>
      <tr>
        <th className={styles.th}>Sr No</th>
        <th className={styles.th}>Workshop Name</th>
        <th className={styles.th}>Template</th>
        <th className={styles.th}>Organization</th>
        <th className={styles.th}>Start Date</th>
        <th className={styles.th}>End Date</th>
        <th className={styles.th}>Participants</th>
        <th className={styles.th}>Actions</th>
      </tr>
    </thead>

    <tbody>
      {workshops.length > 0 ? (
        workshops.map((workshop: any, index: number) => (
          <tr key={workshop.id}>
            <td className={styles.td}>{index + 1}</td>
            <td className={styles.td}>{workshop.workshopName}</td>
            <td className={styles.td}>{workshop.templateName}</td>
            <td className={styles.td}>{workshop.organizationName}</td>
            <td className={styles.td}>
              {new Date(workshop.startDate).toLocaleString()}
            </td>
            <td className={styles.td}>
              {new Date(workshop.endDate).toLocaleString()}
            </td>
            <td className={styles.td}>{workshop.participantCount}</td>
            <td className={styles.td}>
              <div className={styles.actionGroup}>
                <button
                  className={styles.viewButton}
                  onClick={() => handleViewWorkshopOrganization(workshop)}
                  disabled={loadingOrgView}
                >
                  View
                </button>
                <button
                  className={styles.sendButton}
                  onClick={() => handleSendWorkshopNotification(workshop)}
                  disabled={sendingWorkshopId === workshop.id}
                >
                  {sendingWorkshopId === workshop.id
                    ? "Sending..."
                    : "Send SMS"}
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteWorkshop(workshop)}
                  disabled={deletingWorkshopId === workshop.id}
                >
                  {deletingWorkshopId === workshop.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td className={styles.td} colSpan={8}>
            No workshops scheduled.
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
