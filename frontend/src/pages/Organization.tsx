import {
  useState,
  useEffect,
} from "react";

import * as XLSX from "xlsx";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Organization() {
  // ================= ORGANIZATIONS =================

  const [organizations, setOrganizations] =
    useState<any[]>(() => {
      const savedOrganizations =
        localStorage.getItem(
          "organizations"
        );

      return savedOrganizations
        ? JSON.parse(savedOrganizations)
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
        ? JSON.parse(savedParticipants)
        : [];
    });

  // ================= SAVE LOCAL STORAGE =================

  useEffect(() => {
    localStorage.setItem(
      "organizations",
      JSON.stringify(organizations)
    );
  }, [organizations]);

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

    if (editingParticipant) {
      const updatedParticipants =
        participants.map((p) =>
          p.id === editingParticipant.id
            ? {
                ...p,
                ...participantForm,
              }
            : p
        );

      setParticipants(
        updatedParticipants
      );

      setEditingParticipant(null);

      setShowParticipantModal(
        false
      );

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
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <Header />
      <Sidebar />

      <div
        style={{
          marginLeft: "250px",
          paddingTop: "90px",
          paddingLeft: "30px",
          paddingRight: "30px",
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
          <h1
            style={{
              fontSize: "40px",
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

        {/* TABLE */}

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
                        <button
                          style={
                            viewBtn
                          }
                          onClick={() => {
                            setSelectedOrg(
                              org
                            );

                            setShowParticipantsView(
                              true
                            );
                          }}
                        >
                          View
                        </button>

                        <button
                          style={
                            deleteBtn
                          }
                          onClick={() =>
                            handleDeleteOrganization(
                              org.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* PARTICIPANT VIEW */}

        {showParticipantsView &&
          selectedOrg && (
            <div style={overlay}>
              <div
                style={{
                  ...modal,
                  width: "900px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    marginBottom:
                      "20px",
                  }}
                >
                  <h2>
                    Participants -
                    {
                      selectedOrg.organizationName
                    }
                  </h2>

                  <button
                    onClick={() =>
                      setShowParticipantsView(
                        false
                      )
                    }
                    style={cancelBtn}
                  >
                    Close
                  </button>
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={
                          tableHeader
                        }
                      >
                        Name
                      </th>

                      <th
                        style={
                          tableHeader
                        }
                      >
                        Email
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {participants
                      .filter(
                        (p) =>
                          p.organization ===
                          selectedOrg.organizationName
                      )
                      .map((p) => (
                        <tr
                          key={p.id}
                        >
                          <td
                            style={
                              tableCell
                            }
                          >
                            {
                              p.firstName
                            }{" "}
                            {
                              p.lastName
                            }
                          </td>

                          <td
                            style={
                              tableCell
                            }
                          >
                            {
                              p.email
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* CREATE ORG MODAL */}

        {showOrgModal && (
          <div style={overlay}>
            <div style={modal}>
              <h2>Create Organization</h2>

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
      </div>
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
  borderRadius: "18px",
};

const card: any = {
  background: "white",
  padding: "30px",
  borderRadius: "18px",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.06)",
};

const inputStyle: any = {
  width: "100%",
  padding: "14px",
  marginBottom: "15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
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

const cancelBtn: any = {
  background: "#6b7280",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: "8px",
  cursor: "pointer",
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
