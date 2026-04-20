// Domain read/write helpers over Airtable. Normalizes records into UI-shaped objects
// and handles role-scoped access.

import {
  airtableList,
  airtableGet,
  airtableCreate,
  airtableUpdate,
  escapeFormula,
  TABLES,
} from "@/lib/orders/airtable";
import { ROLES, STAGES } from "@/lib/orders/constants";

// ---------- Clients ----------

export async function listClients() {
  const rows = await airtableList(TABLES.clients(), { sort: [{ field: "Name" }] });
  return rows.map(normClient);
}

export async function getClient(id) {
  const row = await airtableGet(TABLES.clients(), id);
  return row ? normClient(row) : null;
}

export async function createClient(fields) {
  const row = await airtableCreate(TABLES.clients(), {
    Name: fields.name,
    Code: fields.code || "",
    "Contact Person": fields.contactPerson || "",
    "Contact Email": fields.contactEmail || "",
    "Contact Phone": fields.contactPhone || "",
    Created: new Date().toISOString(),
  });
  return normClient(row);
}

export async function updateClient(id, fields) {
  const patch = {};
  if (fields.name !== undefined) patch.Name = fields.name;
  if (fields.code !== undefined) patch.Code = fields.code;
  if (fields.contactPerson !== undefined) patch["Contact Person"] = fields.contactPerson;
  if (fields.contactEmail !== undefined) patch["Contact Email"] = fields.contactEmail;
  if (fields.contactPhone !== undefined) patch["Contact Phone"] = fields.contactPhone;
  const row = await airtableUpdate(TABLES.clients(), id, patch);
  return normClient(row);
}

function normClient(row) {
  const f = row.fields || {};
  return {
    id: row.id,
    name: f.Name || "",
    code: f.Code || "",
    contactPerson: f["Contact Person"] || "",
    contactEmail: f["Contact Email"] || "",
    contactPhone: f["Contact Phone"] || "",
  };
}

// ---------- Users ----------

export async function listUsers() {
  const rows = await airtableList(TABLES.users(), { sort: [{ field: "Email" }] });
  return rows.map(normUser);
}

export async function findUserByEmail(email) {
  const rows = await airtableList(TABLES.users(), {
    filterByFormula: `LOWER({Email})='${escapeFormula(email.toLowerCase())}'`,
    maxRecords: 1,
  });
  return rows[0] ? normUser(rows[0]) : null;
}

export async function createUser(fields) {
  const row = await airtableCreate(TABLES.users(), {
    Email: fields.email,
    Name: fields.name || "",
    Role: fields.role,
    Client: fields.clientIds && fields.clientIds.length ? fields.clientIds : undefined,
    Active: fields.active !== false,
    Created: new Date().toISOString(),
  });
  return normUser(row);
}

export async function updateUser(id, fields) {
  const patch = {};
  if (fields.name !== undefined) patch.Name = fields.name;
  if (fields.role !== undefined) patch.Role = fields.role;
  if (fields.clientIds !== undefined) patch.Client = fields.clientIds;
  if (fields.active !== undefined) patch.Active = fields.active;
  const row = await airtableUpdate(TABLES.users(), id, patch);
  return normUser(row);
}

function normUser(row) {
  const f = row.fields || {};
  return {
    id: row.id,
    email: (f.Email || "").toLowerCase(),
    name: f.Name || "",
    role: f.Role || ROLES.CUSTOMER,
    clientIds: Array.isArray(f.Client) ? f.Client : [],
    active: f.Active !== false,
  };
}

// ---------- Jobs ----------

export async function listJobsForSession(session) {
  const all = await airtableList(TABLES.jobs(), { sort: [{ field: "J#", direction: "desc" }] });
  const jobs = all.map(normJob);

  if (session.role === ROLES.ADMIN || session.role === ROLES.FACTORY_MANAGER) {
    return jobs;
  }
  if (session.role === ROLES.ACCOUNT_MANAGER) {
    const myClients = new Set(session.clientIds || []);
    // AM sees jobs whose client is in their assigned list, OR where they're the customer manager.
    return jobs.filter(
      (j) =>
        j.clientIds.some((cid) => myClients.has(cid)) ||
        (j.customerManagerId && j.customerManagerId === session.userId),
    );
  }
  if (session.role === ROLES.CUSTOMER) {
    const myClients = new Set(session.clientIds || []);
    return jobs.filter((j) => j.clientIds.some((cid) => myClients.has(cid)));
  }
  return [];
}

export async function getJob(id) {
  const row = await airtableGet(TABLES.jobs(), id);
  return row ? normJob(row) : null;
}

export async function getJobByJNumber(jNumber) {
  const rows = await airtableList(TABLES.jobs(), {
    filterByFormula: `{J#}='${escapeFormula(jNumber)}'`,
    maxRecords: 1,
  });
  return rows[0] ? normJob(rows[0]) : null;
}

