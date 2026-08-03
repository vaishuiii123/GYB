import * as XLSX from "xlsx";

type PreOdQuestion = {
  srNo: number;
  category?: string;
  question: string;
};

type ParticipantResponse = {
  participantId: string;
  participantName: string;
  preOd: { answers: Record<string, string>; submittedDate?: string } | null;
  odChart: { answers: Record<string, string>; submittedDate?: string } | null;
  visionMission: {
    visionText: string;
    missionText: string;
    visionKeywords: string[];
    missionKeywords: string[];
    submittedDate?: string;
  } | null;
  actionables: Array<{
    id: string;
    categoryName: string;
    categoryPath?: string;
    description: string;
    timeline: string;
    responsiblePersons: string;
    comments: string;
  }>;
};

type FeedbackQuestion = {
  id: string;
  label: string;
};

type FeedbackSubmission = {
  participantId: string;
  participantName: string;
  answers: Record<string, string>;
  submittedDate?: string;
};

export type WorkshopExportInput = {
  workshopName: string;
  organizationName: string;
  participants: ParticipantResponse[];
  preOdQuestions: PreOdQuestion[];
  questionLabels: Record<string, string>;
  feedbackQuestions: FeedbackQuestion[];
  feedbackSubmissions: FeedbackSubmission[];
  participantNameById?: Record<string, string>;
};

function isLikelyId(value: string) {
  return /^\d{10,}$/.test(String(value || "").trim());
}

function displayParticipantName(
  name: string,
  participantId?: string,
  nameById?: Record<string, string>
) {
  const fromMap = String(
    (participantId && nameById?.[participantId]) || ""
  ).trim();
  if (fromMap && !isLikelyId(fromMap)) {
    return fromMap;
  }

  const trimmed = String(name || "").trim();
  if (
    trimmed &&
    trimmed.toLowerCase() !== "participant" &&
    trimmed.toLowerCase() !== "unknown" &&
    !isLikelyId(trimmed)
  ) {
    return trimmed;
  }

  return fromMap || "";
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*[\]]/g, " ").slice(0, 31);
}

function addSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: Record<string, string | number>[]
) {
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([["No responses available"]]);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    worksheet["!cols"] = headers.map((header) => ({
      wch: Math.min(
        60,
        Math.max(
          header.length + 2,
          ...rows.map((row) => String(row[header] ?? "").length + 2)
        )
      ),
    }));
  }

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(sheetName)
  );
}

function participantLabel(
  input: WorkshopExportInput,
  participantId: string,
  participantName?: string
) {
  return (
    displayParticipantName(
      participantName || "",
      participantId,
      input.participantNameById
    ) || "Unknown"
  );
}

function buildPreOdRows(input: WorkshopExportInput) {
  const rows: Record<string, string | number>[] = [];

  input.participants.forEach((participant) => {
    if (!participant.preOd) {
      return;
    }

    input.preOdQuestions.forEach((question) => {
      rows.push({
        Participant: participantLabel(
          input,
          participant.participantId,
          participant.participantName
        ),
        Organization: input.organizationName || "",
        Workshop: input.workshopName || "",
        "Category Name": question.category || "Pre OD",
        Question: question.question,
        Response:
          participant.preOd?.answers[String(question.srNo)] || "",
        "Submitted Date": participant.preOd.submittedDate || "",
      });
    });
  });

  return rows;
}

function buildOdChartRows(input: WorkshopExportInput) {
  const rows: Record<string, string | number>[] = [];

  input.participants.forEach((participant) => {
    if (!participant.odChart) {
      return;
    }

    Object.entries(participant.odChart.answers || {}).forEach(
      ([questionId, answer]) => {
        rows.push({
          Participant: participantLabel(
            input,
            participant.participantId,
            participant.participantName
          ),
          Organization: input.organizationName || "",
          Workshop: input.workshopName || "",
          "Category Name": "OD Chart",
          Question: input.questionLabels[questionId] || questionId,
          Response: answer || "",
          "Submitted Date": participant.odChart?.submittedDate || "",
        });
      }
    );
  });

  return rows;
}

function buildVisionMissionRows(input: WorkshopExportInput) {
  const rows: Record<string, string | number>[] = [];

  input.participants.forEach((participant) => {
    const visionMission = participant.visionMission;
    if (!visionMission) {
      return;
    }

    const base = {
      Participant: participantLabel(
        input,
        participant.participantId,
        participant.participantName
      ),
      Organization: input.organizationName || "",
      Workshop: input.workshopName || "",
      "Category Name": "Vision and Mission",
      "Submitted Date": visionMission.submittedDate || "",
    };

    rows.push({
      ...base,
      Question: "What, according to you, should be the vision of Business?",
      Response: visionMission.visionText || "",
    });
    rows.push({
      ...base,
      Question: "Vision keywords",
      Response: (visionMission.visionKeywords || []).join(", "),
    });
    rows.push({
      ...base,
      Question: "What, according to you, should be the mission of Business?",
      Response: visionMission.missionText || "",
    });
    rows.push({
      ...base,
      Question: "Mission keywords",
      Response: (visionMission.missionKeywords || []).join(", "),
    });
  });

  return rows;
}

function buildActionablesRows(input: WorkshopExportInput) {
  const rows: Record<string, string | number>[] = [];

  input.participants.forEach((participant) => {
    participant.actionables.forEach((item) => {
      rows.push({
        Participant: participantLabel(
          input,
          participant.participantId,
          participant.participantName
        ),
        Organization: input.organizationName || "",
        Workshop: input.workshopName || "",
        "Category Name": item.categoryName || item.categoryPath || "Actionables",
        Question: "Actionable",
        Response: item.description || "",
        Timeline: item.timeline || "",
        "Responsible Persons": item.responsiblePersons || "",
        Comments: item.comments || "",
      });
    });
  });

  return rows;
}

function buildFeedbackRows(input: WorkshopExportInput) {
  const rows: Record<string, string | number>[] = [];
  const questionMap = new Map(
    input.feedbackQuestions.map((question) => [question.id, question.label])
  );

  input.feedbackSubmissions.forEach((submission) => {
    Object.entries(submission.answers || {}).forEach(([questionId, answer]) => {
      rows.push({
        Participant: participantLabel(
          input,
          submission.participantId,
          submission.participantName
        ),
        Organization: input.organizationName || "",
        Workshop: input.workshopName || "",
        "Category Name": "Feedback",
        Question: questionMap.get(questionId) || questionId,
        Response: answer || "",
        "Submitted Date": submission.submittedDate || "",
      });
    });
  });

  return rows;
}

function fileSafeName(value: string) {
  return String(value || "workshop")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

export function exportWorkshopResponsesExcel(input: WorkshopExportInput) {
  const workbook = XLSX.utils.book_new();

  addSheet(workbook, "Pre OD", buildPreOdRows(input));
  addSheet(workbook, "OD Chart", buildOdChartRows(input));
  addSheet(workbook, "Vision and Mission", buildVisionMissionRows(input));
  addSheet(workbook, "Actions", buildActionablesRows(input));
  addSheet(workbook, "Feedback", buildFeedbackRows(input));

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${fileSafeName(input.workshopName)}_responses_${stamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
