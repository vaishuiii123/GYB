const { getTableClient } = require("../shared/tableHelper");

module.exports = async function (context, req) {
  const startTime = Date.now();

  try {
    const client = getTableClient("Participants");

    const organization = String(
      req.query.organization || ""
    ).trim();

    const participants = [];

    const select = [
      "RowKey",
      "Organisation",
      "First_Name",
      "Middle_Name",
      "Last_Name",
      "Email",
      "Username",
      "Phone_No",
    ];

    const queryOptions = organization
      ? {
          filter: `Organisation eq '${organization.replace(
            /'/g,
            "''"
          )}'`,
          select,
        }
      : { select };

    for await (const entity of client.listEntities({
      queryOptions,
    })) {
      participants.push({
        id: entity.rowKey,
        organization: entity.Organisation || "",
        firstName: entity.First_Name || "",
        middleName: entity.Middle_Name || "",
        lastName: entity.Last_Name || "",
        email: entity.Email || "",
        username: entity.Username || "",
        phoneNo: entity.Phone_No || "",
      });
    }

    participants.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`
      )
    );

    context.log(
      `get-participants completed in ${
        Date.now() - startTime
      } ms`
    );

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        success: true,
        participants,
      },
    };
  } catch (error) {
    context.log.error(
      "get-participants error:",
      error
    );

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};