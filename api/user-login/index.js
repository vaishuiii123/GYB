const { TableClient } = require("@azure/data-tables");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function buildUserResponse(entity, orgName, organizationId) {
  return {
    id: entity.rowKey,
    email: entity.Email,
    firstName: entity.First_Name || "",
    middleName: entity.Middle_Name || "",
    lastName: entity.Last_Name || "",
    phoneNo: entity.Phone_No || "",
    organization: orgName,
    organizationId,
    role: entity.Role || "Participant",
    First_Name: entity.First_Name || "",
    Last_Name: entity.Last_Name || "",
    Organisation: orgName,
    Organization: orgName,
  };
}

module.exports = async function (context, req) {
  try {
    const { email, organization, password } = req.body || {};

    if (!email || !password || !organization) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "Email, organization, and password are required.",
        },
      };
      return;
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const orgClient = TableClient.fromConnectionString(
      connectionString,
      "Organization"
    );
    const participantClient = TableClient.fromConnectionString(
      connectionString,
      "Participants"
    );
    const orgParticipantClient = TableClient.fromConnectionString(
      connectionString,
      "OrganizationParticipants"
    );

    const normalizedEmail = normalize(email);
    const normalizedOrganization = normalize(organization);

    // Step 1: Validate organization exists
    let matchedOrg = null;
    for await (const entity of orgClient.listEntities()) {
      if (normalize(entity.Organization_Name) === normalizedOrganization) {
        matchedOrg = entity;
        break;
      }
    }

    if (!matchedOrg) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "Organization not found.",
        },
      };
      return;
    }

    const organizationId = matchedOrg.rowKey;
    const orgName = matchedOrg.Organization_Name || organization;

    // Step 2: Validate participant credentials
    let matchedParticipant = null;
    for await (const entity of participantClient.listEntities()) {
      const emailMatches = normalize(entity.Email) === normalizedEmail;
      const passwordMatches =
        String(entity.Password || "") === String(password);

      if (emailMatches && passwordMatches) {
        matchedParticipant = entity;
        break;
      }
    }

    if (!matchedParticipant) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "Invalid email or password.",
        },
      };
      return;
    }

    const participantId = matchedParticipant.rowKey;

    // Step 3: Validate participant is linked to the organization
    let isLinked = false;
    for await (const entity of orgParticipantClient.listEntities()) {
      if (
        entity.OrganizationId === organizationId &&
        entity.ParticipantId === participantId
      ) {
        isLinked = true;
        break;
      }
    }

    if (!isLinked) {
      context.res = {
        status: 401,
        body: {
          success: false,
          message: "You are not assigned to this organization.",
        },
      };
      return;
    }

    context.res = {
      status: 200,
      body: {
        success: true,
        user: buildUserResponse(matchedParticipant, orgName, organizationId),
      },
    };
  } catch (error) {
    context.log(error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
