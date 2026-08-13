import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import * as XLSX from "xlsx";
import "../../styles/Export.css";

type PageProps = {
  user?: any;
};

type Organization = {
  id: string;
  organizationName: string;
};

type Workshop = {
  id: string;
  workshopName?: string;
  organizationId?: string;
  organizationName?: string;
  templateId?: string;
};

type ExportRow = {
  participant: string;
  organization: string;
  workshop: string;
  category: string;
  question: string;
  response: string;
  attachment: string;
};

type ResponseData = {
  workshop?: {
    workshopName?: string;
    organizationName?: string;
  };
  participants?: any[];
  preOdQuestions?: Array<{
    srNo: number;
    category?: string;
    question: string;
  }>;
  questionLabels?: Record<string, string>;
};

type Category = {
  id: string;
  categoryName: string;
  fullPath?: string;
  questions?: Array<{
    id: string;
    question: string;
  }>;
};

export default function Export({ user }: PageProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignedCategoryIds, setAssignedCategoryIds] =  useState<string[]>([]);
  const [exportType, setExportType] = useState<"preod" | "od">("preod");

  const [selectedOrganization, setSelectedOrganization] =
    useState("");

  const [selectedWorkshop, setSelectedWorkshop] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [selectedQuestion, setSelectedQuestion] =
    useState("");

  const [responses, setResponses] =
    useState<ExportRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [loadingInitial, setLoadingInitial] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [activeView, setActiveView] =
    useState<"all" | "summary">("all");

  /*
   * --------------------------------------------------
   * Load organizations, workshops and categories
   * --------------------------------------------------
   */

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingInitial(true);

        const [
          organizationsResponse,
          workshopsResponse,
          categoriesResponse,
        ] = await Promise.all([
          fetch("/api/get-organizations"),
          fetch("/api/get-workshops"),
          fetch("/api/get-all-categories"),
        ]);

        const organizationsData =
          await organizationsResponse.json();

        const workshopsData =
          await workshopsResponse.json();

        const categoriesData =
          await categoriesResponse.json();

        if (
          organizationsResponse.ok &&
          organizationsData.success
        ) {
          setOrganizations(
            organizationsData.organizations || []
          );
        }

        if (
          workshopsResponse.ok &&
          workshopsData.success
        ) {
          setWorkshops(
            workshopsData.workshops || []
          );
        }

        if (
          categoriesResponse.ok &&
          categoriesData.success
        ) {
          setCategories(
            categoriesData.categories || []
          );
        }
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load export data."
        );
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  /*
   * --------------------------------------------------
   * Workshops for selected organization
   * --------------------------------------------------
   */

  const organizationWorkshops = useMemo(() => {
  if (!selectedOrganization) {
    return [];
  }

  const selectedOrg = organizations.find(
    (org) =>
      String(org.id) === String(selectedOrganization)
  );

  if (!selectedOrg) {
    return [];
  }

  return workshops.filter((workshop) => {
    return (
      String(workshop.organizationId || "") ===
      String(selectedOrg.id)
    );
  });
}, [
  organizations,
  workshops,
  selectedOrganization,
]);

  /*
   * --------------------------------------------------
   * Load responses for selected workshop
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!selectedWorkshop) {
      setResponses([]);
      setSelectedCategory("");
      setSelectedQuestion("");
      return;
    }

    const loadResponses = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/get-workshop-responses?workshopId=${encodeURIComponent(
            selectedWorkshop
          )}`
        );

        const data: ResponseData =
          await response.json();

        if (!response.ok) {
          throw new Error(
            "Unable to load workshop responses."
          );
        }

        const rows: ExportRow[] = [];

        /*
         * --------------------------------------------
         * Pre OD responses
         * --------------------------------------------
         */

        const preOdQuestions =
          data.preOdQuestions || [];

        (data.participants || []).forEach(
          (participant: any) => {
            const participantName =
              participant.participantName ||
              "Unknown";

            /*
             * Pre OD
             */
            if (participant.preOd) {
              preOdQuestions.forEach(
                (question) => {
                  const answer =
                    participant.preOd.answers[
                      String(question.srNo)
                    ];

                  if (
                    answer !== undefined &&
                    answer !== ""
                  ) {
                    rows.push({
                      participant:
                        participantName,

                      organization:
                        data.workshop
                          ?.organizationName || "",

                      workshop:
                        data.workshop
                          ?.workshopName || "",

                      category:
                        question.category ||
                        "Pre Organization Development",

                      question:
                        question.question,

                      response:
                        String(answer),

                      attachment: "-",
                    });
                  }
                }
              );
            }

            /*
             * ----------------------------------------
             * OD Chart responses
             * ----------------------------------------
             */

            if (participant.odChart) {
              Object.entries(
                participant.odChart.answers || {}
              ).forEach(
                ([questionId, answer]) => {
                  rows.push({
                    participant:
                      participantName,

                    organization:
                      data.workshop
                        ?.organizationName || "",

                    workshop:
                      data.workshop
                        ?.workshopName || "",

                    category:
                      getCategoryForQuestion(
                        questionId
                      ),

                    question:
                      data.questionLabels?.[
                        questionId
                      ] || questionId,

                    response:
                      String(answer || ""),

                    attachment: "-",
                  });
                }
              );
            }

            /*
             * ----------------------------------------
             * Vision & Mission
             * ----------------------------------------
             */

            if (
              participant.visionMission
            ) {
              const vm =
                participant.visionMission;

              if (vm.visionText) {
                rows.push({
                  participant:
                    participantName,

                  organization:
                    data.workshop
                      ?.organizationName || "",

                  workshop:
                    data.workshop
                      ?.workshopName || "",

                  category:
                    "Vision & Mission",

                  question:
                    "Vision",

                  response:
                    vm.visionText,

                  attachment: "-",
                });
              }

              if (vm.missionText) {
                rows.push({
                  participant:
                    participantName,

                  organization:
                    data.workshop
                      ?.organizationName || "",

                  workshop:
                    data.workshop
                      ?.workshopName || "",

                  category:
                    "Vision & Mission",

                  question:
                    "Mission",

                  response:
                    vm.missionText,

                  attachment: "-",
                });
              }
            }

          }
        );

        setResponses(rows);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load workshop responses."
        );

        setResponses([]);
      } finally {
        setLoading(false);
      }
    };

    loadResponses();
  }, [selectedWorkshop]);

  /*
   * --------------------------------------------------
   * Find category for OD question
   * --------------------------------------------------
   */

  const getCategoryForQuestion = (
    questionId: string
  ) => {
    for (const category of categories) {
      if (
        category.questions?.some(
          (question) =>
            String(question.id) ===
            String(questionId)
        )
      ) {
        return (
          category.fullPath ||
          category.categoryName ||
          "Category"
        );
      }
    }

    return "OD Chart";
  };

  /*
   * --------------------------------------------------
   * Available categories
   * --------------------------------------------------
   */

