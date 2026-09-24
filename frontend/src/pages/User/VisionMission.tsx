import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  getWorkshopModuleAccessStatus,
  setCachedPageData,
} from "../../utils/workshopCache";
import { fetchOnce } from "../../utils/adminListCache";
import { useRegisterUnsavedGuard } from "../../utils/unsavedChanges";
import "../../styles/VisionMission.css";

type DropZone = "vision" | "mission";

function snapshotKeywords(vision: string[], mission: string[]) {
  return JSON.stringify({ vision, mission });
}

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
  const navigate = useNavigate();
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

  const [dragSource, setDragSource] = useState<"bank" | DropZone | null>(null);
  const [editingChip, setEditingChip] = useState<{
    zone: DropZone;
    index: number;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const savedSnapshotRef = useRef(snapshotKeywords([], []));

  const {
    participant,
    workshop: selectedWorkshop,
    canEdit: initialCanEdit,
    editMessage: initialEditMessage,
  } = getActiveWorkshopContext();

  const isDirty = useMemo(() => {
    if (!canEdit || loading) {
      return false;
    }
    return (
      snapshotKeywords(visionKeywords, missionKeywords) !==
      savedSnapshotRef.current
    );
  }, [canEdit, loading, visionKeywords, missionKeywords]);

  const handleSave = async () => {
    if (!canEdit) {
      setErrorMessage(
        editMessage ||
          "The workshop has ended. You can no longer edit Vision & Mission."
      );
      return false;
    }

    if (!participant.id) {
      setErrorMessage("Please log in again to save your response.");
      return false;
    }

    if (visionKeywords.length === 0 && missionKeywords.length === 0) {
      setErrorMessage("Add at least one item to Vision or Mission.");
      return false;
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
        return false;
      }

      clearCachedPageData(
        `vision-mission:${participant?.id || ""}:${selectedWorkshop?.id || ""}`
      );
      savedSnapshotRef.current = snapshotKeywords(
        visionKeywords,
        missionKeywords
      );
      setMessage("Vision & Mission saved successfully.");
      return true;
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went wrong while saving.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useRegisterUnsavedGuard(isDirty, handleSave);

  useEffect(() => {
    if (!getWorkshopModuleAccessStatus(selectedWorkshop).enabled) {
      navigate("/userdashboard", { replace: true });
    }
  }, [navigate, selectedWorkshop]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activeWorkshopId = selectedWorkshop?.id || "";
        const participantId = String(participant?.id || "").trim();
        setWorkshopId(activeWorkshopId);
        setCanEdit(initialCanEdit);
        setEditMessage(initialEditMessage);
        setErrorMessage("");
        setMessage("");

        if (!participantId || !activeWorkshopId) {
          setKeywords(DEFAULT_KEYWORDS);
          setVisionKeywords([]);
          setMissionKeywords([]);
          setVisionInput("");
          setMissionInput("");
          return;
        }

        const pageCacheKey = `vision-mission:${participantId}:${activeWorkshopId}`;
        const cached = getCachedPageData<{
          participantId: string;
          workshopId: string;
          keywords: string[];
          visionKeywords: string[];
          missionKeywords: string[];
        }>(pageCacheKey);

        if (
          cached &&
          cached.participantId === participantId &&
          cached.workshopId === activeWorkshopId
        ) {
          setKeywords(cached.keywords?.length ? cached.keywords : DEFAULT_KEYWORDS);
          setVisionKeywords(cached.visionKeywords || []);
          setMissionKeywords(cached.missionKeywords || []);
        } else {
          setVisionKeywords([]);
          setMissionKeywords([]);
          setVisionInput("");
          setMissionInput("");
        }

        const responseUrl = `/api/get-vision-mission-response?${new URLSearchParams({
          participantId,
          workshopId: activeWorkshopId,
        }).toString()}`;

        const [keywordsRes, responseRes] = await Promise.all([
          fetchOnce("/api/get-vision-mission"),
          fetchOnce(responseUrl),
        ]);

        const keywordsData = await keywordsRes.json();
        let nextKeywords = DEFAULT_KEYWORDS;
        let nextVision: string[] = [];
        let nextMission: string[] = [];

        if (keywordsData.success) {
          nextKeywords = keywordsData.data.keywords || DEFAULT_KEYWORDS;
          setKeywords(nextKeywords);
        }

        const responseData = await responseRes.json();
        if (responseData.success) {
          const responseParticipantId = String(
            responseData.data?.participantId || ""
          ).trim();

          // Never apply a payload that belongs to a different participant.
          if (
            !responseParticipantId ||
            responseParticipantId === participantId
          ) {
            nextVision = buildKeywordList(
              responseData.data.visionKeywords || [],
              responseData.data.visionText || ""
            );
            nextMission = buildKeywordList(
              responseData.data.missionKeywords || [],
              responseData.data.missionText || ""
            );
          }
        }

        setVisionKeywords(nextVision);
        setMissionKeywords(nextMission);
        savedSnapshotRef.current = snapshotKeywords(nextVision, nextMission);

        setCachedPageData(pageCacheKey, {
          participantId,
          workshopId: activeWorkshopId,
          keywords: nextKeywords,
          visionKeywords: nextVision,
          missionKeywords: nextMission,
        });
      } catch (error) {
        console.error("Error fetching vision/mission:", error);
        setVisionKeywords([]);
        setMissionKeywords([]);
        savedSnapshotRef.current = snapshotKeywords([], []);
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

  const startEditingKeyword = (
    zone: DropZone,
    index: number,
    keyword: string
  ) => {
    if (!canEdit) {
      return;
    }
    setActiveZone(zone);
    setEditingChip({ zone, index });
    setEditingValue(keyword);
  };

  const commitEditingKeyword = () => {
    if (!editingChip || !canEdit) {
      setEditingChip(null);
      setEditingValue("");
      return;
    }

    const { zone, index } = editingChip;
    const trimmed = editingValue.trim();
    const setter = zone === "vision" ? setVisionKeywords : setMissionKeywords;

    setter((prev) => {
      if (index < 0 || index >= prev.length) {
        return prev;
      }
      if (!trimmed) {
        return prev.filter((_, itemIndex) => itemIndex !== index);
      }
      const duplicate = prev.some(
        (item, itemIndex) =>
          itemIndex !== index && item.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        return prev;
      }
      const next = [...prev];
      next[index] = trimmed;
      return next;
    });

    setEditingChip(null);
    setEditingValue("");
  };

  const cancelEditingKeyword = () => {
    setEditingChip(null);
    setEditingValue("");
  };

  const handleDrop = (zone: DropZone, event: React.DragEvent) => {
    event.preventDefault();
    if (!canEdit) {
      return;
    }
  
    const keyword = event.dataTransfer.getData("text/plain").trim();
    if (!keyword) {
      setDraggingKeyword(null);
      setDragSource(null);
      return;
    }
  
    // Add to target zone (Vision or Mission)
    addKeywordToZone(zone, keyword);
  
    // If dragged from the other box, remove from source (move)
    if (dragSource === "vision" && zone === "mission") {
      setVisionKeywords((prev) => prev.filter((item) => item !== keyword));
    }
    if (dragSource === "mission" && zone === "vision") {
      setMissionKeywords((prev) => prev.filter((item) => item !== keyword));
    }
  
    setDraggingKeyword(null);
    setDragSource(null);
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

  const renderDropZone = (
    zone: DropZone,
    title: string,
    selectedKeywords: string[],
    inputValue: string,
    onInputChange: (value: string) => void
  ) => {
    const ZoneIcon = zone === "vision" ? Eye : Target;
    const isActive = activeZone === zone;

    return (
      <section
        className={`vm-statement-card ${
          draggingKeyword ? "is-drop-ready" : ""
        } ${isActive ? "is-active" : ""}`}
        onClick={() => setActiveZone(zone)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(zone, event)}
      >
        <header className="vm-statement-header">
          <span className="vm-statement-icon" aria-hidden>
            <ZoneIcon size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h2>{title}</h2>
            <p className="vm-statement-hint">
              {isActive
                ? "Selected — click a keyword to add it here."
                : "Click here to select, then choose keywords."}
            </p>
          </div>
        </header>

        <div className="vm-drop-zone">
          <div className="vm-selected-keywords">
          {selectedKeywords.map((keyword, index) => {
            const isEditing =
              editingChip?.zone === zone && editingChip.index === index;

            return (
            <div
              key={`${zone}-${index}-${keyword}`}
              className={`vm-chip is-selected ${
                draggingKeyword === keyword && !isEditing ? "is-dragging" : ""
              } ${isEditing ? "is-editing" : ""}`}
              draggable={canEdit && !isEditing}
              onDragStart={(event) => {
                if (!canEdit || isEditing) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.setData("text/plain", keyword);
                event.dataTransfer.effectAllowed = "move";
                setDraggingKeyword(keyword);
                setDragSource(zone);
              }}
              onDragEnd={() => {
                setDraggingKeyword(null);
                setDragSource(null);
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="vm-chip-edit-input"
                  value={editingValue}
                  autoFocus
                  onChange={(event) => setEditingValue(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={commitEditingKeyword}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitEditingKeyword();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEditingKeyword();
                    }
                  }}
                  aria-label={`Edit ${keyword}`}
                />
              ) : (
                <button
                  type="button"
                  className="vm-chip-label"
                  disabled={!canEdit}
                  onClick={(event) => {
                    event.stopPropagation();
                    startEditingKeyword(zone, index, keyword);
                  }}
                  title={canEdit ? "Click to edit" : keyword}
                >
                  {keyword}
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (isEditing) {
                    cancelEditingKeyword();
                  }
                  removeKeywordFromZone(zone, keyword);
                }}
                aria-label={`Remove ${keyword}`}
                disabled={!canEdit}
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
            );
          })}

            <input
              type="text"
              className="vm-drop-input"
              value={inputValue}
              onFocus={() => setActiveZone(zone)}
              onClick={() => setActiveZone(zone)}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => handleInputKeyDown(zone, event)}
              disabled={!canEdit}
              placeholder={
                selectedKeywords.length === 0
                  ? "Click here, then pick keywords — or type and press Enter"
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
              vision and mission. Click a Vision or Mission box, then click
              keywords to add them — or drag them in, or type your own and press
              Enter.
            </p>
          </div>
          
        </section>

        {loading ? (
          <p className="vm-status">Loading...</p>
        ) : (
          <>
            {!canEdit && <WorkshopEditBanner message={editMessage} />}

            <div className={canEdit ? "vm-content" : "vm-content vm-readonly"}>
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

              <section className="vm-keyword-bank">
                <div className="vm-keyword-bank-header">
                  <h3>
                    <Sparkles size={18} strokeWidth={2.2} />
                    Suggested Keywords
                  </h3>
                  <p className="vm-active-target">
                    Adding to:{" "}
                    <strong>
                      {activeZone === "vision" ? "Vision" : "Mission"}
                    </strong>
                  </p>
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
                        setDragSource("bank");
                      }}
                      onDragEnd={() => {
                        setDraggingKeyword(null);
                        setDragSource(null);
                      }}
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
                  Click a Vision or Mission box to select it, then click a
                  keyword to add it there. You can also drag and drop.
                </p>
              </section>
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
      </div>
    </UserLayout>
  );
}
