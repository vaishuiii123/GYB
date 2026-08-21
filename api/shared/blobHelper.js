const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER_NAME = "od-attachments";

let containerClientPromise;

function getConnectionString() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured.");
  }
  return connectionString;
}

async function getAttachmentContainer() {
  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const serviceClient = BlobServiceClient.fromConnectionString(
        getConnectionString()
      );
      const containerClient = serviceClient.getContainerClient(CONTAINER_NAME);

      try {
        await containerClient.createIfNotExists();
      } catch (error) {
        // Ignore race where container was created concurrently.
        if (error.statusCode !== 409) {
          throw error;
        }
      }

      return containerClient;
    })();
  }

  return containerClientPromise;
}

/**
 * @param {string} blobPath
 * @param {Buffer} buffer
 * @param {string} contentType
 */
async function uploadAttachmentBlob(blobPath, buffer, contentType) {
  const containerClient = await getAttachmentContainer();
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType || "application/octet-stream",
    },
  });

  return {
    blobPath,
    url: blockBlobClient.url,
  };
}

async function downloadAttachmentBlob(blobPath) {
  const containerClient = await getAttachmentContainer();
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
  const download = await blockBlobClient.download(0);
  const chunks = [];

  for await (const chunk of download.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType:
      download.contentType || "application/octet-stream",
    contentLength: download.contentLength,
  };
}

module.exports = {
  CONTAINER_NAME,
  getAttachmentContainer,
  uploadAttachmentBlob,
  downloadAttachmentBlob,
};
