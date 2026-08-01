import { useCallback, useEffect, useMemo, useState } from "react";

import Header from "../../components/Header";

import Sidebar from "../../components/Sidebar";

import "../../styles/PreOD.css";



type PreOdQuestion = {

  srNo: number;

  category: string;

  question: string;

  section: "A" | "B";

};



type Workshop = {

  id: string;

  workshopName: string;

  organizationName: string;

  startDate?: string;

  preOdQuestionSrNos?: string;

  preOdQuestionCount?: number;

};



type SubmissionSummary = {

  workshopId: string;

  workshopName: string;

  submissionCount: number;

};



type ResponseQuestion = {

  srNo: number;

  category: string;

  question: string;

};



type PreOdSubmission = {

  participantId: string;

  participantName: string;

  submittedDate?: string;

  answers: Record<string, string>;

};



type FormMode = "create" | "edit";



type PageProps = {

  user?: any;

};



function parseSrNos(value?: string) {

  if (!value) {

    return [];

  }



  return value

    .split(",")

    .map((item) => Number(item.trim()))

    .filter((item) => !Number.isNaN(item));

}



function canEditPreOd(startDate?: string) {

  if (!startDate) {

    return true;

  }



  const startMs = new Date(startDate).getTime();

  if (Number.isNaN(startMs)) {

    return true;

  }



  return Date.now() < startMs;

}



function formatSubmittedDate(value?: string) {

  if (!value) {

    return "—";

  }



  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return value;

  }



  return date.toLocaleString();

}