const availableCategories = useMemo(() => {
  if (
    !selectedWorkshop ||
    assignedCategoryIds.length === 0
  ) {
    return [];
  }

  return categories
    .filter((category) =>
      assignedCategoryIds.includes(
        String(category.id)
      )
    )
    .map((category) => {
      const fullPath =
        category.fullPath ||
        category.categoryName ||
        "";

      const displayName =
        fullPath
          .split(">")
          .pop()
          ?.trim() || "";

      return {
        id: category.id,
        name: displayName,
      };
    })
    .filter((category) => category.name)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}, [
  categories,
  assignedCategoryIds,
  selectedWorkshop,
]);

  /*
   * --------------------------------------------------
   * Available questions
   * --------------------------------------------------
   */
const availableQuestions = useMemo(() => {
  if (!selectedCategory) {
    return [];
  }

  const selectedCategoryData =
    categories.find(
      (category) =>
        String(category.id) ===
        String(selectedCategory)
    );

  if (
    !selectedCategoryData ||
    !selectedCategoryData.questions
  ) {
    return [];
  }

  return selectedCategoryData.questions
    .map(
      (question) =>
        question.question
    )
    .filter(Boolean)
    .sort();
}, [
  categories,
  selectedCategory,
]);

  /*
   * --------------------------------------------------
   * Filtered table data
   * --------------------------------------------------
   */

  const filteredResponses = useMemo(() => {
    let data = responses;

   if (selectedCategory) {
  const selectedCategoryData =
    categories.find(
      (category) =>
        category.id ===
        selectedCategory
    );

  const selectedCategoryName =
    selectedCategoryData?.categoryName ||
    "";

  data = data.filter((item) => {
    const lastCategory =
      (item.category || "")
        .split(">")
        .pop()
        ?.trim() || "";

    return (
      lastCategory ===
      selectedCategoryName
    );
  });
}

    if (selectedQuestion) {
      data = data.filter(
        (item) =>
          item.question ===
          selectedQuestion
      );
    }

    if (search.trim()) {
      const searchValue =
        search.toLowerCase();

      data = data.filter((item) =>
        [
          item.participant,
          item.organization,
          item.workshop,
          item.category,
          item.question,
          item.response,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchValue)
      );
    }

    return data;
  }, [
    responses,
    selectedCategory,
    selectedQuestion,
    search,
  ]);

  /*
   * --------------------------------------------------
   * Reset dependent dropdowns
   * --------------------------------------------------
   */

  const handleOrganizationChange = (
    value: string
  ) => {
    setSelectedOrganization(value);
    setSelectedWorkshop("");
    setSelectedCategory("");
    setSelectedQuestion("");
    setResponses([]);
  };

 const handleWorkshopChange = async (
  workshopId: string
) => {
  setSelectedWorkshop(workshopId);

  // Reset dependent dropdowns
  setSelectedCategory("");
  setSelectedQuestion("");
  setAssignedCategoryIds([]);
  setResponses([]);

  if (!workshopId) {
    return;
  }

  const workshop = organizationWorkshops.find(
    (item) =>
      String(item.id) === String(workshopId)
  );

  if (!workshop) {
    console.warn(
      "Selected workshop was not found."
    );
    return;
  }

  if (!workshop.templateId) {
    console.warn(
      "Selected workshop does not have a template."
    );
    return;
  }

  try {
    const response = await fetch(
      `/api/get-template-details?templateId=${encodeURIComponent(
        workshop.templateId
      )}`
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.template
    ) {
      console.error(
        "Could not load template details"
      );
      return;
    }

    const categoryIds = (
      data.template.categoryIds || []
    )
      .map((id: string) =>
        String(id).trim()
      )
      .filter(Boolean);

    setAssignedCategoryIds(categoryIds);

  } catch (error) {
    console.error(
      "Error loading workshop categories:",
      error
    );

    setAssignedCategoryIds([]);
  }
};

  const handleCategoryChange = (
    value: string
  ) => {
    setSelectedCategory(value);
    setSelectedQuestion("");
  };

  /*
   * --------------------------------------------------
   * Excel export
   * --------------------------------------------------
   */

  const handleExportExcel = () => {
    if (
      filteredResponses.length === 0
    ) {
      return;
    }

    const worksheet =
      XLSX.utils.json_to_sheet(
        filteredResponses.map(
          (item) => ({
            Participant:
              item.participant,

            Organization:
              item.organization,

            Workshop:
              item.workshop,

            Category:
              item.category,

            Question:
              item.question,

            Response:
              item.response,

            Attachment:
              item.attachment,
          })
        )
      );

    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 35 },
      { wch: 50 },
      { wch: 40 },
      { wch: 20 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "All Responses"
    );

    const workshopName =
      organizationWorkshops.find(
        (item) =>
          item.id === selectedWorkshop
      )?.workshopName ||
      "Workshop";

    XLSX.writeFile(
      workbook,
      `${workshopName}_Export.xlsx`
    );
  };

  /*
   * --------------------------------------------------
   * Summary
   * --------------------------------------------------
   */

  const summary = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    filteredResponses.forEach(
      (item) => {
        map.set(
          item.category,
          (map.get(item.category) || 0) +
            1
        );
      }
    );

    return Array.from(
      map.entries()
    ).map(
      ([category, count]) => ({
        category,
        count,
      })
    );
  }, [filteredResponses]);

   return (
  <div className="export-page">
    <Header user={user} />
    <Sidebar />

    <main className="export-content">

      {/* =========================================
          PAGE TITLE
      ========================================= */}
      <h1 className="export-title">
        Export
      </h1>


      {/* =========================================
          PRE-OD / OD
      ========================================= */}
      <div className="export-type-selector">

        <label className="export-radio">
          <input
            type="radio"
            name="exportType"
            value="preod"
            checked={exportType === "preod"}
            onChange={() => {
              setExportType("preod");
              setSelectedOrganization("");
              setSelectedWorkshop("");
              setSelectedCategory("");
              setSelectedQuestion("");
              setResponses([]);
            }}
          />

          <span>Pre-OD</span>
        </label>


        <label className="export-radio">
          <input
            type="radio"
            name="exportType"
            value="od"
            checked={exportType === "od"}
            onChange={() => {
              setExportType("od");
              setSelectedOrganization("");
              setSelectedWorkshop("");
              setSelectedCategory("");
              setSelectedQuestion("");
              setResponses([]);
            }}
          />

          <span>OD</span>
        </label>

      </div>


      {/* =========================================
          FILTERS
      ========================================= */}
      <div className="export-filters">


        {/* =====================================
            ORGANIZATION
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Organization
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              🏢
            </span>

            <select
              value={selectedOrganization}
              onChange={(e) =>
                handleOrganizationChange(
                  e.target.value
                )
              }
            >

              <option value="">
                Select Organization
              </option>

              {organizations.map(
                (organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.organizationName}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* =====================================
            WORKSHOP
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Workshop
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              📅
            </span>

            <select
              value={selectedWorkshop}
              onChange={(e) =>
                handleWorkshopChange(
                  e.target.value
                )
              }
              disabled={!selectedOrganization}
            >

              <option value="">
                Select Workshop
              </option>

              {organizationWorkshops.map(
                (workshop) => (
                  <option
                    key={workshop.id}
                    value={workshop.id}
                  >
                    {workshop.workshopName}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* =====================================
            CATEGORY
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Category
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              📁
            </span>

            <select
              value={selectedCategory}
              onChange={(e) =>
                handleCategoryChange(
                  e.target.value
                )
              }
              disabled={!selectedWorkshop}
            >

              <option value="">
                Select Category
              </option>

              {availableCategories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* =====================================
            QUESTION
        ===================================== */}
        <div className="export-filter">

          <label>
            Select Question
          </label>

          <div className="export-select-wrapper">

            <span className="export-select-icon">
              ❓
            </span>

            <select
              value={selectedQuestion}
              onChange={(e) =>
                setSelectedQuestion(
                  e.target.value
                )
              }
              disabled={!selectedCategory}
            >

              <option value="">
                Select Question
              </option>

              {availableQuestions.map(
                (question, index) => (
                  <option
                    key={`${question}-${index}`}
                    value={question}
                  >
                    {question}
                  </option>
                )
              )}

            </select>

          </div>

        </div>

      </div>


      {/* =========================================
          TABS + SEARCH + EXCEL
      ========================================= */}
      <div className="export-toolbar">


        {/* =====================================
            TABS
        ===================================== */}
        <div className="export-tabs">

          <button
            type="button"
            className={
              activeView === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView("all")
            }
          >
            All Responses
          </button>


          <button
            type="button"
            className={
              activeView === "summary"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveView("summary")
            }
          >
            Summary View
          </button>

        </div>


        {/* =====================================
            SEARCH + EXCEL
        ===================================== */}
        <div className="export-actions">

          <div className="export-search-wrapper">

            <span className="export-search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search by Keyword or type..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>


          <button
            type="button"
            className="export-excel-button"
            onClick={handleExportExcel}
            disabled={
              filteredResponses.length === 0
            }
            title="Export to Excel"
          >
            📊
          </button>

        </div>

      </div>


      {/* =========================================
          LOADING / ERROR
      ========================================= */}
      {loadingInitial || loading ? (

        <div className="export-message">
          Loading...
        </div>

      ) : error ? (

        <div className="export-message error">
          {error}
        </div>

      ) : activeView === "summary" ? (


        /* =========================================
           SUMMARY VIEW
        ========================================= */
        <section className="export-table-card">

          <table className="export-table">

            <thead>

              <tr>

                <th>
                  Category
                </th>

                <th>
                  Responses
                </th>

              </tr>

            </thead>


            <tbody>

              {summary.length === 0 ? (

                <tr>

                  <td colSpan={2}>
                    No data
                  </td>

                </tr>

              ) : (

                summary.map((item) => (

                  <tr
                    key={item.category}
                  >

                    <td>
                      {item.category
                        ?.split(">")
                        .pop()
                        ?.trim() || "-"}
                    </td>

                    <td>
                      {item.count}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </section>


      ) : (


        /* =========================================
           ALL RESPONSES VIEW
        ========================================= */
        <section className="export-table-card">

          <div className="export-table-scroll">

            <table className="export-table">

              <thead>

                <tr>

                  <th>
                    Participant
                  </th>

                  <th>
                    Organization
                  </th>

                  <th>
                    Workshop
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Question
                  </th>

                  <th>
                    Response
                  </th>

                  <th>
                    Attachment
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredResponses.length === 0 ? (

                  <tr>

                    <td colSpan={7}>
                      No responses found.
                    </td>

                  </tr>

                ) : (

                  filteredResponses.map(
                    (item, index) => (

                      <tr
                        key={`${item.participant}-${item.question}-${index}`}
                      >

                        {/* PARTICIPANT */}
                        <td>
                          {item.participant}
                        </td>


                        {/* ORGANIZATION */}
                        <td>
                          {item.organization}
                        </td>


                        {/* WORKSHOP */}
                        <td>
                          {item.workshop}
                        </td>


                        {/* CATEGORY */}
                        <td>
                          {item.category
                            ?.split(">")
                            .pop()
                            ?.trim() || "-"}
                        </td>


                        {/* QUESTION */}
                        <td>
                          {item.question}
                        </td>


                        {/* RESPONSE */}
                        <td>

                          {item.response ? (

                            <span className="export-response-pill">

                              <span className="export-response-check">
                                ✓
                              </span>

                              <span>
                                {item.response}
                              </span>

                            </span>

                          ) : (

                            <span>
                              -
                            </span>

                          )}

                        </td>


                        {/* ATTACHMENT */}
                        <td>

                          {item.attachment &&
                          item.attachment !== "-" ? (

                            <button
                              type="button"
                              className="export-attachment-button"
                              title="Download attachment"
                              onClick={() => {
                                // Attachment download
                                // will be connected
                                // when attachment API
                                // is available.
                              }}
                            >
                              ↓
                            </button>

                          ) : (

                            <span className="export-no-attachment">
                              -
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>

      )}

    </main>

  </div>
);
}