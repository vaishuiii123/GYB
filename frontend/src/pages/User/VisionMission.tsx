import UserHeader from "./UserHeader";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function VisionMission() {
    const navigate = useNavigate();
    const [visionText, setVisionText] = useState("");
    const [missionText, setMissionText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchVisionMission();
    }, []);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f5f5f5",
                fontFamily: "Segoe UI",
            }}
        >
            <UserHeader />

            <div
                style={{
                    paddingTop: "110px",
                    paddingLeft: "50px",
                    paddingRight: "50px",
                }}
            >
                <div
                    style={{
                        background: "white",
                        borderRadius: "16px",
                        padding: "40px 60px",
                        minHeight: "450px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                    }}
                >
                    <button
                        onClick={() => navigate("/userdashboard")}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#9B304A",
                            cursor: "pointer",
                            fontSize: "15px",
                            marginBottom: "20px",
                            fontWeight: 600,
                        }}
                    >
                        ← Back to Dashboard
                    </button>

                    <h1
                        style={{
                            color: "#7b0f2c",
                            fontSize: "28px",
                            fontWeight: 700,
                            marginBottom: "30px",
                        }}
                    >
                        Vision & Mission Statement
                    </h1>

                    {loading ? (
                        <p style={{ color: "#555" }}>Loading...</p>
                    ) : (
                        <>
                            <div style={{ marginBottom: "35px" }}>
                                <h2
                                    style={{
                                        color: "#9B304A",
                                        fontSize: "20px",
                                        fontWeight: 600,
                                        marginBottom: "12px",
                                    }}
                                >
                                    Vision
                                </h2>
                                <p
                                    style={{
                                        color: "#374151",
                                        fontSize: "16px",
                                        lineHeight: "1.8",
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {visionText ||
                                        "Vision statement has not been set yet."}
                                </p>
                            </div>

                            <div
                                style={{
                                    width: "100%",
                                    height: "1px",
                                    background: "#d6d6d6",
                                    marginBottom: "35px",
                                }}
                            />

                            <div>
                                <h2
                                    style={{
                                        color: "#9B304A",
                                        fontSize: "20px",
                                        fontWeight: 600,
                                        marginBottom: "12px",
                                    }}
                                >
                                    Mission
                                </h2>
                                <p
                                    style={{
                                        color: "#374151",
                                        fontSize: "16px",
                                        lineHeight: "1.8",
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {missionText ||
                                        "Mission statement has not been set yet."}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div
                    style={{
                        marginTop: "50px",
                        textAlign: "center",
                        color: "#555",
                        fontSize: "13px",
                        fontStyle: "italic",
                    }}
                >
                    Grow Your Business: Organization Development Workshop
                </div>
            </div>
        </div>
    );
}
