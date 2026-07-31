import UserHeader from "./UserHeader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/VisionMission.css";

type DropZone = "vision" | "mission";

export default function VisionMission() {
    const navigate = useNavigate();
    const [keywords, setKeywords] = useState<string[]>([]);
    const [visionKeywords, setVisionKeywords] = useState<string[]>([]);
    const [missionKeywords, setMissionKeywords] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [draggingKeyword, setDraggingKeyword] = useState<string | null>(
        null
    );
    const [activeZone, setActiveZone] = useState<DropZone>("vision");

    const participant = (() => {
        try {
            return JSON.parse(localStorage.getItem("participant") || "{}");
        } catch {
            return {};
        }
    })();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [keywordsRes, responseRes] = await Promise.all([
                    fetch("/api/get-vision-mission"),
                    participant.id
                        ? fetch(
                              `/api/get-vision-mission-response?participantId=${participant.id}`
                          )
                        : Promise.resolve(null),
                ]);

                const keywordsData = await keywordsRes.json();
                if (keywordsData.success) {
                    setKeywords(keywordsData.data.keywords || []);
                }

                if (responseRes) {
                    const responseData = await responseRes.json();
                    if (responseData.success) {
                        setVisionKeywords(
                            responseData.data.visionKeywords || []
                        );
                        setMissionKeywords(
                            responseData.data.missionKeywords || []
                        );
                    }
                }
            } catch (error) {
                console.error("Error fetching vision/mission:", error);
                setErrorMessage("Unable to load Vision & Mission data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [participant.id]);

    const addKeywordToZone = (zone: DropZone, keyword: string) => {
        if (zone === "vision") {
            if (visionKeywords.includes(keyword)) {
                return;
            }
            setVisionKeywords((prev) => [...prev, keyword]);
            return;
        }

        if (missionKeywords.includes(keyword)) {
            return;
        }
        setMissionKeywords((prev) => [...prev, keyword]);
    };

    const removeKeywordFromZone = (zone: DropZone, keyword: string) => {
        if (zone === "vision") {
            setVisionKeywords((prev) =>
                prev.filter((item) => item !== keyword)
            );
            return;
        }

        setMissionKeywords((prev) =>
            prev.filter((item) => item !== keyword)
        );
    };

    const handleDrop = (zone: DropZone, event: React.DragEvent) => {
        event.preventDefault();
        const keyword = event.dataTransfer.getData("text/plain");
        if (keyword) {
            addKeywordToZone(zone, keyword);
        }
        setDraggingKeyword(null);
    };

    const handleSave = async () => {
        if (!participant.id) {
            setErrorMessage("Please log in again to save your response.");
            return;
        }

        try {
            setSaving(true);
            setErrorMessage("");
            setMessage("");

            const response = await fetch("/api/save-vision-mission-response", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    participantId: participant.id,
                    organizationId: participant.organizationId || "",
                    visionKeywords,
                    missionKeywords,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setErrorMessage(
                    result.message || "Failed to save Vision & Mission."
                );
                return;
            }

            setMessage("Vision & Mission saved successfully.");
        } catch (error) {
            console.error(error);
            setErrorMessage("Something went wrong while saving.");
        } finally {
            setSaving(false);
        }
    };

    const renderDropZone = (
        zone: DropZone,
        title: string,
        selectedKeywords: string[]
    ) => (
        <div className="statement-section">
            <h2>{title}</h2>
            <p className="statement-help">
                Drag keywords here or click a keyword below to add them.
            </p>

            <div
                className={`drop-zone ${draggingKeyword ? "drop-zone-active" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(zone, event)}
            >
                {selectedKeywords.length === 0 ? (
                    <span className="drop-zone-placeholder">
                        Drop keywords here
                    </span>
                ) : (
                    <div className="selected-keywords">
                        {selectedKeywords.map((keyword) => (
                            <div key={keyword} className="keyword-chip selected">
                                <span>{keyword}</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        removeKeywordFromZone(zone, keyword)
                                    }
                                    aria-label={`Remove ${keyword}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="user-vision-page">
            <UserHeader />

            <div className="user-vision-content">
                <div className="user-vision-card">
                    <button
                        type="button"
                        className="back-link"
                        onClick={() => navigate("/userdashboard")}
                    >
                        ← Back to Dashboard
                    </button>

                    <h1>Vision & Mission Statement</h1>
                    <p className="page-intro">
                        Select keywords that best represent your organization&apos;s
                        vision and mission. Drag them into the sections below or
                        click to add them.
                    </p>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <>
                            <div className="keyword-bank">
                                <div className="keyword-bank-header">
                                    <h3>Suggested Keywords</h3>
                                    <div className="zone-toggle">
                                        <span>Add clicks to:</span>
                                        <button
                                            type="button"
                                            className={
                                                activeZone === "vision"
                                                    ? "zone-btn active"
                                                    : "zone-btn"
                                            }
                                            onClick={() => setActiveZone("vision")}
                                        >
                                            Vision
                                        </button>
                                        <button
                                            type="button"
                                            className={
                                                activeZone === "mission"
                                                    ? "zone-btn active"
                                                    : "zone-btn"
                                            }
                                            onClick={() => setActiveZone("mission")}
                                        >
                                            Mission
                                        </button>
                                    </div>
                                </div>
                                <div className="keyword-grid">
                                    {keywords.map((keyword) => (
                                        <button
                                            key={keyword}
                                            type="button"
                                            className="keyword-chip bank"
                                            draggable
                                            onDragStart={(event) => {
                                                event.dataTransfer.setData(
                                                    "text/plain",
                                                    keyword
                                                );
                                                setDraggingKeyword(keyword);
                                            }}
                                            onDragEnd={() =>
                                                setDraggingKeyword(null)
                                            }
                                            onClick={() =>
                                                addKeywordToZone(
                                                    activeZone,
                                                    keyword
                                                )
                                            }
                                            title={`Click to add to ${activeZone === "vision" ? "Vision" : "Mission"}. Drag to drop into a section.`}
                                        >
                                            {keyword}
                                        </button>
                                    ))}
                                </div>
                                <p className="keyword-tip">
                                    Click a keyword to add it to the selected
                                    section, or drag and drop it into Vision or
                                    Mission.
                                </p>
                            </div>

                            {renderDropZone(
                                "vision",
                                "Vision Statement",
                                visionKeywords
                            )}

                            {renderDropZone(
                                "mission",
                                "Mission Statement",
                                missionKeywords
                            )}

                            {errorMessage && (
                                <div className="vision-error">{errorMessage}</div>
                            )}

                            {message && (
                                <div className="vision-success">{message}</div>
                            )}

                            <div className="vision-actions user-actions">
                                <button
                                    type="button"
                                    className="save-btn"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save & Submit"}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="user-vision-footer">
                    Grow Your Business: Organization Development Workshop
                </div>
            </div>
        </div>
    );
}
