require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "OK"
    });
});


// Azure Storage
const { TableClient } = require("@azure/data-tables");

const participantsTable = TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING,"Participants");
const workshopsTable = TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING,"Workshops");
const organizationsTable = TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING,"organizations");

app.post("/api/gyb/login", async (req, res) => {
    try {
        const { email, organization, password } = req.body;
        let found = false;
        let user = null;
        for await (const entity of participantsTable.listEntities()) {
            if (
                entity.Email === email &&
                entity.Organisation === organization &&
                entity.Password === password
            ) {
                found = true;
                user = entity;
                break;
            }
        }
        res.status(200).json({
            success: found,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

//**************************** GET ORGANIZATION

app.get("/api/gyb/organizations", async (req, res) => {
    try {
        const { createdBy } = req.query;
        const organizations = [];
        for await (const entity of organizationsTable.listEntities()) {
            if (
                entity.Created_By &&
                createdBy &&
                entity.Created_By.toLowerCase() === createdBy.toLowerCase()
            ) {
                organizations.push({
                    id: entity.rowKey,
                    organizationName: entity.Organization_Name || "",
                    contactPerson: entity.Contact_Person || "",
                    email: entity.Email || "",
                    createdBy: entity.Created_By || "",
                });
            }
        }

        res.status(200).json({
            success: true,
            organizations
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
