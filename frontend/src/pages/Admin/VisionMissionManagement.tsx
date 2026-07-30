import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/VisionMission.css";
import { useEffect, useState } from "react";

type PageProps = {
    user?: any;
};

export default function VisionMissionManagement({ user }: PageProps) {
    const [visionText, setVisionText] = useState("");
    const [missionText, setMissionText] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchVisionMission = async () => {
        try {
            const response = await fetch("/api/get-vision-mission");
            const result = await response.json();
            if (result.success) {
                setVisionText(result.data.visionText || "");
                setMissionText(result.data.missionText || "");
            }
        } catch (error) {
            console.error("Error fetching vision/mission:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisionMission();
    }, []);

    const handleSave = async () => {
        if (!visionText.trim() && !missionText.trim()) {
            alert("Please enter Vision or Mission text.");
            return;
        }

        try {
            const response = await fetch("/api/update-vision-mission", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    visionText,
                    missionText,
                    modifiedBy: user?.name || "Admin",
                }),
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        }
    };

    return (
        <div className="vision-page">
            <Sidebar />

            <div className="vision-content">
                <Header user={user} />

                <div className="vision-body">
                    <div className="breadcrumb">Vision & Mission Statement</div>

                    <div className="page-header">
                        <h1 className="page-title">
                            Vision & Mission Statement
                        </h1>
                    </div>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="vision-card">
                            <div className="form-group">
                                <label>Vision Statement</label>
                                <textarea
                                    value={visionText}
                                    onChange={(e) =>
                                        setVisionText(e.target.value)
                                    }
                                    placeholder="Enter the organization's vision statement"
                                    rows={6}
                                />
                            </div>

                            <div className="form-group">
                                <label>Mission Statement</label>
                                <textarea
                                    value={missionText}
                                    onChange={(e) =>
                                        setMissionText(e.target.value)
                                    }
                                    placeholder="Enter the organization's mission statement"
                                    rows={6}
                                />
                            </div>

                            <div className="vision-actions">
                                <button
                                    className="save-btn"
                                    onClick={handleSave}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
