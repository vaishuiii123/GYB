const { TableClient } =
  require("@azure/data-tables");

module.exports =
  async function (
    context,
    req
  ) {

    try {

      const templateId =
        req.query.id;

      if (!templateId) {

        context.res = {
          status: 400,
          body: {
            success: false,
            error:
              "Template Id required",
          },
        };

        return;
      }

      const client =
        TableClient.fromConnectionString(
          process.env
            .AZURE_STORAGE_CONNECTION_STRING,
          "Template"
        );

      await client.deleteEntity(
        "Template",
        templateId
      );

      context.res = {
        status: 200,
        body: {
          success: true,
        },
      };

    } catch (error) {

      context.log(error);

      context.res = {
        status: 500,
        body: {
          success: false,
          error:
            error.message,
        },
      };
    }
  };
