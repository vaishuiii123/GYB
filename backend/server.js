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
const organizationsTable = TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING,"Organizations");

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
