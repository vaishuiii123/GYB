const { TableClient } =
  require("@azure/data-tables");

module.exports = async function (
  context,
  req
) {
  try {

    const {
      workshopName,
      startDate,
      endDate,
      templateId,
      templateName,
      organizationId,
      organizationName,
      participantCount,
      createdBy
    } = req.body;

    if (
      !workshopName ||
      !startDate ||
      !endDate ||
      !templateId ||
      !organizationId
    ) {

      context.res = {
        status: 400,
        body: {
          success: false,
          message:
            "Required fields missing"
        }
      };

      return;
    }

    const client =
      TableClient.fromConnectionString(
        process.env
          .AZURE_STORAGE_CONNECTION_STRING,
        "Workshop"
      );

    // Create table if not exists
    try {

      await client.createTable();

    } catch (error) {

      if (
        !error.message?.includes(
          "TableAlreadyExists"
        )
      ) {
        throw error;
      }
    }

    const workshopId =
      Date.now().toString();

    await client.createEntity({

      partitionKey:
        "Workshop",

      rowKey:
        workshopId,

      WorkshopName:
        workshopName,

      StartDate:
        startDate,

      EndDate:
        endDate,

      TemplateId:
        templateId,

      TemplateName:
        templateName || "",

      OrganizationId:
        organizationId,

      OrganizationName:
        organizationName || "",

      ParticipantCount:
        participantCount || 0,

      CreatedBy:
        createdBy || "",

      CreatedDate:
        new Date().toISOString()
    });

    context.res = {
      status: 200,
      body: {
        success: true,
        workshopId
      }
    };

  } catch (error) {

    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error:
          error.message
      }
    };
  }
};
