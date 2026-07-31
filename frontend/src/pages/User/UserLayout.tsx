import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "./UserHeader";
import {
  getParticipantFromStorage,
  getSelectedWorkshop,
} from "../../utils/selectedWorkshop";
import "../../styles/UserHeader.css";
import "../../styles/UserLayout.css";

type UserLayoutProps = {
  children: React.ReactNode;
  contentClassName?: string;
};

export default function UserLayout({
  children,
  contentClassName = "",
}: UserLayoutProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const participant = getParticipantFromStorage();

    if (!participant?.id) {
      navigate("/", { replace: true });
      return;
    }

    if (!getSelectedWorkshop()?.id) {
      navigate("/select-workshop", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="user-layout">
      <UserHeader />

      <main className={`user-layout-main ${contentClassName}`.trim()}>
        {children}
      </main>
    </div>
  );
}
