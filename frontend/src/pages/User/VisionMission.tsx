import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import { useEffect, useState } from "react";
import {
  Crosshair,
  Eye,
  Plus,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import {
  clearCachedPageData,
  getActiveWorkshopContext,
  getCachedPageData,
  setCachedPageData,
} from "../../utils/workshopCache";
import "../../styles/VisionMission.css";

type DropZone = "vision" | "mission";

const DEFAULT_KEYWORDS = [
  "Integrity",
  "Innovation",
  "Customer Focus",
  "Excellence",
  "Trust",
  "Growth",
  "Leadership",
  "Passion",
  "Commitment",
  "Collaboration",
  "Empowerment",
  "Quality",
  "People First",
  "Value Creation",
  "Purpose",
  "Sustainability",
  "Agility",
  "Creativity",
  "Reliability",
  "Transparency",
  "Accountability",
  "Respect",
  "Diversity",
  "Inclusion",
  "Forward Thinking",
  "Efficiency",
  "Ethics",
  "Service Excellence",
  "Teamwork",
  "Continuous Learning",
  "Adaptability",
  "Market Leadership",
  "Social Responsibility",
  "Profitability",
  "Customer Centricity",
];

function buildKeywordList(savedKeywords: string[], savedText: string) {
  if (savedKeywords.length > 0) {
    return savedKeywords;
  }

  return savedText.trim() ? [savedText.trim()] : [];
}

export default function VisionMission() {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [visionKeywords, setVisionKeywords] = useState<string[]>([]);
  const [missionKeywords, setMissionKeywords] = useState<string[]>([]);
  const [visionInput, setVisionInput] = useState("");
  const [missionInput, setMissionInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [draggingKeyword, setDraggingKeyword] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<DropZone>("vision");
  const [canEdit, setCanEdit] = useState(true);
  const [editMessage, setEditMessage] = useState("");
  const [workshopId, setWorkshopId] = useState("");

  const {
    participant,
    workshop: selectedWorkshop,
    canEdit: initialCanEdit,
    editMessage: initialEditMessage,
  } = getActiveWorkshopContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activeWorkshopId = selectedWorkshop?.id || "";
        setWorkshopId(activeWorkshopId);
        setCanEdit(initialCanEdit);
        setEditMessage(initialEditMessage);
        setErrorMessage("");
        // Clear previous workshop answers immediately while loading.
        setVisionKeywords([]);
        setMissionKeywords([]);

        const cacheKey = `vision-mission:${participant?.id || ""}:${activeWorkshopId}`;
        const cached = getCachedPageData<{
          keywords: string[];
          visionKeywords: string[];
          missionKeywords: string[];
        }>(cacheKey);

        if (cached) {
          setKeywords(
            cached.keywords.length ? cached.keywords : DEFAULT_KEYWORDS
          );
          setVisionKeywords(cached.visionKeywords);
          setMissionKeywords(cached.missionKeywords);
        }

        const responseParams = new URLSearchParams({
          participantId: participant?.id || "",
        });
        if (activeWorkshopId) {
          responseParams.set("workshopId", activeWorkshopId);
        }

        const [keywordsRes, responseRes] = await Promise.all([
          fetch("/api/get-vision-mission"),
          participant?.id
            ? fetch(
                `/api/get-vision-mission-response?${responseParams.toString()}`
              )
            : Promise.resolve(null),
        ]);

        const keywordsData = await keywordsRes.json();
        let nextKeywords = DEFAULT_KEYWORDS;
        let nextVision: string[] = [];
        let nextMission: string[] = [];

        if (keywordsData.success) {
          nextKeywords = keywordsData.data.keywords || DEFAULT_KEYWORDS;
          setKeywords(nextKeywords);
        }

        if (responseRes) {
          const responseData = await responseRes.json();
          if (responseData.success) {
            nextVision = buildKeywordList(
              responseData.data.visionKeywords || [],
              responseData.data.visionText || ""
            );
            nextMission = buildKeywordList(
              responseData.data.missionKeywords || [],
              responseData.data.missionText || ""
            );
            setVisionKeywords(nextVision);
            setMissionKeywords(nextMission);
          }
        }

        if (activeWorkshopId) {
          setCachedPageData(cacheKey, {
            keywords: nextKeywords,
            visionKeywords: nextVision,
            missionKeywords: nextMission,
          });
        }
      } catch (error) {
        console.error("Error fetching vision/mission:", error);
        setErrorMessage("Unable to load Vision & Mission data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    participant?.id,
    selectedWorkshop?.id,
    initialCanEdit,
    initialEditMessage,
  ]);

  const addKeywordToZone = (zone: DropZone, keyword: string) => {
    if (!canEdit) {
      return;
    }

    const trimmed = keyword.trim();
    if (!trimmed) {
      return;
    }

    if (zone === "vision") {
      if (visionKeywords.includes(trimmed)) {
        return;
      }
      setVisionKeywords((prev) => [...prev, trimmed]);
      setVisionInput("");
      return;
    }

    if (missionKeywords.includes(trimmed)) {
      return;
    }
    setMissionKeywords((prev) => [...prev, trimmed]);
    setMissionInput("");
  };

  const removeKeywordFromZone = (zone: DropZone, keyword: string) => {
    if (!canEdit) {
      return;
    }

    if (zone === "vision") {
      setVisionKeywords((prev) => prev.filter((item) => item !== keyword));
      return;
    }

    setMissionKeywords((prev) => prev.filter((item) => item !== keyword));
  };

  const handleDrop = (zone: DropZone, event: React.DragEvent) => {
    event.preventDefault();
    const keyword = event.dataTransfer.getData("text/plain");
    if (keyword) {
      addKeywordToZone(zone, keyword);
    }
    setDraggingKeyword(null);
  };

  const handleInputKeyDown = (
    zone: DropZone,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const value = zone === "vision" ? visionInput : missionInput;
    addKeywordToZone(zone, value);
  };

  const handleSave = async () => {
    if (!canEdit) {
      setErrorMessage(
        editMessage ||
          "The workshop has ended. You can no longer edit Vision & Mission."
      );
      return;
    }

    if (!participant.id) {
      setErrorMessage("Please log in again to save your response.");
      return;
    }

    if (visionKeywords.length === 0 && missionKeywords.length === 0) {
      setErrorMessage("Add at least one item to Vision or Mission.");
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
          workshopId,
          visionKeywords,
          missionKeywords,
          visionText: visionKeywords.join(" "),
          missionText: missionKeywords.join(" "),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.message || "Failed to save Vision & Mission.");
        return;
      }

      clearCachedPageData(
        `vision-mission:${participant?.id || ""}:${selectedWorkshop?.id || ""}`
      );
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
    selectedKeywords: string[],
    inputValue: string,
    onInputChange: (value: string) => void
  ) => {
    const ZoneIcon = zone === "vision" ? Eye : Target;

    return (
      <section
        className={`vm-statement-card ${
          draggingKeyword ? "is-drop-ready" : ""
        }`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(zone, event)}
      >
        <header className="vm-statement-header">
          <span className="vm-statement-icon" aria-hidden>
            <ZoneIcon size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>Drag keywords here, click below, or type your own.</p>
          </div>
        </header>

        <div className="vm-drop-zone">
          <div className="vm-selected-keywords">
            {selectedKeywords.map((keyword) => (
              <div key={keyword} className="vm-chip is-selected">
                <span>{keyword}</span>
                <button
                  type="button"
                  onClick={() => removeKeywordFromZone(zone, keyword)}
                  aria-label={`Remove ${keyword}`}
                  disabled={!canEdit}
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              </div>
            ))}

            <input
              type="text"
              className="vm-drop-input"
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => handleInputKeyDown(zone, event)}
              disabled={!canEdit}
              placeholder={
                selectedKeywords.length === 0
                  ? "Drop keywords here or type and press Enter"
                  : "Type and press Enter"
              }
            />
          </div>
        </div>
      </section>
    );
  };

  return (
    <UserLayout contentClassName="user-layout-main-vision">
      <div className="vm-page">
        <section className="vm-hero">
          <div className="vm-hero-copy">
            <h1>Vision & Mission Statement</h1>
            <p>
              Select keywords that best represent your organization&apos;s
              vision and mission. Drag them into the sections below, click to
              add them, or type your own and press Enter.
            </p>
          </div>
          <div className="vm-hero-art" aria-hidden>
            <span className="vm-hero-art-icon">
              <Crosshair size={42} strokeWidth={1.7} />
            </span>
          </div>
        </section>

        {loading ? (
          <p className="vm-status">Loading...</p>
        ) : (
          <>
            {!canEdit && <WorkshopEditBanner message={editMessage} />}

            <div className={canEdit ? "" : "vm-readonly"}>
              <section className="vm-keyword-bank">
                <div className="vm-keyword-bank-header">
                  <h3>
                    <Sparkles size={18} strokeWidth={2.2} />
                    Suggested Keywords
                  </h3>
                  <div className="vm-zone-toggle">
                    <span>Add clicks to:</span>
                    <button
                      type="button"
                      className={
                        activeZone === "vision"
                          ? "vm-zone-btn is-active"
                          : "vm-zone-btn"
                      }
                      onClick={() => setActiveZone("vision")}
                    >
                      Vision
                    </button>
                    <button
                      type="button"
                      className={
                        activeZone === "mission"
                          ? "vm-zone-btn is-active"
                          : "vm-zone-btn"
                      }
                      onClick={() => setActiveZone("mission")}
                    >
                      Mission
                    </button>
                  </div>
                </div>

                <div className="vm-keyword-grid">
                  {keywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      className="vm-chip is-bank"
                      draggable={canEdit}
                      disabled={!canEdit}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", keyword);
                        setDraggingKeyword(keyword);
                      }}
                      onDragEnd={() => setDraggingKeyword(null)}
                      onClick={() => addKeywordToZone(activeZone, keyword)}
                      title={`Click to add to ${
                        activeZone === "vision" ? "Vision" : "Mission"
                      }. Drag to drop into a section.`}
                    >
                      <Sparkles size={13} strokeWidth={2} />
                      <span>{keyword}</span>
                      <Plus size={14} strokeWidth={2.4} />
                    </button>
                  ))}
                </div>

                <p className="vm-keyword-tip">
                  Click a keyword to add it to the selected section, or drag and
                  drop it into Vision or Mission.
                </p>
              </section>

              <div className="vm-statements">
                {renderDropZone(
                  "vision",
                  "Vision Statement",
                  visionKeywords,
                  visionInput,
                  setVisionInput
                )}

                {renderDropZone(
                  "mission",
                  "Mission Statement",
                  missionKeywords,
                  missionInput,
                  setMissionInput
                )}
              </div>
            </div>

            {errorMessage ? (
              <div className="vm-error">{errorMessage}</div>
            ) : null}
            {message ? <div className="vm-success">{message}</div> : null}

            <div className="vm-actions">
              <button
                type="button"
                className="vm-save-btn"
                onClick={handleSave}
                disabled={saving || !canEdit}
              >
                <Save size={16} strokeWidth={2.2} />
                {saving ? "Saving..." : "Save & Submit"}
              </button>
            </div>
          </>
        )}

        <footer className="vm-footer-banner">
          <div className="vm-footer-copy">
            <span className="vm-footer-icon" aria-hidden>
              <TrendingUp size={20} strokeWidth={2.1} />
            </span>
            <div>
              <strong>Grow Your Business</strong>
              <span>Organization Development Workshop</span>
            </div>
          </div>
          <div className="vm-footer-art" aria-hidden />
        </footer>
      </div>
    </UserLayout>
  );
}
