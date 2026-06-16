import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function TemplateDetails() {

  const { id } =
    useParams();

  const [template, setTemplate] =
    useState<any>(null);

  useEffect(() => {

    loadTemplate();

  }, []);

  const loadTemplate =
    async () => {

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
    };

  if (!template)
    return <div>Loading...</div>;

  return (

    <div>

      <h2>
        {template.templateName}
      </h2>

      <h4>
        {template.categoryName}
      </h4>

      <table>

        <thead>

          <tr>

            <th>
              Question
            </th>

            <th>
              Answer Type
            </th>

          </tr>

        </thead>

        <tbody>

          {template.questions.map(
            (q: any) => (

              <tr key={q.id}>

                <td>
                  {q.question}
                </td>

                <td>
                  {q.answerType}
                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  );
}
