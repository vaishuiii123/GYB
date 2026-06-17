import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Workshop({
  user,
}: PageProps) {

  const [templates, setTemplates] =
    useState<any[]>([]);

  const [organizations, setOrganizations] =
    useState<any[]>([]);

  const [participants, setParticipants] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      workshopName: "",
      startDate: "",
      endDate: "",
      templateId: "",
      organizationId: "",
    });

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {

    if (
      formData.organizationId
    ) {

      loadParticipants(
        formData.organizationId
      );
    }
    else {

      setParticipants([]);
    }

  }, [formData.organizationId]);

  const loadDropdowns = async () => {

  try {

    const [templateResponse, organizationResponse] =
      await Promise.all([
        fetch("/api/get-template"),
        fetch(
          `/api/get-organization?createdBy=${user?.email}`
        ),
      ]);

    const templateData =
      await templateResponse.json();

    const organizationData =
      await organizationResponse.json();

    if (templateData.success) {

      setTemplates(
        templateData.templates || []
      );
    }

    if (organizationData.success) {

      setOrganizations(
        organizationData.organizations || []
      );
    }

    console.log(
  "Templates:",
  templateData
);

console.log(
  "Organizations:",
  organizationData
);

  } catch (error) {

    console.error(
      "Error loading dropdowns:",
      error
    );
  }
};

  const loadParticipants =
    async (
      organizationId: string
    ) => {

      try {

        const response =
          await fetch(
            `/api/get-participants-by-organization?organizationId=${organizationId}`
          );

        const data =
          await response.json();

        if (data.success) {

          setParticipants(
            data.participants || []
          );
        }

      } catch (error) {

        console.error(error);
      }
    };

  const handleCreateWorkshop =
    async () => {

      if (
        !formData.workshopName ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.templateId ||
        !formData.organizationId
      ) {

        alert(
          "Please fill all required fields"
        );

        return;
      }

      try {

        setLoading(true);

        const selectedTemplate =
          templates.find(
            (t) =>
              t.id ===
              formData.templateId
          );

        const selectedOrganization =
          organizations.find(
            (o) =>
              o.id ===
              formData.organizationId
          );

        const response =
          await fetch(
            "/api/create-workshop",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                workshopName:
                  formData.workshopName,

                startDate:
                  formData.startDate,

                endDate:
                  formData.endDate,

                templateId:
                  selectedTemplate?.id,

                templateName:
                  selectedTemplate?.templateName,

                organizationId:
                  selectedOrganization?.id,

                organizationName:
                  selectedOrganization?.organizationName,

                participantCount:
                  participants.length,

                createdBy:
                  user?.name || "",
              }),
            }
          );

        const data =
          await response.json();

        if (data.success) {

          alert(
            "Workshop created successfully"
          );

          setFormData({
            workshopName: "",
            startDate: "",
            endDate: "",
            templateId: "",
            organizationId: "",
          });

          setParticipants([]);
        }
        else {

          alert(
            data.error ||
            "Failed to create workshop"
          );
        }

      } catch (error) {

        console.error(error);

        alert(
          "Failed to create workshop"
        );

      } finally {

        setLoading(false);
      }
    };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f5f6fa",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          marginLeft: "220px",
        }}
      >
        <Header user={user} />

        <div
          style={{
            padding: "30px",
            overflow: "hidden",
            marginTop: "70px",
          }}
        >
          <h1
            style={{
              fontSize: "38px",
              fontWeight: 700,
              marginBottom: "25px",
            }}
          >
            Create Workshop
          </h1>

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              boxShadow:
                "0 1px 5px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr 1fr",
                gap: "20px",
                marginBottom: "25px",
              }}
            >
              <div>
                <label style={label}>
                  Workshop Name *
                </label>

                <input
                  type="text"
                  value={
                    formData.workshopName
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workshopName:
                        e.target.value,
                    })
                  }
                  style={input}
                  placeholder="Enter workshop name"
                />
              </div>

              <div>
                <label style={label}>
                  Start Date - Time *
                </label>

                <input
                  type="datetime-local"
                  value={
                    formData.startDate
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startDate:
                        e.target.value,
                    })
                  }
                  style={input}
                />
              </div>

              <div>
                <label style={label}>
                  End Date - Time *
                </label>

                <input
                  type="datetime-local"
                  value={
                    formData.endDate
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endDate:
                        e.target.value,
                    })
                  }
                  style={input}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "20px",
                marginBottom: "30px",
              }}
            >
              <div>
                <label style={label}>
                  Select Template *
                </label>

                <select
                  value={formData.templateId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      templateId: e.target.value,
                    })
                  }
                  style={input}
                >
                  <option value="">
                    Select Template
                  </option>
                
                  {templates.map(
                    (template: any) => (
                      <option
                        key={template.id}
                        value={template.id}
                      >
                        {template.templateName}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label style={label}>
                  Select Organization *
                </label>

                <select
                    value={formData.organizationId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        organizationId:
                          e.target.value,
                      })
                    }
                    style={input}
                  >
                    <option value="">
                      Select Organization
                    </option>
                  
                    {organizations.map(
                      (org: any) => (
                        <option
                          key={org.id}
                          value={org.id}
                        >
                          {org.organizationName}
                        </option>
                      )
                    )}
                  </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
              }}
            >
              <button
                onClick={
                  handleCreateWorkshop
                }
                disabled={loading}
                style={primaryBtn}
              >
                {loading
                  ? "Creating..."
                  : "Create"}
              </button>

              <button
                onClick={() =>
                  setFormData({
                    workshopName: "",
                    startDate: "",
                    endDate: "",
                    templateId: "",
                    organizationId: "",
                  })
                }
                style={secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </div>

          {participants.length > 0 && (
            <div
              style={{
                background: "#fff",
                marginTop: "25px",
                padding: "25px",
                borderRadius: "12px",
              }}
            >
              <h3>
                Participants
              </h3>

              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={th}>
                      Sr No
                    </th>
                    <th style={th}>
                      Name
                    </th>
                    <th style={th}>
                      Email
                    </th>
                    <th style={th}>
                      Phone
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {participants.map(
                    (
                      p,
                      index
                    ) => (
                      <tr
                        key={p.id}
                      >
                        <td style={td}>
                          {index + 1}
                        </td>

                        <td style={td}>
                          {
                            p.firstName
                          }{" "}
                          {
                            p.lastName
                          }
                        </td>

                        <td style={td}>
                          {p.email}
                        </td>

                        <td style={td}>
                          {p.phoneNo}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const label = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 500,
};

const input = {
  width: "100%",
  height: "48px",
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  boxSizing: "border-box" as const,
};

const primaryBtn = {
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  padding: "10px 25px",
  borderRadius: "6px",
  cursor: "pointer",
};

const secondaryBtn = {
  background: "#e5e7eb",
  border: "none",
  padding: "10px 25px",
  borderRadius: "6px",
  cursor: "pointer",
};

const th = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};
