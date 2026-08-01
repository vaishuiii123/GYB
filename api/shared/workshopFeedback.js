const FEEDBACK_QUESTIONS = [
  {
    id: "overallRating",
    type: "rating",
    label: "Overall, how would you rate this workshop?",
    required: true,
  },
  {
    id: "contentUseful",
    type: "rating",
    label: "How useful was the workshop content for your business?",
    required: true,
  },
  {
    id: "facilitation",
    type: "rating",
    label: "How would you rate the facilitation and session delivery?",
    required: true,
  },
  {
    id: "recommend",
    type: "yesno",
    label: "Would you recommend this workshop to others?",
    required: true,
  },
  {
    id: "keyTakeaways",
    type: "text",
    label: "What were your key takeaways from the workshop?",
    required: true,
  },
  {
    id: "improvements",
    type: "text",
    label: "What could we improve for future workshops?",
    required: false,
  },
  {
    id: "additionalComments",
    type: "text",
    label: "Any additional comments?",
    required: false,
  },
];

function getFeedbackQuestions() {
  return FEEDBACK_QUESTIONS.map((item) => ({ ...item }));
}

module.exports = {
  FEEDBACK_QUESTIONS,
  getFeedbackQuestions,
};
