import {
  useState,
  useEffect,
} from "react";

import * as XLSX from "xlsx";

export default function Organization() {
  // ================= ORGANIZATIONS =================

  const [organizations, setOrganizations] =
    useState<any[]>(() => {
      const savedOrganizations =
        localStorage.getItem(
          "organizations"
        );

      return savedOrganizations
        ? JSON.parse(
            savedOrganizations
          )
        : [];
    });

  // ================= PARTICIPANTS =================

  const [participants, setParticipants] =
    useState<any[]>(() => {
      const savedParticipants =
        localStorage.getItem(
          "participants"
        );

      return savedParticipants
        ? JSON.parse(
            savedParticipants
          )
        : [];
    });

  // ================= SAVE LOCAL STORAGE =================

  useEffect(() => {
    localStorage.setItem(
      "organizations",
      JSON.stringify(
        organizations
      )
    );
  }, [organizations]);

  useEffect(() => {
    localStorage.setItem(
      "participants",
      JSON.stringify(
        participants
      )
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
    editingParticipant,
    setEditingParticipant,
  ] = useState<any>(null);

  const [
    selectedExcelOrg,
    setSelectedExcelOrg,
  ] = useState("");

  // ================= ORGANIZATION FORM =================

  const [orgForm, setOrgForm] =
    useState({
      organizationName: "",
      contactPerson: "",
      email: "",
    });

  // ================= PARTICIPANT FORM =================

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

  const handleCreateOrganization =
    () => {
      if (
        !orgForm.organizationName ||
        !orgForm.contactPerson ||
        !orgForm.email
      ) {
        alert("Fill all fields");
        return;
      }

      const newOrg = {
        id: Date.now(),
        ...orgForm,
      };

      setOrganizations([
        ...organizations,
        newOrg,
      ]);

      setOrgForm({
        organizationName: "",
        contactPerson: "",
        email: "",
      });

      setShowOrgModal(false);
    };

  // ================= ADD / EDIT PARTICIPANT =================

  const handleAddParticipant = () => {
    if (
      !participantForm.organization ||
      !participantForm.firstName ||
      !participantForm.email
    ) {
      alert("Fill required fields");
      return;
    }

    // EDIT

    if (editingParticipant) {
      const updatedParticipants =
        participants.map((p) =>
          p.id ===
          editingParticipant.id
            ? {
                ...p,
                ...participantForm,
              }
            : p
        );

      setParticipants(
        updatedParticipants
      );

      setEditingParticipant(
        null
      );

      setShowParticipantModal(
        false
      );

      setShowParticipantsView(
        true
      );

      return;
    }

    // ADD NEW

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

    setShowParticipantModal(
      false
    );
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

  const handleDeleteParticipant = (
    id: number
  ) => {
    const updated =
      participants.filter(
        (p) => p.id !== id
      );

    setParticipants(updated);
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

    if (!selectedExcelOrg) {
      alert(
        "Please select organization before uploading excel"
      );

      return;
    }

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

      // VALIDATE ORGANIZATION

      const invalidRows =
        excelData.filter(
          (row: any) =>
            row.Organization !==
            selectedExcelOrg
        );

      if (
        invalidRows.length > 0
      ) {
        alert(
          "Organization name in excel does not match selected organization"
        );

        return;
      }

      const uploadedParticipants =
        excelData.map(
          (row: any) => ({
            id:
              Date.now() +
              Math.random(),

            organization:
              row.Organization ||
              "",

            firstName:
              row.FirstName ||
              "",

            middleName:
              row.MiddleName ||
              "",

            lastName:
              row.LastName ||
              "",

            email:
              row.Email || "",

            phone:
              row.Phone || "",

            password:
              row.Password ||
              "",
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

      setSelectedExcelOrg("");

      setShowParticipantModal(
        false
      );
    };

    reader.readAsBinaryString(
      file
    );
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h1>Organization</h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={() => {
              setEditingParticipant(
                null
              );

              setParticipantMode(
                "single"
              );

              setShowParticipantModal(
                true
              );
            }}
            style={saveBtn}
          >
            Add Participant
          </button>

          <button
            onClick={() =>
              setShowOrgModal(true)
            }
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
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={tableHeader}>
                Sr No.
              </th>

              <th style={tableHeader}>
                Organization Name
              </th>

              <th style={tableHeader}>
                Contact Person
              </th>

              <th style={tableHeader}>
                Email
              </th>

              <th style={tableHeader}>
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {organizations.map(
              (org, index) => (
                <tr key={org.id}>
                  <td style={tableCell}>
                    {index + 1}
                  </td>

                  <td style={tableCell}>
                    {
                      org.organizationName
                    }
                  </td>

                  <td style={tableCell}>
                    {
                      org.contactPerson
                    }
                  </td>

                  <td style={tableCell}>
                    {org.email}
                  </td>

                  <td style={tableCell}>
                    <div
                      style={{
                        display:
                          "flex",
                        gap: "15px",
                      }}
                    >
                      {/* VIEW */}

                      <img
                        src="https://cdn-icons-png.flaticon.com/512/709/709612.png"
                        width="28"
                        style={{
                          cursor:
                            "pointer",
                        }}
                        onClick={() => {
                          setSelectedOrg(
                            org
                          );

                          setShowParticipantsView(
                            true
                          );
                        }}
                      />

                      {/* DELETE */}

                      <img
                        src="https://cdn-icons-png.flaticon.com/512/1214/1214428.png"
                        width="24"
                        style={{
                          cursor:
                            "pointer",
                        }}
                        onClick={() =>
                          handleDeleteOrganization(
                            org.id
                          )
                        }
                      />
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE ORGANIZATION MODAL */}

      {showOrgModal && (
        <div style={overlay}>
          <div style={modal}>
            <h2
              style={{
                marginBottom:
                  "20px",
              }}
            >
              Create Organization
            </h2>

            <input
              type="text"
              placeholder="Organization Name"
              value={
                orgForm.organizationName
              }
              onChange={(e) =>
                setOrgForm({
                  ...orgForm,
                  organizationName:
                    e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Contact Person"
              value={
                orgForm.contactPerson
              }
              onChange={(e) =>
                setOrgForm({
                  ...orgForm,
                  contactPerson:
                    e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              type="email"
              placeholder="Email"
              value={orgForm.email}
              onChange={(e) =>
                setOrgForm({
                  ...orgForm,
                  email:
                    e.target.value,
                })
              }
              style={inputStyle}
            />

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() =>
                  setShowOrgModal(
                    false
                  )
                }
                style={cancelBtn}
              >
                Cancel
              </button>

              <button
                onClick={
                  handleCreateOrganization
                }
                style={saveBtn}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARTICIPANT MODAL */}

      {showParticipantModal && (
        <div style={overlay}>
          <div
            style={{
              ...modal,
              width: "700px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2>
                {editingParticipant
                  ? "Edit Participant"
                  : "Add Participant"}
              </h2>

              <button
                onClick={() =>
                  setShowParticipantModal(
                    false
                  )
                }
                style={cancelBtn}
              >
                Close
              </button>
            </div>

            {!editingParticipant && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom:
                    "20px",
                }}
              >
                <button
                  onClick={() =>
                    setParticipantMode(
                      "single"
                    )
                  }
                  style={{
                    ...saveBtn,
                    background:
                      participantMode ===
                      "single"
                        ? "#7a0019"
                        : "#d1d5db",
                  }}
                >
                  Add Single
                  Participant
                </button>

                <button
                  onClick={() =>
                    setParticipantMode(
                      "excel"
                    )
                  }
                  style={{
                    ...saveBtn,
                    background:
                      participantMode ===
                      "excel"
                        ? "#2563eb"
                        : "#d1d5db",
                  }}
                >
                  Upload Excel
                </button>
              </div>
            )}

            {/* EXCEL */}

            {!editingParticipant &&
              participantMode ===
                "excel" && (
                <>
                  <select
                    value={
                      selectedExcelOrg
                    }
                    onChange={(e) =>
                      setSelectedExcelOrg(
                        e.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="">
                      Select
                      Organization
                    </option>

                    {organizations.map(
                      (org) => (
                        <option
                          key={
                            org.id
                          }
                          value={
                            org.organizationName
                          }
                        >
                          {
                            org.organizationName
                          }
                        </option>
                      )
                    )}
                  </select>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "10px",
                      alignItems:
                        "center",
                      marginBottom:
                        "20px",
                    }}
                  >
                    <button
                      onClick={
                        handleDownloadExcel
                      }
                      style={
                        saveBtn
                      }
                    >
                      Download Excel
                      Template
                    </button>

                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={
                        handleUploadExcel
                      }
                    />
                  </div>
                </>
              )}

            {/* SINGLE */}

            {(participantMode ===
              "single" ||
              editingParticipant) && (
              <>
                <select
                  value={
                    participantForm.organization
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        organization:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="">
                    Select
                    Organization
                  </option>

                  {organizations.map(
                    (org) => (
                      <option
                        key={
                          org.id
                        }
                        value={
                          org.organizationName
                        }
                      >
                        {
                          org.organizationName
                        }
                      </option>
                    )
                  )}
                </select>

                <input
                  type="text"
                  placeholder="First Name"
                  value={
                    participantForm.firstName
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        firstName:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <input
                  type="text"
                  placeholder="Middle Name"
                  value={
                    participantForm.middleName
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        middleName:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <input
                  type="text"
                  placeholder="Last Name"
                  value={
                    participantForm.lastName
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        lastName:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <input
                  type="email"
                  placeholder="Email"
                  value={
                    participantForm.email
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        email:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <input
                  type="text"
                  placeholder="Phone"
                  value={
                    participantForm.phone
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        phone:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <input
                  type="text"
                  placeholder="Password"
                  value={
                    participantForm.password
                  }
                  onChange={(e) =>
                    setParticipantForm(
                      {
                        ...participantForm,
                        password:
                          e.target
                            .value,
                      }
                    )
                  }
                  style={
                    inputStyle
                  }
                />

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() =>
                      setShowParticipantModal(
                        false
                      )
                    }
                    style={
                      cancelBtn
                    }
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleAddParticipant
                    }
                    style={saveBtn}
                  >
                    {editingParticipant
                      ? "Update"
                      : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const overlay: any = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background:
    "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modal: any = {
  background: "white",
  padding: "30px",
  borderRadius: "12px",
  width: "450px",
};

const card: any = {
  background: "white",
  padding: "30px",
  borderRadius: "12px",
};

const inputStyle: any = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  border: "1px solid #ccc",
  borderRadius: "5px",
};

const saveBtn: any = {
  background: "#7a0019",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: "5px",
  cursor: "pointer",
};

const cancelBtn: any = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: "5px",
  cursor: "pointer",
};

const tableHeader: any = {
  textAlign: "left",
  padding: "14px",
  borderBottom:
    "1px solid #ddd",
};

const tableCell: any = {
  padding: "14px",
  borderBottom:
    "1px solid #eee",
};