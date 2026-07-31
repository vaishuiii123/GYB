import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import UserNavDrawer from "./UserNavDrawer";
import WorkshopHeaderCard from "../../components/WorkshopHeaderCard";
import { fetchWorkshopByOrganization } from "../../utils/workshopCache";
import {
  clearSelectedWorkshop,
  getParticipantDisplayName,
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/UserHeader.css";

export default function UserHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [workshopName, setWorkshopName] = useState("");

  const participant = getParticipantFromStorage();
  const participantName = getParticipantDisplayName(participant);
  const selectedWorkshop = getSelectedWorkshop();

  useEffect(() => {
    if (selectedWorkshop) {
      setOrganizationName(
        selectedWorkshop.organizationName ||
          participant.organization ||
          participant.Organization ||
          ""
      );
      setWorkshopName(selectedWorkshop.workshopName || "");
    }

    const loadWorkshop = async () => {
      if (!participant.organizationId) {
        return;
      }

      try {
        const workshopData = await fetchWorkshopByOrganization(
          participant.organizationId
        );

        if (workshopData.success && workshopData.workshop) {
          setOrganizationName(
            workshopData.workshop.organizationName ||
              participant.organization ||
              participant.Organization ||
              ""
          );
          setWorkshopName(workshopData.workshop.workshopName || "");
        }
      } catch {
        // keep selected workshop labels if API fails
      }
    };

    loadWorkshop();
  }, [
    participant.organizationId,
    participant.organization,
    participant.Organization,
    selectedWorkshop?.id,
    selectedWorkshop?.workshopName,
    selectedWorkshop?.organizationName,
  ]);

  const handleLogout = () => {
    if (window.confirm("Do you really want to logout?")) {
      clearSelectedWorkshop();
      localStorage.removeItem("participant");
      navigate("/");
    }
  };

  return (
    <>
      <header className="user-header">
        <div className="user-header-top">
          <div className="user-header-left">
            <button
              type="button"
              className="user-header-menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={2} />
            </button>

            <span className="user-header-participant-name">
              {participantName}
            </span>

            <WorkshopHeaderCard
              organizationName={organizationName}
              workshopName={workshopName}
            />
          </div>

          <div className="user-header-right">
            <button
              type="button"
              className="user-header-link"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              type="button"
              className="user-header-link"
              onClick={() => navigate("/userdashboard")}
            >
              Home
            </button>
          </div>
        </div>
      </header>

      <UserNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
