const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    try {
        const tableClient = TableClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING,
            "VisionMission"
        );

        try {
            const entity = await tableClient.getEntity(
                "VisionMission",
                "default"
            );

            context.res = {
                status: 200,
                body: {
                    success: true,
                    data: {
                        visionText: entity.VisionText || "",
                        missionText: entity.MissionText || "",
                        modifiedBy: entity.ModifiedBy || "",
                        modifiedDate: entity.ModifiedDate || "",
                    },
                },
            };
        } catch {
            context.res = {
                status: 200,
                body: {
                    success: true,
                    data: {
                        visionText: "",
                        missionText: "",
                        modifiedBy: "",
                        modifiedDate: "",
                    },
                },
            };
        }
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
