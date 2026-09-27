const REPORTS_RETURN_KEY = "gyb-reports-return-v1";

export function readReportsReturn(): "question" | null {
  try {
    const raw = sessionStorage.getItem(REPORTS_RETURN_KEY);
    return raw === "question" ? "question" : null;
  } catch {
    return null;
  }
}

export function markReportsReturnFromQuestions() {
  try {
    sessionStorage.setItem(REPORTS_RETURN_KEY, "question");
  } catch {
    // ignore
  }
}

export function clearReportsReturn() {
  try {
    sessionStorage.removeItem(REPORTS_RETURN_KEY);
  } catch {
    // ignore
  }
}
