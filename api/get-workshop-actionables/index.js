const { getWorkshopById } = require("../shared/workshopAccess");
const {
  listActionablesForWorkshop,
} = require("../shared/workshopResponseStore");
const {
  loadAllParticipantRecords,
  loadParticipantDisplayName,
  loadStoredParticipantNames,
  pickDisplayName,
} = require("../shared/participantNames");
const { getTableClient, escapeODataValue } = require("../shared/tableHelper");

async function participantBelongsToOrganization(participantId, organizationId) {
  const normalizedParticipantId = String(participantId || "").trim();
  const normalizedOrganizationId = String(organizationId || "").trim();
  if (!normalizedParticipantId || !normalizedOrganizationId) {
    return false;
  }

  const client = getTableClient("OrganizationParticipants");

  try {
    for await (const entity of client.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${escapeODataValue(
          normalizedOrganizationId
        )}' and RowKey eq '${escapeODataValue(normalizedParticipantId)}'`,
      },
    })) {
      if (entity) {
        return true;
      }
    }
  } catch {
    // fall through to broader checks
  }

  try {
    for await (const entity of client.listEntities({
      queryOptions: {
        filter: `RowKey eq '${escapeODataValue(normalizedParticipantId)}'`,
      },
    })) {
      const orgId = String(
        entity.OrganizationId || entity.partitionKey || ""
      ).trim();
      if (orgId === normalizedOrganizationId) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

module.exports = async function (context, req) {
  try {
    const workshopId = String(req.query.workshopId || "").trim();
    const participantId = String(req.query.participantId || "").trim();

    if (!workshopId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "workshopId is required.",
        },
      };
      return;
    }

    if (!participantId) {
      context.res = {
        status: 400,
        body: {
          success: false,
          message: "participantId is required.",
        },
      };
      return;
    }

    const workshop = await getWorkshopById(workshopId);
    if (!workshop) {
      context.res = {
        status: 404,
        body: {
          success: false,
          message: "Workshop not found.",
        },
      };
      return;
    }

    const allowed = await participantBelongsToOrganization(
      participantId,
      workshop.organizationId
    );
    if (!allowed) {
      context.res = {
        status: 403,
        body: {
          success: false,
          message: "You do not have access to this workshop report.",
        },
      };
      return;
    }

    const actionableGroups = await listActionablesForWorkshop(workshopId);
    const participantIdList = actionableGroups
      .map((group) => String(group.participantId || "").trim())
      .filter(Boolean);

    const [participantRecords, storedNames] = await Promise.all([
      loadAllParticipantRecords(),
      loadStoredParticipantNames(participantIdList),
    ]);

    await Promise.all(
      participantIdList.map(async (id) => {
        if (participantRecords.has(id)) {
          return;
        }
        const displayName = await loadParticipantDisplayName(id);
        if (displayName) {
          participantRecords.set(id, {
            id,
            firstName: "",
            middleName: "",
            lastName: "",
            email: "",
            phoneNo: "",
            displayName,
          });
        }
      })
    );

    const rows = [];

    actionableGroups.forEach((group) => {
      const id = String(group.participantId || "").trim();
      const record = participantRecords.get(id);
      const participantName =
        pickDisplayName(
          record?.displayName,
          storedNames.get(id)
        ) || "Unknown";

      (group.items || []).forEach((item) => {
        rows.push({
          id: item.id || "",
          participantId: id,
          participant: participantName,
          categoryName: item.categoryName || "",
          categoryPath: item.categoryPath || "",
          description: item.description || "",
          timeline: item.timeline || "",
          responsiblePersons: item.responsiblePersons || "",
          comments: item.comments || "",
          createdDate: item.createdDate || "",
          updatedDate: item.updatedDate || "",
        });
      });
    });

    rows.sort((a, b) => {
      const byName = String(a.participant).localeCompare(String(b.participant));
      if (byName !== 0) {
        return byName;
      }
      return String(b.updatedDate || b.createdDate || "").localeCompare(
        String(a.updatedDate || a.createdDate || "")
      );
    });

    context.res = {
      status: 200,
      headers: {
        // Live admin/participant reports poll this endpoint; avoid browser caching.
        "Cache-Control": "private, no-store",
      },
      body: {
        success: true,
        workshop: {
          id: workshop.id,
          workshopName: workshop.workshopName || "",
          organizationId: workshop.organizationId || "",
          organizationName: workshop.organizationName || "",
        },
        data: rows,
      },
    };
  } catch (error) {
    context.log(error);
    context.res = {
      status: 500,
      body: {
        success: false,
        message: error.message,
      },
    };
  }
};