export default function PreOD({ user }: PageProps) {

  const [questions, setQuestions] = useState<PreOdQuestion[]>([]);

  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  const [submissionSummaries, setSubmissionSummaries] = useState<

    SubmissionSummary[]

  >([]);

  const [loading, setLoading] = useState(true);

  const [responsesLoading, setResponsesLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>("create");

  const [activeTab, setActiveTab] = useState<"setup" | string>("setup");

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");

  const [selectedWorkshopId, setSelectedWorkshopId] = useState("");

  const [selectedSrNos, setSelectedSrNos] = useState<number[]>([]);

  const [statusMessage, setStatusMessage] = useState("");

  const [responseQuestions, setResponseQuestions] = useState<ResponseQuestion[]>(

    []

  );

  const [submissions, setSubmissions] = useState<PreOdSubmission[]>([]);

  const [expandedParticipantId, setExpandedParticipantId] = useState("");



  const assignedWorkshops = useMemo(() => {

    return workshops.filter((workshop) => (workshop.preOdQuestionCount || 0) > 0);

  }, [workshops]);



  const loadSubmissionSummaries = useCallback(async () => {

    try {

      const response = await fetch("/api/get-pre-od-responses");

      const data = await response.json();



      if (response.ok && data.success) {

        setSubmissionSummaries(data.summaries || []);

      }

    } catch (error) {

      console.error("Error loading Pre OD submissions:", error);

    }

  }, []);



  const loadData = async () => {

    try {

      setLoading(true);

      const [questionsRes, workshopsRes] = await Promise.all([

        fetch("/api/get-pre-od-questions"),

        fetch("/api/get-workshops"),

      ]);



      const questionsData = await questionsRes.json();

      const workshopsData = await workshopsRes.json();



      if (questionsData.success) {

        setQuestions(questionsData.questions || []);

      }



      if (workshopsData.success) {

        setWorkshops(workshopsData.workshops || []);

      }



      await loadSubmissionSummaries();

    } catch (error) {

      console.error("Error loading Pre OD data:", error);

    } finally {

      setLoading(false);

    }

  };



  const loadWorkshopResponses = useCallback(async (workshopId: string) => {

    try {

      setResponsesLoading(true);

      const response = await fetch(

        `/api/get-pre-od-responses?workshopId=${encodeURIComponent(workshopId)}`

      );

      const data = await response.json();



      if (!response.ok || !data.success) {

        setResponseQuestions([]);

        setSubmissions([]);

        return;

      }



      setResponseQuestions(data.questions || []);

      setSubmissions(data.submissions || []);

      setExpandedParticipantId("");

    } catch (error) {

      console.error("Error loading workshop Pre OD responses:", error);

      setResponseQuestions([]);

      setSubmissions([]);

    } finally {

      setResponsesLoading(false);

    }

  }, []);



  useEffect(() => {

    loadData();

  }, []);



  useEffect(() => {

    if (activeTab === "setup") {

      return;

    }



    loadWorkshopResponses(activeTab);

  }, [activeTab, loadWorkshopResponses]);



  useEffect(() => {

    if (!showCreateForm || !selectedWorkshopId) {

      return;

    }



    const workshop = workshops.find((item) => item.id === selectedWorkshopId);

    setSelectedSrNos(parseSrNos(workshop?.preOdQuestionSrNos));

  }, [selectedWorkshopId, workshops, showCreateForm]);



  const categories = useMemo(() => {

    const unique = Array.from(new Set(questions.map((item) => item.category)));

    return ["All", ...unique];

  }, [questions]);



  const filteredQuestions = useMemo(() => {

    const term = search.trim().toLowerCase();



    return questions.filter((item) => {

      const matchesCategory =

        categoryFilter === "All" || item.category === categoryFilter;

      const matchesSearch =

        !term ||

        item.question.toLowerCase().includes(term) ||

        item.category.toLowerCase().includes(term) ||

        String(item.srNo).includes(term);



      return matchesCategory && matchesSearch;

    });

  }, [questions, search, categoryFilter]);



  const activeWorkshop = useMemo(() => {

    if (activeTab === "setup") {

      return null;

    }



    return (

      workshops.find((item) => item.id === activeTab) ||

      submissionSummaries.find((item) => item.workshopId === activeTab) ||

      null

    );

  }, [activeTab, workshops, submissionSummaries]);



  const toggleQuestion = (srNo: number) => {

    setSelectedSrNos((current) =>

      current.includes(srNo)

        ? current.filter((item) => item !== srNo)

        : [...current, srNo]

    );

  };



  const toggleAllFiltered = () => {

    const filteredSrNos = filteredQuestions.map((item) => item.srNo);

    const allSelected = filteredSrNos.every((srNo) =>

      selectedSrNos.includes(srNo)

    );



    if (allSelected) {

      setSelectedSrNos((current) =>

        current.filter((srNo) => !filteredSrNos.includes(srNo))

      );

      return;

    }



    setSelectedSrNos((current) =>

      Array.from(new Set([...current, ...filteredSrNos]))

    );

  };



  const openCreateForm = () => {

    setFormMode("create");

    setShowCreateForm(true);

    setActiveTab("setup");

    setSelectedWorkshopId("");

    setSelectedSrNos([]);

    setSearch("");

    setCategoryFilter("All");

    setStatusMessage("");

  };



  const openEditForm = (workshopId: string) => {

    const workshop = workshops.find((item) => item.id === workshopId);

    if (!workshop || !canEditPreOd(workshop.startDate)) {

      return;

    }



    setFormMode("edit");

    setShowCreateForm(true);

    setActiveTab("setup");

    setSelectedWorkshopId(workshopId);

    setSelectedSrNos(parseSrNos(workshop.preOdQuestionSrNos));

    setSearch("");

    setCategoryFilter("All");

    setStatusMessage("");

  };



  const closeCreateForm = () => {

    setShowCreateForm(false);

    setFormMode("create");

    setSelectedWorkshopId("");

    setSelectedSrNos([]);

    setStatusMessage("");

  };



  const handleSavePreOd = async () => {

    if (!selectedWorkshopId) {

      setStatusMessage("Select a workshop first.");

      return;

    }



    const workshop = workshops.find((item) => item.id === selectedWorkshopId);

    if (workshop && !canEditPreOd(workshop.startDate)) {

      setStatusMessage(

        "This workshop has started. Pre OD can no longer be edited."

      );

      return;

    }



    if (selectedSrNos.length === 0) {

      setStatusMessage("Select at least one question.");

      return;

    }



    try {

      setSaving(true);

      setStatusMessage("");



      const response = await fetch("/api/save-workshop-pre-od", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          workshopId: selectedWorkshopId,

          questionSrNos: selectedSrNos,

        }),

      });



      const data = await response.json();



      if (!response.ok || !data.success) {

        setStatusMessage(data.message || "Failed to save Pre OD.");

        return;

      }



      await loadData();

      closeCreateForm();

    } catch (error) {

      console.error(error);

      setStatusMessage("Failed to save Pre OD.");

    } finally {

      setSaving(false);

    }

  };



  const handleTabChange = (tab: "setup" | string) => {

    setActiveTab(tab);

    setShowCreateForm(false);

    setStatusMessage("");

  };



  const selectedWorkshop = workshops.find(

    (item) => item.id === selectedWorkshopId

  );



  const getWorkshopTabLabel = (summary: SubmissionSummary) => {

    const workshop = workshops.find((item) => item.id === summary.workshopId);

    const name =

      workshop?.workshopName ||

      summary.workshopName ||

      "Workshop";



    return `${name} (${summary.submissionCount})`;

  };



  return (

    <div className="pre-od-page">

      <Sidebar />

      <div className="pre-od-content">

        <Header user={user} />



        <div className="pre-od-body">

          <div className="pre-od-header">

            <div>

              <h1 className="pre-od-title">Pre OD</h1>

              <p className="pre-od-subtitle">

                Assign Pre OD questions and review participant submissions.

              </p>

            </div>



            {activeTab === "setup" && !showCreateForm && (

              <button

                type="button"

                className="pre-od-save-btn pre-od-create-btn"

                onClick={openCreateForm}

              >

                Create Pre OD

              </button>

            )}

          </div>



          <div className="pre-od-tabs">

            <button

              type="button"

              className={`pre-od-tab ${activeTab === "setup" ? "active" : ""}`}

              onClick={() => handleTabChange("setup")}

            >

              Pre OD Setup

            </button>



            {submissionSummaries.map((summary) => (

              <button

                key={summary.workshopId}

                type="button"

                className={`pre-od-tab ${

                  activeTab === summary.workshopId ? "active" : ""

                }`}

                onClick={() => handleTabChange(summary.workshopId)}

              >

                {getWorkshopTabLabel(summary)}

              </button>

            ))}

          </div>



          {activeTab === "setup" ? (

            !showCreateForm ? (

              <div className="pre-od-list">

                {loading ? (

                  <p className="pre-od-empty">Loading Pre OD assignments...</p>

                ) : assignedWorkshops.length === 0 ? (

                  <div className="pre-od-empty-card">

                    <p>No Pre OD has been created yet.</p>

                    <button

                      type="button"

                      className="pre-od-save-btn"

                      onClick={openCreateForm}

                    >

                      Create Pre OD

                    </button>

                  </div>

                ) : (

                  assignedWorkshops.map((workshop) => {

                    const editable = canEditPreOd(workshop.startDate);

                    const submissionCount =

                      submissionSummaries.find(

                        (item) => item.workshopId === workshop.id

                      )?.submissionCount || 0;



                    return (

                      <div key={workshop.id} className="pre-od-workshop-card">

                        <h2 className="pre-od-workshop-name">

                          {workshop.workshopName}

                        </h2>

                        {workshop.organizationName ? (

                          <p className="pre-od-workshop-org">

                            {workshop.organizationName}

                          </p>

                        ) : null}

                        <p className="pre-od-assigned-label">Pre OD assigned</p>

                        {submissionCount > 0 ? (

                          <p className="pre-od-submission-count">

                            {submissionCount} submission

                            {submissionCount === 1 ? "" : "s"} received

                          </p>

                        ) : null}

                        {editable ? (

                          <button

                            type="button"

                            className="pre-od-edit-btn"

                            onClick={() => openEditForm(workshop.id)}

                          >

                            Edit

                          </button>

                        ) : (

                          <p className="pre-od-locked-label">Workshop started</p>

                        )}

                      </div>

                    );

                  })

                )}

              </div>

            ) : (

              <div className="pre-od-create-panel">

                <div className="pre-od-create-panel-header">

                  <h2>{formMode === "edit" ? "Edit Pre OD" : "Create Pre OD"}</h2>

                  <button

                    type="button"

                    className="pre-od-cancel-btn"

                    onClick={closeCreateForm}

                    disabled={saving}

                  >

                    Cancel

                  </button>

                </div>



                <div className="pre-od-assign-form">

                  <div className="pre-od-workshop-field">

                    <label className="pre-od-field-label">Workshop</label>

                    <select

                      className="pre-od-filter pre-od-workshop-select"

                      value={selectedWorkshopId}

                      onChange={(e) => setSelectedWorkshopId(e.target.value)}

                      disabled={formMode === "edit"}

                    >

                      <option value="">Select Workshop</option>

                      {workshops.map((workshop) => (

                        <option

                          key={workshop.id}

                          value={workshop.id}

                          disabled={!canEditPreOd(workshop.startDate)}

                        >

                          {workshop.workshopName}

                          {workshop.organizationName

                            ? ` — ${workshop.organizationName}`

                            : ""}

                          {!canEditPreOd(workshop.startDate)

                            ? " (started)"

                            : ""}

                        </option>

                      ))}

                    </select>

                  </div>



                  <button

                    type="button"

                    className="pre-od-save-btn"

                    onClick={handleSavePreOd}

                    disabled={saving || !selectedWorkshopId}

                  >

                    {saving ? "Saving..." : "Save Pre OD"}

                  </button>

                </div>



                {formMode === "edit" ? (

                  <p className="pre-od-panel-help">

                    You can edit Pre OD until the workshop starts.

                  </p>

                ) : selectedWorkshop?.preOdQuestionCount ? (

                  <p className="pre-od-panel-help">

                    This workshop already has {selectedWorkshop.preOdQuestionCount}{" "}

                    Pre OD questions. Saving will replace them.

                  </p>

                ) : null}



                {statusMessage && (

                  <div className="pre-od-error">{statusMessage}</div>

                )}



                <div className="pre-od-toolbar">

                  <input

                    type="text"

                    className="pre-od-search"

                    placeholder="Search questions..."

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                  />



                  <select

                    className="pre-od-filter"

                    value={categoryFilter}

                    onChange={(e) => setCategoryFilter(e.target.value)}

                  >

                    {categories.map((category) => (

                      <option key={category} value={category}>

                        {category}

                      </option>

                    ))}

                  </select>



                  <button

                    type="button"

                    className="pre-od-select-all-btn"

                    onClick={toggleAllFiltered}

                  >

                    Select / Unselect Filtered

                  </button>

                </div>



                <div className="pre-od-table-card">

                  {loading ? (

                    <p>Loading questions...</p>

                  ) : (

                    <table className="pre-od-table">

                      <thead>

                        <tr>

                          <th>Select</th>

                          <th>Sr No</th>

                          <th>Questions</th>

                          <th>Category</th>

                        </tr>

                      </thead>

                      <tbody>

                        {filteredQuestions.map((item) => (

                          <tr

                            key={item.srNo}

                            className={

                              item.section === "A" ? "section-a" : "section-b"

                            }

                          >

                            <td className="pre-od-check">

                              <input

                                type="checkbox"

                                checked={selectedSrNos.includes(item.srNo)}

                                onChange={() => toggleQuestion(item.srNo)}

                              />

                            </td>

                            <td className="pre-od-sr">{item.srNo}</td>

                            <td>{item.question}</td>

                            <td className="pre-od-category">{item.category}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  )}

                </div>

              </div>

            )

          ) : (

            <div className="pre-od-responses-panel">

              <div className="pre-od-responses-header">

                <div>

                  <h2>

                    {activeWorkshop && "workshopName" in activeWorkshop

                      ? activeWorkshop.workshopName

                      : "Workshop"}{" "}

                    Responses

                  </h2>

                  <p className="pre-od-panel-help">

                    Participant Pre OD submissions for this workshop.

                  </p>

                </div>

                <span className="pre-od-stat">

                  {submissions.length} submission

                  {submissions.length === 1 ? "" : "s"}

                </span>

              </div>



              {responsesLoading ? (

                <p className="pre-od-empty">Loading submissions...</p>

              ) : submissions.length === 0 ? (

                <div className="pre-od-empty-card">

                  <p>No Pre OD submissions yet for this workshop.</p>

                </div>

              ) : (

                <div className="pre-od-submissions-list">

                  {submissions.map((submission) => {

                    const isExpanded =

                      expandedParticipantId === submission.participantId;



                    return (

                      <div

                        key={submission.participantId}

                        className="pre-od-submission-card"

                      >

                        <button

                          type="button"

                          className="pre-od-submission-toggle"

                          onClick={() =>

                            setExpandedParticipantId(

                              isExpanded ? "" : submission.participantId

                            )

                          }

                        >

                          <div>

                            <strong>{submission.participantName}</strong>

                            <span className="pre-od-submission-date">

                              Submitted:{" "}

                              {formatSubmittedDate(submission.submittedDate)}

                            </span>

                          </div>

                          <span>{isExpanded ? "−" : "+"}</span>

                        </button>



                        {isExpanded ? (

                          <div className="pre-od-submission-answers">

                            {responseQuestions.map((question) => (

                              <div

                                key={question.srNo}

                                className="pre-od-submission-answer"

                              >

                                <p className="pre-od-submission-question">

                                  {question.srNo}. {question.question}

                                </p>

                                <p className="pre-od-submission-response">

                                  {submission.answers[String(question.srNo)] ||

                                    "—"}

                                </p>

                              </div>

                            ))}

                          </div>

                        ) : null}

                      </div>

                    );

                  })}

                </div>

              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


