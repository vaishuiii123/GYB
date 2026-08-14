const { getTableClient } = require("./tableHelper");
const UNLOCK_VALUE_HIERARCHY = [
  {
    name: "Markets & Customers",
    middles: [
      {
        name: "Volume",
        parents: [
          {
            name: "Acquire New Customers",
            categories: ["Marketing & Sales"],
          },
          {
            name: "Retain and Grow Existing Customers",
            categories: [
              "Product & Service Innovation",
              "Account Management",
              "Retention & Cross Sell/Up Sell",
            ],
          },
        ],
      },
      {
        name: "Price Realization",
        parents: [
          {
            name: "Strengthen Pricing",
            categories: ["Demand & Supply Management", "Price Optimization"],
          },
        ],
      },
    ],
  },
  {
    name: "Operating Costs (after taxes)",
    middles: [
      {
        name: "Selling, General & Administrative (SG&A)",
        parents: [
          {
            name: "Improve Customer Interaction Effectiveness",
            categories: [
              "Marketing & Advertising",
              "Sales",
              "Customer Service & Support",
              "Order Fulfillment & Billing",
            ],
          },
          {
            name: "Improve Corporate/Shared Services Effectiveness",
            categories: [
              "IT, Telecom & Networking",
              "Real Estate",
              "Human Resources",
              "Procurement",
              "Business Management",
              "Financial Management",
            ],
          },
        ],
      },
      {
        name: "Cost of Goods Sold (COGS)",
        parents: [
          {
            name: "Improve Development & Production Effectiveness",
            categories: ["Product Development", "Raw Materials", "Production"],
          },
          {
            name: "Improve Logistics & Service Effectiveness",
            categories: ["Logistics and Distribution", "Service Delivery"],
          },
        ],
      },
    ],
  },
  {
    name: "Intangible & Tangible Assets & Working Capital",
    middles: [
      {
        name: "Tangible & Intangible Assets",
        parents: [
          {
            name: "Improve Tangible & Intangible Efficiency",
            categories: [
              "Real Estate Infrastructure & Systems",
              "Intangibles",
            ],
          },
        ],
      },
      {
        name: "Inventory",
        parents: [
          {
            name: "Improve Inventory Efficiency",
            categories: ["Finished Goods / WIP"],
          },
        ],
      },
      {
        name: "Receivables & Payables",
        parents: [
          {
            name: "Improve Receivables & Payables Efficiency",
            categories: ["Accounts, Notes & Interest"],
          },
        ],
      },
    ],
  },
  {
    name: "Business Planning & Decision Making",
    middles: [
      {
        name: "Company Strengths",
        parents: [
          {
            name: "Improve Management & Governance Effectiveness",
            categories: [
              "Business Planning",
              "Governance",
              "Business Performance Management",
            ],
          },
        ],
      },
      {
        name: "External Factors",
        parents: [
          {
            name: "Improve Execution Capabilities",
            categories: [
              "Operational Excellence",
              "Partnership/Collaborative Relationship Strength",
              "Agility & Flexibility",
              "Strategic Assets",
            ],
          },
        ],
      },
    ],
  },
];

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  return normalizeName(a) === normalizeName(b);
}

function nextId(prefix, entities, pad = 3) {
  let maxId = 0;

  for (const entity of entities) {
    const currentId = parseInt(String(entity.rowKey).replace(prefix, ""), 10);
    if (!Number.isNaN(currentId) && currentId > maxId) {
      maxId = currentId;
    }
  }

  return `${prefix}${String(maxId + 1).padStart(pad, "0")}`;
}

async function listByPartition(client, partitionKey) {
  const entities = [];

  for await (const entity of client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${partitionKey}'`,
    },
  })) {
    entities.push(entity);
  }

  return entities;
}

async function getOrCreateTop(topClient, name, createdBy, stats) {
  const existing = await listByPartition(topClient, "TopCategory");
  const match = existing.find((entity) =>
    namesMatch(entity.TopCategoryName, name)
  );

  if (match) {
    return match.rowKey;
  }

  const rowKey = nextId("TOP", existing);
  const now = new Date().toISOString();

  await topClient.createEntity({
    partitionKey: "TopCategory",
    rowKey,
    TopCategoryName: name,
    CreatedBy: createdBy,
    CreatedDate: now,
    ModifiedBy: createdBy,
    ModifiedDate: now,
  });

  stats.topCreated += 1;
  return rowKey;
}

