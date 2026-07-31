import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/VisionMission.css";
import { useEffect, useState } from "react";

type PageProps = {
    user?: any;
};

export default function VisionMissionManagement({ user }: PageProps) {
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchVisionMission = async () => {
        try {
            const response = await fetch("/api/get-vision-mission");
            const result = await response.json();
            if (result.success) {
                setKeywords(result.data.keywords || []);
            }
        } catch (error) {
            console.error("Error fetching vision/mission keywords:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisionMission();
    }, []);

    const handleAddKeyword = () => {
        const trimmed = newKeyword.trim();
        if (!trimmed) {
            return;
        }

        if (
            keywords.some(
                (keyword) => keyword.toLowerCase() === trimmed.toLowerCase()
            )
        ) {
            alert("This keyword already exists.");
            return;
        }

        setKeywords((prev) => [...prev, trimmed]);
        setNewKeyword("");
    };

    const handleRemoveKeyword = (keyword: string) => {
        setKeywords((prev) => prev.filter((item) => item !== keyword));
    };

    const handleSave = async () => {
        if (keywords.length === 0) {
            alert("Please add at least one keyword.");
            return;
        }

        try {
            setSaving(true);

            const response = await fetch("/api/update-vision-mission", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keywords,
                    modifiedBy: user?.name || "Admin",
                }),
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
            } else {
                alert(result.message || "Failed to save keywords.");
            }
        } catch (error) {
            console.error(error);
            alert("Something went wrong");
        } finally {
            setSaving(false);
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
                            Vision & Mission Keywords
                        </h1>
                    </div>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="vision-card">
                            <p className="vision-help-text">
                                Manage the suggested keywords that participants
                                can drag and drop into their Vision and Mission
                                statements during the pre-organization workshop.
                            </p>

                            <div className="keyword-input-row">
                                <input
                                    type="text"
                                    value={newKeyword}
                                    onChange={(e) =>
                                        setNewKeyword(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleAddKeyword();
                                        }
                                    }}
                                    placeholder="Add a new keyword"
                                />
                                <button
                                    type="button"
                                    className="add-keyword-btn"
                                    onClick={handleAddKeyword}
                                >
                                    Add Keyword
                                </button>
                            </div>

                            <div className="keyword-count">
                                {keywords.length} keyword
                                {keywords.length === 1 ? "" : "s"} configured
                            </div>

                            <div className="keyword-grid">
                                {keywords.map((keyword) => (
                                    <div
                                        key={keyword}
                                        className="keyword-chip admin-chip"
                                    >
                                        <span>{keyword}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveKeyword(keyword)
                                            }
                                            aria-label={`Remove ${keyword}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="vision-actions">
                                <button
                                    className="save-btn"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save Keywords"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
