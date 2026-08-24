import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearSelectedWorkshop,
  getParticipantFromStorage,
  setSelectedWorkshop,
  type SelectedWorkshop,
} from "../../utils/selectedWorkshop";
import { fetchParticipantWorkshops } from "../../utils/workshopCache";
import { pickOngoingWorkshop } from "../../utils/workshopLifecycle";

/**
 * Legacy route: participants no longer pick from a workshop list.
 * Resolve the single assigned ongoing workshop and go to the dashboard.
 */
export default function WorkshopSelection() {
  const navigate = useNavigate();
  const participant = getParticipantFromStorage();
  const [message, setMessage] = useState("Loading your workshop...");

  useEffect(() => {
    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await fetchParticipantWorkshops(
          String(participant.id),
          participant.organizationId || "",
          { forceRefresh: true }
        );

        if (cancelled) {
          return;
        }

        if (!data.success) {
          clearSelectedWorkshop();
          setMessage(
            data.editMessage ||
              "Failed to load workshops. Please try again."
          );
          navigate("/userdashboard", { replace: true });
          return;
        }

        const mapped: SelectedWorkshop[] = (data.workshops || []).map(
          (workshop) => ({
            id: workshop.id,
            workshopName: workshop.workshopName || "Workshop",
            organizationName: workshop.organizationName || "",
            organizationId:
              workshop.organizationId || participant.organizationId,
            templateId: workshop.templateId,
            templateName: workshop.templateName,
            preOdStartDate: workshop.preOdStartDate,
            startDate: workshop.startDate,
            endDate: workshop.endDate,
            preOdQuestionCount: workshop.preOdQuestionCount,
          })
        );

        const ongoing = pickOngoingWorkshop(mapped);

        if (!ongoing) {
          clearSelectedWorkshop();
        } else {
          setSelectedWorkshop(ongoing);
        }

        navigate("/userdashboard", { replace: true });
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          clearSelectedWorkshop();
          setMessage("Failed to load workshops.");
          navigate("/userdashboard", { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, participant.id, participant.organizationId]);

  return (
    <div
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        color: "#5b6472",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <p>{message}</p>
    </div>
  );
}
