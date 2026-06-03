import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

import {
  useState,
  useEffect,
} from "react";

type PageProps = {
  user?: any;
};

export default function Workshop(<Header user={user} />) {
  const [workshops, setWorkshops] =
    useState<any[]>([]);

  const [participants, setParticipants] =
    useState<any[]>([]);

  const [organizations, setOrganizations] =
    useState<any[]>([]);

  const [workshopForm, setWorkshopForm] =
    useState({
      workshopName: "",
      startDate: "",
      endDate: "",
      template: "",
      organization: "",
    });

  // ================= TEMPLATES =================

  const templates = [
    "Cyber Security",
    "AI Workshop",
    "Digital Transformation",
    "Leadership Workshop",
  ];

  // ================= FETCH ORGANIZATIONS =================

  useEffect(() => {
    const savedOrganizations =
      JSON.parse(
        localStorage.getItem(
          "organizations"
        ) || "[]"
      );

    setOrganizations(
      savedOrganizations
    );
  }, []);

  // ================= FETCH PARTICIPANTS =================

  useEffect(() => {
    const savedParticipants =
      JSON.parse(
        localStorage.getItem(
          "participants"
        ) || "[]"
      );

    setParticipants(
      savedParticipants
    );
  }, []);

  // ================= CREATE WORKSHOP =================

  const handleCreateWorkshop = () => {
    if (
      !workshopForm.workshopName ||
      !workshopForm.startDate ||
      !workshopForm.endDate ||
      !workshopForm.template ||
      !workshopForm.organization
    ) {
      alert("Please fill all fields");
      return;
    }

    const newWorkshop = {
      id: Date.now(),
      ...workshopForm,
    };

    const updatedWorkshops = [
      ...workshops,
      newWorkshop,
    ];

    setWorkshops(updatedWorkshops);

    localStorage.setItem(
      "workshops",
      JSON.stringify(
        updatedWorkshops
      )
    );

    alert(
      "Workshop Scheduled Successfully"
    );

    setWorkshopForm({
      workshopName: "",
      startDate: "",
      endDate: "",
      template: "",
      organization: "",
    });
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "#eef3f7",
        minHeight: "100vh",
      }}
    >

      <Header user={user} />
      <Sidebar />
      
      {/* TITLE */}

      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "40px",
            fontWeight: "700",
            margin: 0,
          }}
        >
          Workshop
        </h1>
      </div>

      {/* FORM */}

      <div
        style={{
          background: "white",
          border:
            "0px solid #d9e1e8",
          borderRadius: "20px",
          padding: "35px",
          marginBottom: "30px",
        }}
      >
        {/* TOP ROW */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr 1fr",
            gap: "30px",
            marginBottom: "40px",
          }}
        >
          {/* WORKSHOP NAME */}

          <div>
            <label
              style={labelStyle}
            >
              Workshop Name *
            </label>

            <input
              type="text"
              value={
                workshopForm.workshopName
              }
              onChange={(e) =>
                setWorkshopForm({
                  ...workshopForm,
                  workshopName:
                    e.target.value,
                })
              }
              style={inputStyle}
            />
          </div>

          {/* START DATE */}

          <div>
            <label
              style={labelStyle}
            >
              Start Date : Time *
            </label>

            <input
              type="datetime-local"
              value={
                workshopForm.startDate
              }
              onChange={(e) =>
                setWorkshopForm({
                  ...workshopForm,
                  startDate:
                    e.target.value,
                })
              }
              style={inputStyle}
            />
          </div>

          {/* END DATE */}

          <div>
            <label
              style={labelStyle}
            >
              End Date : Time *
            </label>

            <input
              type="datetime-local"
              value={
                workshopForm.endDate
              }
              onChange={(e) =>
                setWorkshopForm({
                  ...workshopForm,
                  endDate:
                    e.target.value,
                })
              }
              style={inputStyle}
            />
          </div>
        </div>

        {/* SECOND ROW */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "30px",
            marginBottom: "40px",
          }}
        >
          {/* TEMPLATE */}

          <div>
            <label
              style={labelStyle}
            >
              Select Template *
            </label>

            <select
              value={
                workshopForm.template
              }
              onChange={(e) =>
                setWorkshopForm({
                  ...workshopForm,
                  template:
                    e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">
                Select Template
              </option>

              {templates.map(
                (template) => (
                  <option
                    key={template}
                    value={template}
                  >
                    {template}
                  </option>
                )
              )}
            </select>
          </div>

          {/* ORGANIZATION */}

          <div>
            <label
              style={labelStyle}
            >
              Select Organization *
            </label>

            <select
              value={
                workshopForm.organization
              }
              onChange={(e) =>
                setWorkshopForm({
                  ...workshopForm,
                  organization:
                    e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">
                Select Organization
              </option>

              {organizations.map(
                (org: any) => (
                  <option
                    key={org.id}
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
          </div>
        </div>

        {/* BUTTONS */}

        <div
          style={{
            display: "flex",
            gap: "20px",
          }}
        >
          <button
            onClick={
              handleCreateWorkshop
            }
            style={{
              background:
                "#8B0022",
              color: "white",
              border: "none",
              padding:
                "10px 30px",
              borderRadius:
                "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "15px",
            }}
          >
            Create
          </button>

          <button
            onClick={() =>
              setWorkshopForm({
                workshopName: "",
                startDate: "",
                endDate: "",
                template: "",
                organization: "",
              })
            }
            style={{
              background:
                "#2d3e50",
              color: "white",
              border: "none",
              padding:
                "10px 30px",
              borderRadius:
                "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "15px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* PARTICIPANT LIST */}

      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
          }}
        >
          Participants
        </h2>

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
                Organization
              </th>

              <th style={tableHeader}>
                Name
              </th>

              <th style={tableHeader}>
                Email
              </th>

              <th style={tableHeader}>
                Phone
              </th>
            </tr>
          </thead>

          <tbody>
            {participants
              .filter(
                (participant) =>
                  !workshopForm.organization ||
                  participant.organization ===
                    workshopForm.organization
              )
              .map(
                (
                  participant,
                  index
                ) => (
                  <tr
                    key={
                      participant.id
                    }
                  >
                    <td
                      style={
                        tableCell
                      }
                    >
                      {index + 1}
                    </td>

                    <td
                      style={
                        tableCell
                      }
                    >
                      {
                        participant.organization
                      }
                    </td>

                    <td
                      style={
                        tableCell
                      }
                    >
                      {
                        participant.firstName
                      }{" "}
                      {
                        participant.lastName
                      }
                    </td>

                    <td
                      style={
                        tableCell
                      }
                    >
                      {
                        participant.email
                      }
                    </td>

                    <td
                      style={
                        tableCell
                      }
                    >
                      {
                        participant.phone
                      }
                    </td>
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const labelStyle = {
  display: "block",
  marginBottom: "10px",
  color: "#666",
  fontSize: "15px",
};

const inputStyle = {
  width: "100%",
  border: "none",
  borderBottom:
    "2px dotted #999",
  padding: "12px 0",
  fontSize: "18px",
  outline: "none",
  background: "transparent",
};

const tableHeader = {
  textAlign: "left" as const,
  padding: "15px",
  borderBottom:
    "1px solid #ddd",
  fontSize: "16px",
};

const tableCell = {
  padding: "15px",
  borderBottom:
    "1px solid #eee",
};
