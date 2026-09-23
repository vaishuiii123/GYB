const { getTableClient } = require("../shared/tableHelper");
const {
  CACHE_KEYS,
  getOrLoad,
} = require("../shared/listCache");

/**
 * Organizations a participant is assigned to, keyed by participant id.
 * The Organisation column on the participant record is not maintained,
 * so assignments are read from the OrganizationParticipants mapping.
 */
async function loadOrganizationNamesByParticipant(context) {
  const namesByParticipant = new Map();

  try {
    const organizationNames = new Map();

    for await (const entity of getTableClient(
      "Organization"
    ).listEntities({
      queryOptions: {
        filter: `PartitionKey eq 'Organization'`,
        select: ["RowKey", "Organization_Name"],
      },
    })) {
      organizationNames.set(
        entity.rowKey,
        entity.Organization_Name || ""
      );
    }

    for await (const entity of getTableClient(
      "OrganizationParticipants"
    ).listEntities()) {
      const name = organizationNames.get(entity.OrganizationId);

      // Skip mappings whose organization no longer exists
      if (!name) {
        continue;
      }

      const names =
        namesByParticipant.get(entity.ParticipantId) || [];

      if (!names.includes(name)) {
        names.push(name);
      }

      namesByParticipant.set(entity.ParticipantId, names);
    }

    for (const names of namesByParticipant.values()) {
      names.sort((a, b) => a.localeCompare(b));
    }
  } catch (error) {
    context.log(
      "get-participants could not resolve organizations:",
      error
    );
  }

  return namesByParticipant;
}

async function loadParticipants(context) {
    const client = getTableClient("Participants");
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

    const organizationsByParticipant =
      await loadOrganizationNamesByParticipant(context);

    for await (const entity of client.listEntities({
      queryOptions: {
        filter: "PartitionKey eq 'Participant'",
        select,
      },
    })) {
      const assignedOrganizations =
        organizationsByParticipant.get(entity.rowKey) || [];

      participants.push({
        id: entity.rowKey,
        organizations: assignedOrganizations,
        organization:
          assignedOrganizations.join(", ") ||
          entity.Organisation ||
          "",
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

    return participants;
}

module.exports = async function (context, req) {
  const startTime = Date.now();

  try {
    const { value: allParticipants, cacheHit } = await getOrLoad(
      CACHE_KEYS.participants,
      () => loadParticipants(context)
    );
    const organization = String(req.query.organization || "")
      .trim()
      .toLowerCase();
    const participants = organization
      ? allParticipants.filter((participant) =>
          String(participant.organization || "")
            .toLowerCase()
            .includes(organization)
        )
      : allParticipants;

    context.log(
      `get-participants completed in ${Date.now() - startTime} ms`
    );

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-List-Cache": cacheHit ? "HIT" : "MISS",
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