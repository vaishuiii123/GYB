import { Info } from "lucide-react";
import "../styles/WorkshopEditBanner.css";

type WorkshopEditBannerProps = {
  message?: string;
};

export default function WorkshopEditBanner({
  message = "The workshop has ended. You can view your responses but can no longer edit them.",
}: WorkshopEditBannerProps) {
  return (
    <div className="workshop-edit-banner" role="status">
      <Info size={18} strokeWidth={2} />
      <span>{message}</span>
    </div>
  );
}
