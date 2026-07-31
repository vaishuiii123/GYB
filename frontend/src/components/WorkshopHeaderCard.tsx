import { FileText } from "lucide-react";

type WorkshopHeaderCardProps = {
  organizationName?: string;
  workshopName?: string;
};

export default function WorkshopHeaderCard({
  organizationName,
  workshopName,
}: WorkshopHeaderCardProps) {
  if (!organizationName && !workshopName) {
    return null;
  }

  return (
    <div className="user-header-workshop-card">
      <span className="user-header-workshop-icon">
        <FileText size={20} strokeWidth={2} />
      </span>
      <div className="user-header-workshop-text">
        {organizationName && (
          <span className="user-header-workshop-org">{organizationName}</span>
        )}
        <strong>{workshopName || "Workshop"}</strong>
      </div>
    </div>
  );
}
