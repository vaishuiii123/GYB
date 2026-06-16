import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";

type PageProps = {
  user?: any;
};

export default function TemplateDetails({
  user,
}: PageProps) {

  const { id } = useParams();

  const [template, setTemplate] =
    useState<any>(null);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate =
    async () => {

      try {

        const response =
          await fetch(
            `/api/get-template-details?templateId=${id}`
          );

        const data =
          await response.json();

        if (data.success) {

          setTemplate(
            data.template
          );
        }

      } catch (error) {

        console.error(error);
      }
    };

  if (!template) {

    return (

      <div
        style={{
          display: "flex",
          background: "#f3f4f6",
          minHeight: "100vh",
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            marginLeft: "220px",
          }}
        >
          <Header user={user} />

          <div
            style={{
              padding: "25px",
              marginTop: "70px",
            }}
          >
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (

    <div
      style={{
        display: "flex",
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          marginLeft: "220px",
        }}
      >
        <Header user={user} />

        <div
          style={{
            padding: "25px",
            marginTop: "70px",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "700",
              marginBottom: "25px",
            }}
          >
            Template Details
          </h1>

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "25px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <strong>
                Template Name:
              </strong>{" "}
              {template.templateName}
            </div>

            <div>
              <strong>
                Category:
              </strong>{" "}
              {template.categoryName}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "25px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>
                    Sr No.
                  </th>

                  <th style={thStyle}>
                    Question
                  </th>

                  <th style={thStyle}>
                    Answer Type
                  </th>

                  <th style={thStyle}>
                    Required
                  </th>
                </tr>
              </thead>

              <tbody>
                {template.questions.map(
                  (
                    q: any,
                    index: number
                  ) => (

                    <tr key={q.id}>

                      <td style={tdStyle}>
                        {index + 1}
                      </td>

                      <td style={tdStyle}>
                        {q.question}
                      </td>

                      <td style={tdStyle}>
                        {q.answerType}
                      </td>

                      <td style={tdStyle}>
                        {q.required
                          ? "Yes"
                          : "No"}
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  padding: "16px",
  borderBottom:
    "1px solid #ddd",
  fontSize: "15px",
};

const tdStyle = {
  padding: "16px",
  borderBottom:
    "1px solid #eee",
  fontSize: "16px",
};
