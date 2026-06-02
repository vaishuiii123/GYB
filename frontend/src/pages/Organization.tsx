import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function Organization({ user }: PageProps) {
  // ================= ORGANIZATIONS =================

  const [organizations, setOrganizations] = useState<any[]>([]);

  // ================= PARTICIPANTS =================

  const [participants, setParticipants] =
    useState<any[]>(() => {
      const saved =
        localStorage.getItem(
          "participants"
        );

      return saved
        ? JSON.parse(saved)
        : [];
    });

  // =================  FETCH DATA FROM TABLE =================

const fetchOrganizations = async () => {
  try {
    const response = await fetch("/api/get-organizations");
    const data = await response.json();

    if (data.success) {
      setOrganizations(data.organizations);
    } else {
      console.error(data.error);
    }
  } catch (err) {
    console.error("Failed to fetch organizations", err);
  }
};

useEffect(() => {
  fetchOrganizations();
}, []);
  
  useEffect(() => {
    localStorage.setItem(
      "participants",
      JSON.stringify(participants)
    );
  }, [participants]);

  // ================= MODALS =================

  const [showOrgModal, setShowOrgModal] =
    useState(false);

  const [
    showParticipantModal,
    setShowParticipantModal,
  ] = useState(false);

  const [
    showParticipantsView,
    setShowParticipantsView,
  ] = useState(false);

  // ================= STATES =================

  const [selectedOrg, setSelectedOrg] =
    useState<any>(null);

  const [participantMode, setParticipantMode] =
    useState("single");

  const [
    selectedExcelOrg,
    setSelectedExcelOrg,
  ] = useState("");

  // ================= FORMS =================

  const [orgForm, setOrgForm] =
    useState({
      organizationName: "",
      contactPerson: "",
      email: "",
    });

  const [
    participantForm,
    setParticipantForm,
  ] = useState({
    organization: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
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
        createdBy: user?.name || "",
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

      // ✅ Refresh from Azure
      fetchOrganizations();
    } else {
      alert(data.error || "Something went wrong");
    }

  } catch (err) {
    console.error(err);
    alert("Failed to create organization");
  }
};

    const data = await response.json();

    if (data.success) {
      alert("Organization created successfully");

      setOrgForm({
        organizationName: "",
        contactPerson: "",
        email: "",
      });

      setShowOrgModal(false);

      // ✅ Reload organizations from Azure Table Storage
      fetchOrganizations();
    } else {
      alert(data.error || "Failed to create organization");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to create organization");
  }
};
          }
        );

      const data =
        await response.json();

      if (data.success) {

        alert(
          "Organization created successfully"
        );

        setOrgForm({
          organizationName: "",
          contactPerson: "",
          email: "",
        });

        setShowOrgModal(false);

      } else {

        alert(data.error);
      }

    } catch (err) {

      console.error(err);

      alert(
        "Failed to create organization"
      );
    }
  };

  // ================= ADD PARTICIPANT =================

  const handleAddParticipant = () => {
    if (
      !participantForm.organization ||
      !participantForm.firstName ||
      !participantForm.email
    ) {
      alert("Please fill required fields");
      return;
    }

    const newParticipant = {
      id: Date.now(),
      ...participantForm,
    };

    setParticipants([
      ...participants,
      newParticipant,
    ]);

    setParticipantForm({
      organization: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
    });

    setShowParticipantModal(false);
  };

  const generatePassword = () => {
  const first =
    participantForm.firstName
      ?.substring(0, 1)
      .toLowerCase() || "";

  const last =
    participantForm.lastName
      ?.substring(0, 1)
      .toLowerCase() || "";

  const password =
    `${first}${last}123`;

  setParticipantForm({
    ...participantForm,
    password,
  });
};

  // ================= DELETE =================

  const handleDeleteOrganization = (
    id: number
  ) => {
    const updated =
      organizations.filter(
        (org) => org.id !== id
      );

    setOrganizations(updated);
  };

  // ================= DOWNLOAD EXCEL =================

  const handleDownloadExcel = () => {
    if (!selectedExcelOrg) {
      alert(
        "Please select organization first"
      );

      return;
    }

    const sampleData = [
      {
        Organization:
          selectedExcelOrg,
        FirstName: "",
        MiddleName: "",
        LastName: "",
        Email: "",
        Phone: "",
        Password: "",
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(
        sampleData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Participants"
    );

    XLSX.writeFile(
      workbook,
      "Participant_Template.xlsx"
    );
  };

  // ================= UPLOAD EXCEL =================

  const handleUploadExcel = (
    e: any
  ) => {
    const file =
      e.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = (
      event: any
    ) => {
      const data =
        event.target.result;

      const workbook =
        XLSX.read(data, {
          type: "binary",
        });

      const sheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      const excelData =
        XLSX.utils.sheet_to_json(
          worksheet
        );

      const uploadedParticipants =
        excelData.map(
          (row: any) => ({
            id:
              Date.now() +
              Math.random(),

            organization:
              row.Organization || "",

            firstName:
              row.FirstName || "",

            middleName:
              row.MiddleName || "",

            lastName:
              row.LastName || "",

            email:
              row.Email || "",

            phone:
              row.Phone || "",

            password:
              row.Password || "",
          })
        );

      setParticipants(
        (prev) => [
          ...prev,
          ...uploadedParticipants,
        ]
      );

      alert(
        "Participants uploaded successfully"
      );

      setShowParticipantModal(false);
    };

    reader.readAsBinaryString(file);
  };

  console.log("showOrgModal =", showOrgModal);

  return (
    <div
      style={{
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <Header user={user} />
      <Sidebar />

      <div
        style={{
          marginLeft: "150px",
          paddingTop: "50px",
          paddingLeft: "100px",
          paddingRight: "30px",
        }}
      >
        {/* PAGE HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "30px",
            paddingLeft: "100px",
          }}
        >
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "700",
            }}
          >
            Organization
          </h1>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
  onClick={() =>
    setShowParticipantModal(true)
  }
  style={saveBtn}
>
  Add Participant
</button>
            {showParticipantModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        width: "600px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >
      <h2>Add New Participant</h2>

      <select
        value={participantForm.organization}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            organization: e.target.value,
          })
        }
      >
        <option value="">
          Select Organization
        </option>

        {organizations.map((org) => (
          <option
            key={org.id}
            value={org.organizationName}
          >
            {org.organizationName}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="First Name"
        value={participantForm.firstName}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            firstName: e.target.value,
          })
        }
      />

      <input
        type="text"
        placeholder="Middle Name"
        value={participantForm.middleName}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            middleName: e.target.value,
          })
        }
      />

      <input
        type="text"
        placeholder="Last Name"
        value={participantForm.lastName}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            lastName: e.target.value,
          })
        }
      />

      <input
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

      <input
        type="text"
        placeholder="Phone"
        value={participantForm.phone}
        onChange={(e) =>
          setParticipantForm({
            ...participantForm,
            phone: e.target.value,
          })
        }
      />

      <div
  style={{
    display: "flex",
    gap: "10px",
  }}
>
  <input
    type="text"
    placeholder="Password"
    value={participantForm.password}
    readOnly
    style={{
      flex: 1,
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "6px",
    }}
  />

  <button
    type="button"
    onClick={generatePassword}
    style={saveBtn}
  >
    Generate
  </button>
</div>
      <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  }}
>
  <button
    onClick={() =>
      setShowParticipantModal(false)
    }
    style={{
      padding: "10px 20px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      cursor: "pointer",
    }}
  >
    Cancel
  </button>

  <button
    onClick={handleAddParticipant}
    style={saveBtn}
  >
    Save Participant
  </button>
</div>
    </div>
  </div>
)}
           <button
  onClick={() => setShowOrgModal(true)}
  style={saveBtn}
>
  Create Organization
</button>
          </div>
        </div>

        {/* ORGANIZATION TABLE */}

        <div style={card}>

          <table
  style={{
    width: "100%",
    borderCollapse: "collapse",
  }}
>
  <thead>
    <tr>
      <th style={tableHeader}>Sr No.</th>
      <th style={tableHeader}>Organization Name</th>
      <th style={tableHeader}>Contact Person</th>
      <th style={tableHeader}>Email</th>
      <th style={tableHeader}>Created By</th> {/* ✅ NEW COLUMN */}
      <th style={tableHeader}>Action</th>
    </tr>
  </thead>

  <tbody>
    {organizations.length === 0 ? (
      <tr>
        <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
          No organizations found
        </td>
      </tr>
    ) : (
      organizations.map((org, index) => (
        <tr key={org.id || index}>
          <td style={tableCell}>{index + 1}</td>

          <td style={tableCell}>
            {org.organizationName || "-"}
          </td>

          <td style={tableCell}>
            {org.contactPerson || "-"}
          </td>

          <td style={tableCell}>
            {org.email || "-"}
          </td>

          {/* ✅ SHOW CREATED BY */}
          <td style={tableCell}>
            {org.createdBy || "-"}
          </td>

          <td style={tableCell}>
            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                style={viewBtn}
                onClick={() => {
                  setSelectedOrg(org);
                  setShowParticipantsView(true);
                }}
              >
                View
              </button>

              <button
                style={deleteBtn}
                onClick={() =>
                  handleDeleteOrganization(org.id)
                }
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>

        {showOrgModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        width: "500px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >
      <h2>Create Organization</h2>

      <input
        type="text"
        placeholder="Organization Name"
        value={orgForm.organizationName}
        onChange={(e) =>
          setOrgForm({
            ...orgForm,
            organizationName: e.target.value,
          })
        }
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />

      <input
        type="text"
        placeholder="Contact Person"
        value={orgForm.contactPerson}
        onChange={(e) =>
          setOrgForm({
            ...orgForm,
            contactPerson: e.target.value,
          })
        }
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />

      <input
        type="email"
        placeholder="Email"
        value={orgForm.email}
        onChange={(e) =>
          setOrgForm({
            ...orgForm,
            email: e.target.value,
          })
        }
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "10px",
        }}
      >
        <button
          onClick={() =>
            setShowOrgModal(false)
          }
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleCreateOrganization}
          style={saveBtn}
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const card: any = {
  background: "white",
  padding: "30px",
  borderRadius: "18px",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.06)",
};

const saveBtn: any = {
  background: "#7a0019",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
};

const deleteBtn: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
};

const viewBtn: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
};

const tableHeader: any = {
  textAlign: "left",
  padding: "16px",
  borderBottom:
    "1px solid #e5e7eb",
  fontWeight: "600",
};

const tableCell: any = {
  padding: "16px",
  borderBottom:
    "1px solid #f3f4f6",
};
