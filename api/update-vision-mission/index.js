const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    try {
        const tableClient = TableClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING,
            "VisionMission"
        );

        const { visionText, missionText, modifiedBy } = req.body;

        const entity = {
            partitionKey: "VisionMission",
            rowKey: "default",
            VisionText: visionText || "",
            MissionText: missionText || "",
            ModifiedBy: modifiedBy || "Admin",
            ModifiedDate: new Date().toISOString(),
        };

        try {
            await tableClient.getEntity("VisionMission", "default");
            await tableClient.updateEntity(entity, "Replace");
        } catch {
            await tableClient.createEntity(entity);
        }

        context.res = {
            status: 200,
            body: {
                success: true,
                message: "Vision and Mission updated successfully.",
                data: entity,
            },
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: {
                success: false,
                message: error.message,
            },
        };
    }
};