async function getOrCreateMiddle(
  middleClient,
  topCategoryId,
  name,
  createdBy,
  stats
) {
  const existing = await listByPartition(middleClient, "MiddleCategory");
  const match = existing.find(
    (entity) =>
      entity.TopCategoryId === topCategoryId &&
      namesMatch(entity.MiddleCategoryName, name)
  );

  if (match) {
    return match.rowKey;
  }

  const rowKey = nextId("MID", existing);
  const now = new Date().toISOString();

  await middleClient.createEntity({
    partitionKey: "MiddleCategory",
    rowKey,
    MiddleCategoryName: name,
    TopCategoryId: topCategoryId,
    CreatedBy: createdBy,
    CreatedDate: now,
    ModifiedBy: createdBy,
    ModifiedDate: now,
  });

  stats.middleCreated += 1;
  return rowKey;
}

async function getOrCreateParent(
  parentClient,
  middleCategoryId,
  name,
  createdBy,
  stats
) {
  const existing = await listByPartition(parentClient, "ParentCategory");
  const match = existing.find(
    (entity) =>
      entity.MiddleCategoryId === middleCategoryId &&
      namesMatch(entity.ParentCategoryName, name)
  );

  if (match) {
    return match.rowKey;
  }

  const rowKey = nextId("PAR", existing);
  const now = new Date().toISOString();

  await parentClient.createEntity({
    partitionKey: "ParentCategory",
    rowKey,
    ParentCategoryName: name,
    MiddleCategoryId: middleCategoryId,
    CreatedBy: createdBy,
    CreatedDate: now,
    ModifiedBy: createdBy,
    ModifiedDate: now,
  });

  stats.parentCreated += 1;
  return rowKey;
}

async function getOrCreateCategory(
  categoryClient,
  parentCategoryId,
  name,
  createdBy,
  stats
) {
  const existing = await listByPartition(categoryClient, "Category");
  const match = existing.find(
    (entity) =>
      entity.ParentCategoryId === parentCategoryId &&
      namesMatch(entity.CategoryName, name)
  );

  if (match) {
    return match.rowKey;
  }

  const rowKey = nextId("CAT", existing);
  const now = new Date().toISOString();

  await categoryClient.createEntity({
    partitionKey: "Category",
    rowKey,
    CategoryName: name,
    ParentCategoryId: parentCategoryId,
    TagId: "",
    CreatedBy: createdBy,
    CreatedDate: now,
    ModifiedBy: createdBy,
    ModifiedDate: now,
  });

  stats.categoryCreated += 1;
  return rowKey;
}

async function seedUnlockValueCategories(connectionString, createdBy = "Admin") {
  

  const topClient = getTableClient("QuestionnaireTopCategory");
  const middleClient = getTableClient("QuestionnaireMiddleCategory");
  const parentClient = getTableClient("QuestionnaireParentCategory");
  const categoryClient = getTableClient("QuestionnaireCategory");

  const stats = {
    topCreated: 0,
    middleCreated: 0,
    parentCreated: 0,
    categoryCreated: 0,
  };

  for (const top of UNLOCK_VALUE_HIERARCHY) {
    const topCategoryId = await getOrCreateTop(
      topClient,
      top.name,
      createdBy,
      stats
    );

    for (const middle of top.middles) {
      const middleCategoryId = await getOrCreateMiddle(
        middleClient,
        topCategoryId,
        middle.name,
        createdBy,
        stats
      );

      for (const parent of middle.parents) {
        const parentCategoryId = await getOrCreateParent(
          parentClient,
          middleCategoryId,
          parent.name,
          createdBy,
          stats
        );

        for (const categoryName of parent.categories) {
          await getOrCreateCategory(
            categoryClient,
            parentCategoryId,
            categoryName,
            createdBy,
            stats
          );
        }
      }
    }
  }

  return stats;
}

module.exports = {
  UNLOCK_VALUE_HIERARCHY,
  seedUnlockValueCategories,
};
