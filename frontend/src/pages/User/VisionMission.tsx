import UserLayout from "./UserLayout";
import WorkshopEditBanner from "../../components/WorkshopEditBanner";
import { useEffect, useState } from "react";
import {
  fetchWorkshopByOrganization,
  getWorkshopEditStatus,
} from "../../utils/workshopCache";
import "../../styles/VisionMission.css";

type DropZone = "vision" | "mission";

function buildKeywordList(savedKeywords: string[], savedText: string) {
  if (savedKeywords.length > 0) {
    return savedKeywords;
  }

  return savedText.trim() ? [savedText.trim()] : [];
}

export default function VisionMission() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [visionKeywords, setVisionKeywords] = useState<string[]>([]);
  const [missionKeywords, setMissionKeywords] = useState<string[]>([]);
  const [visionInput, setVisionInput] = useState("");
  const [missionInput, setMissionInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [draggingKeyword, setDraggingKeyword] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<DropZone>("vision");
  const [canEdit, setCanEdit] = useState(true);
  const [editMessage, setEditMessage] = useState("");
  const [workshopId, setWorkshopId] = useState("");

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
        const requests: Promise<unknown>[] = [fetch("/api/get-vision-mission")];

        if (participant.organizationId) {
          requests.push(fetchWorkshopByOrganization(participant.organizationId));
        }

        if (participant.id) {
          requests.push(
            fetch(
              `/api/get-vision-mission-response?participantId=${participant.id}`
            )
          );
        }

        const results = await Promise.all(requests);
        const keywordsRes = results[0] as Response;
        let resultIndex = 1;

        if (participant.organizationId) {
          const workshopData = results[resultIndex] as Awaited<
            ReturnType<typeof fetchWorkshopByOrganization>
          >;
          resultIndex += 1;

          if (workshopData.success && workshopData.workshop) {
            setWorkshopId(workshopData.workshop.id || "");
          }

          const editStatus =
            typeof workshopData.canEdit === "boolean"
              ? {
                  canEdit: workshopData.canEdit,
                  editMessage: workshopData.editMessage || "",
                }
              : getWorkshopEditStatus(workshopData.workshop);

          setCanEdit(editStatus.canEdit);
          setEditMessage(editStatus.editMessage);
        }

        const keywordsData = await keywordsRes.json();
        if (keywordsData.success) {
          setKeywords(keywordsData.data.keywords || []);
        }

        if (participant.id) {
          const responseRes = results[resultIndex] as Response;
          const responseData = await responseRes.json();
          if (responseData.success) {
            setVisionKeywords(
              buildKeywordList(
                responseData.data.visionKeywords || [],
                responseData.data.visionText || ""
              )
            );
            setMissionKeywords(
              buildKeywordList(
                responseData.data.missionKeywords || [],
                responseData.data.missionText || ""
              )
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
  }, [participant.id, participant.organizationId]);

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
  ) => (
    <div className="statement-section">
      <h2>{title}</h2>
      <p className="statement-help">
        Drag keywords here, click a keyword below, or type and press Enter to
        add.
      </p>

      <div
        className={`drop-zone ${draggingKeyword ? "drop-zone-active" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(zone, event)}
      >
        <div className="selected-keywords">
          {selectedKeywords.map((keyword) => (
            <div key={keyword} className="keyword-chip selected">
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => removeKeywordFromZone(zone, keyword)}
                aria-label={`Remove ${keyword}`}
                disabled={!canEdit}
              >
                ×
              </button>
            </div>
          ))}

          <input
            type="text"
            className="drop-zone-input"
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
    </div>
  );

  return (
    <UserLayout contentClassName="user-layout-main-vision">
      <div className="user-vision-card">
          <h1>Vision & Mission Statement</h1>
          <p className="page-intro">
            Select keywords that best represent your organization&apos;s vision
            and mission. Drag them into the sections below, click to add them,
            or type your own and press Enter.
          </p>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              {!canEdit && <WorkshopEditBanner message={editMessage} />}

              <div className={canEdit ? "" : "readonly-panel"}>
              <div className="keyword-bank">
                <div className="keyword-bank-header">
                  <h3>Suggested Keywords</h3>
                  <div className="zone-toggle">
                    <span>Add clicks to:</span>
                    <button
                      type="button"
                      className={
                        activeZone === "vision" ? "zone-btn active" : "zone-btn"
                      }
                      onClick={() => setActiveZone("vision")}
                    >
                      Vision
                    </button>
                    <button
                      type="button"
                      className={
                        activeZone === "mission" ? "zone-btn active" : "zone-btn"
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
                        event.dataTransfer.setData("text/plain", keyword);
                        setDraggingKeyword(keyword);
                      }}
                      onDragEnd={() => setDraggingKeyword(null)}
                      onClick={() => addKeywordToZone(activeZone, keyword)}
                      title={`Click to add to ${activeZone === "vision" ? "Vision" : "Mission"}. Drag to drop into a section.`}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
                <p className="keyword-tip">
                  Click a keyword to add it to the selected section, or drag and
                  drop it into Vision or Mission.
                </p>
              </div>

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

              {errorMessage && (
                <div className="vision-error">{errorMessage}</div>
              )}

              {message && <div className="vision-success">{message}</div>}

              <div className="vision-actions user-actions">
                <button
                  type="button"
                  className="user-btn-primary save-btn"
                  onClick={handleSave}
                  disabled={saving || !canEdit}
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
    </UserLayout>
  );
}