export async function createJob(fields) {
  const now = new Date().toISOString();
  const row = await airtableCreate(TABLES.jobs(), {
    ...shapeJobFields(fields),
    Created: now,
    "Last Updated": now,
  });
  return normJob(row);
}

export async function updateJob(id, fields) {
  const row = await airtableUpdate(TABLES.jobs(), id, {
    ...shapeJobFields(fields),
    "Last Updated": new Date().toISOString(),
  });
  return normJob(row);
}

function shapeJobFields(f) {
  const out = {};
  if (f.jNumber !== undefined) out["J#"] = f.jNumber;
  if (f.clientId !== undefined) out.Client = f.clientId ? [f.clientId] : [];
  if (f.brand !== undefined) out.Brand = f.brand;
  if (f.customerManagerId !== undefined) out["Customer Manager"] = f.customerManagerId ? [f.customerManagerId] : [];
  if (f.category !== undefined) out.Category = f.category;
  if (f.item !== undefined) out.Item = f.item;
  if (f.city !== undefined) out.City = f.city;
  if (f.qty !== undefined) out.Qty = f.qty;
  if (f.orderDate !== undefined) out["Order Date"] = f.orderDate;
  if (f.expectedDispatchDate !== undefined) out["Expected Dispatch Date"] = f.expectedDispatchDate;
  if (f.stage !== undefined) out.Stage = f.stage;
  if (f.internalStatus !== undefined) out["Internal Status"] = f.internalStatus;
  if (f.poNumber !== undefined) out["PO Number"] = f.poNumber;
  if (f.rmType !== undefined) out["RM Type"] = f.rmType;
  if (f.rmSupplier !== undefined) out["RM Supplier"] = f.rmSupplier;
  if (f.paperType !== undefined) out["Paper Type"] = f.paperType;
  if (f.gsm !== undefined) out.GSM = f.gsm;
  if (f.printingVendor !== undefined) out["Printing Vendor"] = f.printingVendor;
  if (f.actionPoints !== undefined) out["Action Points"] = f.actionPoints;
  if (f.notes !== undefined) out.Notes = f.notes;
  return out;
}

function normJob(row) {
  const f = row.fields || {};
  return {
    id: row.id,
    jNumber: f["J#"] || "",
    clientIds: Array.isArray(f.Client) ? f.Client : [],
    brand: f.Brand || "",
    customerManagerId: Array.isArray(f["Customer Manager"]) ? f["Customer Manager"][0] : undefined,
    category: f.Category || "",
    item: f.Item || "",
    city: f.City || "",
    qty: typeof f.Qty === "number" ? f.Qty : null,
    orderDate: f["Order Date"] || null,
    expectedDispatchDate: f["Expected Dispatch Date"] || null,
    stage: f.Stage || STAGES[0],
    internalStatus: f["Internal Status"] || "",
    poNumber: f["PO Number"] || "",
    rmType: f["RM Type"] || "",
    rmSupplier: f["RM Supplier"] || "",
    paperType: f["Paper Type"] || "",
    gsm: typeof f.GSM === "number" ? f.GSM : null,
    printingVendor: f["Printing Vendor"] || "",
    actionPoints: f["Action Points"] || "",
    notes: f.Notes || "",
    lastUpdated: f["Last Updated"] || null,
  };
}

// ---------- Status Updates ----------

export async function listJobUpdates(jobId) {
  const rows = await airtableList(TABLES.updates(), {
    filterByFormula: `FIND('${escapeFormula(jobId)}', ARRAYJOIN({Job}))`,
    sort: [{ field: "Created", direction: "desc" }],
  });
  return rows.map(normUpdate);
}

export async function addJobUpdate({ jobId, stage, note, updatedByEmail, updatedByName }) {
  const now = new Date();
  const summary = `${stage} · ${now.toISOString().slice(0, 16).replace("T", " ")}${updatedByName ? ` · ${updatedByName}` : ""}`;
  const row = await airtableCreate(TABLES.updates(), {
    Summary: summary,
    Job: [jobId],
    Stage: stage,
    Note: note || "",
    "Updated By Email": updatedByEmail || "",
    "Updated By Name": updatedByName || "",
    Created: now.toISOString(),
  });
  return normUpdate(row);
}

function normUpdate(row) {
  const f = row.fields || {};
  return {
    id: row.id,
    jobId: Array.isArray(f.Job) ? f.Job[0] : undefined,
    stage: f.Stage || "",
    note: f.Note || "",
    updatedByEmail: f["Updated By Email"] || "",
    updatedByName: f["Updated By Name"] || "",
    createdAt: f.Created || null,
  };
}
