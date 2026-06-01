import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function Organization() {
  // ================= ORGANIZATIONS =================

  const [organizations, setOrganizations] =
    useState<any[]>(() => {
      const saved =
        localStorage.getItem(
          "organizations"
        );

      return saved
        ? JSON.parse(saved)
        : [];
    });

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

  // ================= SAVE STORAGE =================

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

  const handleCreateOrganization =
    () => {
      if (
        !orgForm.organizationName ||
        !orgForm.contactPerson ||
        !orgForm.email
      ) {
        alert("Please fill all fields");
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
              onClick={() => {
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
  onClick={() => {
    alert("Button Clicked");
    setShowOrgModal(true);
  }}
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
                          gap: "10px",
                        }}
                      >
                        <button
                          style={viewBtn}
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
                          style={deleteBtn}
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
