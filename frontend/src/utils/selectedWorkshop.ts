const SELECTED_WORKSHOP_KEY = "gyb-selected-workshop";

export type SelectedWorkshop = {
  id: string;
  workshopName: string;
  organizationName?: string;
  organizationId?: string;
  templateId?: string;
  templateName?: string;
  startDate?: string;
  endDate?: string;
  preOdQuestionCount?: number;
};

export function getSelectedWorkshop(): SelectedWorkshop | null {
  try {
    const raw = localStorage.getItem(SELECTED_WORKSHOP_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SelectedWorkshop;
    if (!parsed?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setSelectedWorkshop(workshop: SelectedWorkshop) {
  localStorage.setItem(SELECTED_WORKSHOP_KEY, JSON.stringify(workshop));
}

export function clearSelectedWorkshop() {
  localStorage.removeItem(SELECTED_WORKSHOP_KEY);
}

export function getParticipantFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("participant") || "{}");
  } catch {
    return {};
  }
}

export function getParticipantDisplayName(participant: Record<string, unknown>) {
  const firstName = String(
    participant.firstName || participant.First_Name || ""
  ).trim();
  const lastName = String(
    participant.lastName || participant.Last_Name || ""
  ).trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || String(participant.email || "Participant");
}
