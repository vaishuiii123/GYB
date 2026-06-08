import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";

type PageProps = {
  user?: any;
};

export default function Participants({ user }: PageProps) {
  const [participants, setParticipants] = useState<any[]>([]);

  const [showParticipantModal, setShowParticipantModal] =
    useState(false);

  const [participantForm, setParticipantForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    password: "",
  });

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

  const handleCreateParticipant = async () => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const response = await fetch(
        "/api/create-participant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: participantForm.firstName,
            middleName: participantForm.middleName,
            lastName: participantForm.lastName,
            email: participantForm.email,
            phoneNo: participantForm.phoneNo,
            password: participantForm.password,
            createdBy: currentUser.email,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Participant created successfully");

        setParticipantForm({
          firstName: "",
          middleName: "",
          lastName: "",
          email: "",
          phoneNo: "",
          password: "",
        });

        setShowParticipantModal(false);

        fetchParticipants();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create participant");
    }
  };

  const [showEditModal, setShowEditModal] =
  useState(false);

  const [editParticipant, setEditParticipant] =
  useState<any>(null);

  //=============================== EDIT PARTICIPANTS ==========================================

  const handleEditParticipant = (participant: any) => {
  setEditParticipant(participant);
  setShowEditModal(true);
};

  const handleDeleteParticipant = async (
  participant: any
) => {
  const confirmDelete = window.confirm(
    `Delete ${participant.firstName} ${participant.lastName}?`
  );

  if (!confirmDelete) return;

  alert(
    "Delete API will be called here"
  );
};
  
  return (
    <>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f3f4f6",
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
              padding: "25px",
              marginTop: "70px",
            }}
          >
            <div style={pageHeader}>
              <h1 style={pageTitle}>Participants</h1>

              <button
                style={saveBtn}
                onClick={() =>
                  setShowParticipantModal(true)
                }
              >
                Create Participant
              </button>
            </div>

            <div style={card}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                  <th style={tableHeader}>First Name</th>
                  <th style={tableHeader}>Middle Name</th>
                  <th style={tableHeader}>Last Name</th>
                  <th style={tableHeader}>Email</th>
                  <th style={tableHeader}>Phone No</th>
                  <th style={tableHeader}>Actions</th>
                </tr>
                </thead>

                <tbody>
                  {participants.map((p, index) => (
                    <tr key={index}>
                      <td style={tableCell}>{p.firstName}</td>
                      <td style={tableCell}>{p.middleName}</td>
                      <td style={tableCell}>{p.lastName}</td>
                      <td style={tableCell}>{p.email}</td>
                      <td style={tableCell}>{p.phoneNo}</td>
                    
                      <td style={tableCell}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            style={editBtn}
                            onClick={() => handleEditParticipant(p)}
                          >
                            ✏ Edit
                          </button>
                    
                          <button
                            style={deleteBtn}
                            onClick={() => handleDeleteParticipant(p)}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showParticipantModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h2>Create Participant</h2>

            <input
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
              placeholder="Phone Number"
              value={participantForm.phoneNo}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  phoneNo: e.target.value,
                })
              }
            />

            <input
              type="password"
              style={inputStyle}
              placeholder="Password"
              value={participantForm.password}
              onChange={(e) =>
                setParticipantForm({
                  ...participantForm,
                  password: e.target.value,
                })
              }
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() =>
                  setShowParticipantModal(false)
                }
              >
                Cancel
              </button>

              <button
                style={saveBtn}
                onClick={handleCreateParticipant}
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

const card = {
  background: "white",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const pageTitle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};

const saveBtn = {
  background: "#3b5bcc",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 16px",
  cursor: "pointer",
};

const tableHeader = {
  padding: "12px",
  textAlign: "left" as const,
  borderBottom: "1px solid #ddd",
};

const tableCell = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};

const modalOverlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalBox = {
  background: "white",
  padding: "25px",
  width: "500px",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

const inputStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  borderRadius: "6px",
};

const editBtn = {
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
};

const deleteBtn = {
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
};
