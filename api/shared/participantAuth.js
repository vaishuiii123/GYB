const { getTableClient } = require("./tableHelper");
const { normalizePhone } = require("./smsProvider");
const { listOrganizationIdsForParticipant } = require("./workshopAccess");

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

function parsePhoneInput(rawPhone) {
  const normalizedPhone = normalizePhone(rawPhone);

  if (!normalizedPhone || normalizedPhone.length !== 10) {
    return {
      valid: false,
      message: "Enter a valid 10-digit mobile number.",
    };
  }

  return {
    valid: true,
    normalizedPhone,
  };
}

async function findParticipantByPhone(normalizedPhone) {
  const participantClient = getTableClient("Participants");

  for await (const entity of participantClient.listEntities()) {
    if (normalizePhone(entity.Phone_No) === normalizedPhone) {
      return entity;
    }
  }

  return null;
}

async function findParticipantByUsername(username) {
  const normalizedUsername = String(username || "")
    .trim()
    .toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  const participantClient = getTableClient("Participants");

  let emailMatch = null;

  for await (const entity of participantClient.listEntities()) {
    const storedUsername = String(entity.Username || "")
      .trim()
      .toLowerCase();
    const storedEmail = String(entity.Email || "")
      .trim()
      .toLowerCase();

    if (storedUsername && storedUsername === normalizedUsername) {
      return entity;
    }

    if (!emailMatch && storedEmail === normalizedUsername) {
      emailMatch = entity;
    }
  }

  return emailMatch;
}

async function getLoginContextForParticipant(participant) {
  if (!participant) {
    return null;
  }

  const orgClient = getTableClient("Organization");

  const organizationIds = await listOrganizationIdsForParticipant(
    participant.rowKey
  );
  const organizationId = organizationIds[0] || "";

  if (!organizationId) {
    return {
      participant,
      organizationId: "",
      orgName: "",
      missingOrganization: true,
    };
  }

  let orgName = participant.Organisation || "";
  try {
    const orgEntity = await orgClient.getEntity("Organization", organizationId);
    orgName = orgEntity.Organization_Name || orgName;
  } catch {
    // fall back to participant organisation field
  }

  return {
    participant,
    organizationId,
    orgName,
    missingOrganization: false,
  };
}

async function getParticipantLoginContext(normalizedPhone) {
  const participant = await findParticipantByPhone(normalizedPhone);

  if (!participant) {
    return null;
  }

  return getLoginContextForParticipant(participant);
}

async function getParticipantLoginContextByUsername(username) {
  const participant = await findParticipantByUsername(username);

  if (!participant) {
    return null;
  }

  return getLoginContextForParticipant(participant);
}

async function saveParticipantOtp(participantId, otp, expiresAt) {
  const participantClient = getTableClient("Participants");

  await participantClient.updateEntity(
    {
      partitionKey: "Participant",
      rowKey: participantId,
      OtpCode: otp,
      OtpExpiresAt: expiresAt.toISOString(),
    },
    "Merge"
  );
}

async function clearParticipantOtp(participantId) {
  const participantClient = getTableClient("Participants");

  await participantClient.updateEntity(
    {
      partitionKey: "Participant",
      rowKey: participantId,
      OtpCode: "",
      OtpExpiresAt: "",
    },
    "Merge"
  );
}

function getOtpValidityMinutes() {
  const digits = String(process.env.WORKSHOP_SMS_VALID_MINUTES || "30").replace(
    /\D/g,
    ""
  );
  return digits || "30";
}

module.exports = {
  buildUserResponse,
  parsePhoneInput,
  findParticipantByPhone,
  findParticipantByUsername,
  getParticipantLoginContext,
  getParticipantLoginContextByUsername,
  saveParticipantOtp,
  clearParticipantOtp,
  getOtpValidityMinutes,
};
