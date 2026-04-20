// Domain read/write helpers over Airtable. Normalizes records into UI-shaped objects
// and handles role-scoped access.

import {
  airtableList,
  airtableGet,
  airtableCreate,
  airtableUpdate,
  airtableDelete,
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
    "Brand Manager": fields.brandManager || "",
    "Brand Manager Email": fields.brandManagerEmail || "",
    Created: new Date().toISOString(),
  });
  return normClient(row);
}

// Count jobs linked to a client (used for the delete-confirmation preview).
export async function countJobsForClient(clientId) {
  const rows = await airtableList(TABLES.jobs(), {
    filterByFormula: `FIND('${escapeFormula(clientId)}', ARRAYJOIN({Client}))`,
  });
  return rows.length;
}

// Cascade-delete a client and every Job + Job Status Update that references it.
// Returns counts so the caller can show confirmation.
export async function deleteClient(clientId) {
  const jobs = await airtableList(TABLES.jobs(), {
    filterByFormula: `FIND('${escapeFormula(clientId)}', ARRAYJOIN({Client}))`,
  });
  let deletedUpdates = 0;
  for (const job of jobs) {
    const updates = await airtableList(TABLES.updates(), {
      filterByFormula: `FIND('${escapeFormula(job.id)}', ARRAYJOIN({Job}))`,
    });
    for (const u of updates) {
      await airtableDelete(TABLES.updates(), u.id);
      deletedUpdates++;
    }
    await airtableDelete(TABLES.jobs(), job.id);
  }
  await airtableDelete(TABLES.clients(), clientId);
  return { deletedJobs: jobs.length, deletedUpdates };
}

export async function updateClient(id, fields) {
  const patch = {};
  if (fields.name !== undefined) patch.Name = fields.name;
  if (fields.code !== undefined) patch.Code = fields.code;
  if (fields.contactPerson !== undefined) patch["Contact Person"] = fields.contactPerson;
  if (fields.contactEmail !== undefined) patch["Contact Email"] = fields.contactEmail;
  if (fields.contactPhone !== undefined) patch["Contact Phone"] = fields.contactPhone;
  if (fields.brandManager !== undefined) patch["Brand Manager"] = fields.brandManager;
  if (fields.brandManagerEmail !== undefined) patch["Brand Manager Email"] = fields.brandManagerEmail;
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
    brandManager: f["Brand Manager"] || "",
    brandManagerEmail: f["Brand Manager Email"] || "",
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
  if (fields.designation !== undefined) patch.Designation = fields.designation;
  if (fields.phone !== undefined) patch.Phone = fields.phone;
  const row = await airtableUpdate(TABLES.users(), id, patch);
  return normUser(row);
}

export async function getUser(id) {
  const row = await airtableGet(TABLES.users(), id);
  return row ? normUser(row) : null;
}

export async function attachUserPhoto({ userId, contentType, filename, fileBase64 }) {
  const baseId = process.env.AIRTABLE_ORDERS_BASE_ID;
  const token = process.env.AIRTABLE_TOKEN;
  const res = await fetch(
    `https://content.airtable.com/v0/${baseId}/${userId}/${encodeURIComponent("Photo")}/uploadAttachment`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, filename, file: fileBase64 }),
    },
  );
  if (!res.ok) throw new Error(`attach photo failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function normUser(row) {
  const f = row.fields || {};
  const photos = Array.isArray(f.Photo) ? f.Photo : [];
  const photo = photos[0];
  return {
    id: row.id,
    email: (f.Email || "").toLowerCase(),
    name: f.Name || "",
    role: f.Role || ROLES.CUSTOMER,
    clientIds: Array.isArray(f.Client) ? f.Client : [],
    active: f.Active !== false,
    designation: f.Designation || "",
    phone: f.Phone || "",
    photoUrl: photo?.thumbnails?.small?.url || photo?.url || null,
    photoFullUrl: photo?.url || null,
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
  if (f.itemSize !== undefined) out["Item Size"] = f.itemSize;
  if (f.city !== undefined) out.City = f.city;
  if (f.qty !== undefined) out.Qty = f.qty;
  if (f.orderDate !== undefined) out["Order Date"] = f.orderDate;
  if (f.expectedDispatchDate !== undefined) out["Expected Dispatch Date"] = f.expectedDispatchDate;
  if (f.estimatedDeliveryDate !== undefined) out["Estimated Delivery Date"] = f.estimatedDeliveryDate;
  if (f.stage !== undefined) out.Stage = f.stage;
  if (f.internalStatus !== undefined) out["Internal Status"] = f.internalStatus;
  if (f.poNumber !== undefined) out["PO Number"] = f.poNumber;
  if (f.rmType !== undefined) out["RM Type"] = f.rmType;
  if (f.rmSupplier !== undefined) out["RM Supplier"] = f.rmSupplier;
  if (f.paperType !== undefined) out["Paper Type"] = f.paperType;
  if (f.gsm !== undefined) out.GSM = f.gsm;
  if (f.rmSizeMm !== undefined) out["RM Size (mm)"] = f.rmSizeMm;
  if (f.rmQtySheets !== undefined) out["RM Qty (Sheets)"] = f.rmQtySheets;
  if (f.rmQtyKgs !== undefined) out["RM Qty (kgs)"] = f.rmQtyKgs;
  if (f.rmDeliveryDate !== undefined) out["RM Delivery Date"] = f.rmDeliveryDate;
  if (f.printingType !== undefined) out["Printing Type"] = f.printingType;
  if (f.printingVendor !== undefined) out["Printing Vendor"] = f.printingVendor;
  if (f.printingDueDate !== undefined) out["Printing Due Date"] = f.printingDueDate;
  if (f.productionDueDate !== undefined) out["Production Due Date"] = f.productionDueDate;
  if (f.actionPoints !== undefined) out["Action Points"] = f.actionPoints;
  if (f.notes !== undefined) out.Notes = f.notes;
  if (f.urgent !== undefined) out.Urgent = !!f.urgent;
  if (f.transportMode !== undefined) out["Transport Mode"] = f.transportMode;
  if (f.lrOrVehicleNumber !== undefined) out["LR / Vehicle Number"] = f.lrOrVehicleNumber;
  if (f.driverContact !== undefined) out["Driver Contact"] = f.driverContact;
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
    itemSize: f["Item Size"] || "",
    city: f.City || "",
    qty: typeof f.Qty === "number" ? f.Qty : null,
    orderDate: f["Order Date"] || null,
    expectedDispatchDate: f["Expected Dispatch Date"] || null,
    estimatedDeliveryDate: f["Estimated Delivery Date"] || null,
    stage: f.Stage || STAGES[0],
    internalStatus: f["Internal Status"] || "",
    poNumber: f["PO Number"] || "",
    rmType: f["RM Type"] || "",
    rmSupplier: f["RM Supplier"] || "",
    paperType: f["Paper Type"] || "",
    gsm: typeof f.GSM === "number" ? f.GSM : null,
    rmSizeMm: typeof f["RM Size (mm)"] === "number" ? f["RM Size (mm)"] : null,
    rmQtySheets: typeof f["RM Qty (Sheets)"] === "number" ? f["RM Qty (Sheets)"] : null,
    rmQtyKgs: typeof f["RM Qty (kgs)"] === "number" ? f["RM Qty (kgs)"] : null,
    rmDeliveryDate: f["RM Delivery Date"] || null,
    printingType: f["Printing Type"] || "",
    printingVendor: f["Printing Vendor"] || "",
    printingDueDate: f["Printing Due Date"] || null,
    productionDueDate: f["Production Due Date"] || null,
    actionPoints: f["Action Points"] || "",
    notes: f.Notes || "",
    urgent: f.Urgent === true,
    transportMode: f["Transport Mode"] || "",
    lrOrVehicleNumber: f["LR / Vehicle Number"] || "",
    driverContact: f["Driver Contact"] || "",
    lrFiles: Array.isArray(f["LR Files"]) ? f["LR Files"].map((a) => ({
      id: a.id, url: a.url, filename: a.filename, size: a.size, type: a.type,
    })) : [],
    lastUpdated: f["Last Updated"] || null,
  };
}

export async function attachJobLrFile({ jobId, contentType, filename, fileBase64 }) {
  const baseId = process.env.AIRTABLE_ORDERS_BASE_ID;
  const token = process.env.AIRTABLE_TOKEN;
  const res = await fetch(
    `https://content.airtable.com/v0/${baseId}/${jobId}/${encodeURIComponent("LR Files")}/uploadAttachment`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, filename, file: fileBase64 }),
    },
  );
  if (!res.ok) throw new Error(`attach LR failed: ${res.status} ${await res.text()}`);
  return res.json();
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

// ---------- Customer POs ----------

export async function listCustomerPOs({ clientIds } = {}) {
  const rows = await airtableList(TABLES.customerPOs(), {
    sort: [{ field: "Created", direction: "desc" }],
  });
  const all = rows.map(normCustomerPO);
  if (!clientIds) return all;
  const allow = new Set(clientIds);
  return all.filter((po) => po.clientIds.some((c) => allow.has(c)));
}

export async function createCustomerPO({ poNumber, clientId, uploadedByEmail, notes }) {
  const row = await airtableCreate(TABLES.customerPOs(), {
    "PO Number": poNumber,
    Client: clientId ? [clientId] : undefined,
    "Uploaded By": uploadedByEmail || "",
    Notes: notes || "",
    Created: new Date().toISOString(),
  });
  return normCustomerPO(row);
}

export async function attachPoFile({ recordId, contentType, filename, fileBase64 }) {
  const baseId = process.env.AIRTABLE_ORDERS_BASE_ID;
  const token = process.env.AIRTABLE_TOKEN;
  const res = await fetch(
    `https://content.airtable.com/v0/${baseId}/${recordId}/${encodeURIComponent("File")}/uploadAttachment`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, filename, file: fileBase64 }),
    },
  );
  if (!res.ok) throw new Error(`attach failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------- Raw Materials ----------

export async function listRawMaterials({ activeOnly = false } = {}) {
  const rows = await airtableList(TABLES.rawMaterials(), { sort: [{ field: "Name" }] });
  const all = rows.map(normRawMaterial);
  return activeOnly ? all.filter((rm) => rm.active) : all;
}

export async function getRawMaterial(id) {
  const row = await airtableGet(TABLES.rawMaterials(), id);
  return row ? normRawMaterial(row) : null;
}

export async function createRawMaterial(fields) {
  const now = new Date().toISOString();
  const row = await airtableCreate(TABLES.rawMaterials(), {
    ...shapeRawMaterialFields(fields),
    Active: fields.active !== false,
    Created: now,
    "Last Updated": now,
  });
  return normRawMaterial(row);
}

export async function updateRawMaterial(id, fields) {
  const row = await airtableUpdate(TABLES.rawMaterials(), id, {
    ...shapeRawMaterialFields(fields),
    "Last Updated": new Date().toISOString(),
  });
  return normRawMaterial(row);
}

export async function deleteRawMaterial(id) {
  await airtableDelete(TABLES.rawMaterials(), id);
  return { ok: true };
}

// ---------- RM Receipts (invoice-driven stock receiving) ----------

export async function findRmByMasterName(masterName) {
  if (!masterName) return null;
  const rows = await airtableList(TABLES.rawMaterials(), {
    filterByFormula: `{Master RM}='${escapeFormula(masterName)}'`,
    maxRecords: 1,
  });
  return rows[0] ? normRawMaterial(rows[0]) : null;
}

// Record a full supplier invoice: creates one RM Receipt row per line and
// upserts the stock level on the matching Raw Materials row (creates the RM
// row if this master spec hasn't been stocked before).
export async function recordRmReceipt({
  invoiceNumber,
  invoiceDate,
  supplier,
  notes,
  createdByEmail,
  lines, // [{ masterPaperId, masterPaperName, paperType, gsm, bf, sizeMm, form, qtyRolls, qtyKgs }]
}) {
  const created = [];
  const now = new Date().toISOString();

  for (const line of lines || []) {
    const qtyRolls = Number.isFinite(line.qtyRolls) ? line.qtyRolls : 0;
    const qtyKgs = Number.isFinite(line.qtyKgs) ? line.qtyKgs : 0;
    if (qtyRolls <= 0 && qtyKgs <= 0) continue; // skip empty lines

    // Find or create the stock line for this master paper.
    let stockLine = line.masterPaperName ? await findRmByMasterName(line.masterPaperName) : null;
    if (stockLine) {
      await updateRawMaterial(stockLine.id, {
        qtyRolls: (stockLine.qtyRolls || 0) + qtyRolls,
        qtyKgs: Number(((stockLine.qtyKgs || 0) + qtyKgs).toFixed(2)),
        status: "In Stock",
      });
    } else {
      stockLine = await createRawMaterial({
        masterRmName: line.masterPaperName || "",
        paperType: line.paperType || "",
        gsm: line.gsm,
        bf: line.bf,
        sizeMm: line.sizeMm,
        form: line.form || "Rolls",
        supplier: supplier || "",
        qtyRolls,
        qtyKgs,
        status: "In Stock",
        active: true,
      });
    }

    const summary = `${invoiceNumber || "(no inv)"} · ${line.masterPaperName || "(no spec)"} · ${qtyRolls || 0} rolls · ${qtyKgs || 0} kgs`;
    const row = await airtableCreate(TABLES.rmReceipts(), {
      Summary: summary,
      "Invoice Number": invoiceNumber || "",
      "Invoice Date": invoiceDate || null,
      Supplier: supplier || "",
      "Master Paper Name": line.masterPaperName || "",
      "Master Paper ID": line.masterPaperId || "",
      "Qty (Rolls)": qtyRolls || null,
      "Qty (kgs)": qtyKgs || null,
      "Stock Line": stockLine ? [stockLine.id] : undefined,
      Notes: notes || "",
      "Created By Email": createdByEmail || "",
      Created: now,
    });
    created.push(normRmReceipt(row));
  }
  return created;
}

export async function listRmReceipts({ limit = 200 } = {}) {
  const rows = await airtableList(TABLES.rmReceipts(), {
    sort: [{ field: "Created", direction: "desc" }],
    maxRecords: limit,
  });
  return rows.map(normRmReceipt);
}

function normRmReceipt(row) {
  const f = row.fields || {};
  return {
    id: row.id,
    invoiceNumber: f["Invoice Number"] || "",
    invoiceDate: f["Invoice Date"] || null,
    supplier: f.Supplier || "",
    masterPaperName: f["Master Paper Name"] || "",
    masterPaperId: f["Master Paper ID"] || "",
    qtyRolls: typeof f["Qty (Rolls)"] === "number" ? f["Qty (Rolls)"] : null,
    qtyKgs: typeof f["Qty (kgs)"] === "number" ? f["Qty (kgs)"] : null,
    stockLineId: Array.isArray(f["Stock Line"]) ? f["Stock Line"][0] : null,
    notes: f.Notes || "",
    createdByEmail: f["Created By Email"] || "",
    createdAt: f.Created || null,
  };
}

// Auto-generate a human-readable label when `name` is not explicitly set.
function computeRmName(f) {
  const bits = [
    f.supplier,
    f.paperType,
    f.gsm != null ? `${f.gsm} GSM` : null,
    f.bf != null ? `${f.bf} BF` : null,
    f.sizeMm != null && f.sizeMm !== "" ? `${f.sizeMm}mm` : null,
    f.form,
  ].filter(Boolean);
  return bits.join(" · ");
}

function shapeRawMaterialFields(f) {
  const out = {};
  if (f.name !== undefined) out.Name = f.name;
  else {
    // Auto-generate Name whenever enough fields are provided.
    const label = computeRmName(f);
    if (label) out.Name = label;
  }
  if (f.paperType !== undefined) out["Paper Type"] = f.paperType;
  if (f.gsm !== undefined) out.GSM = f.gsm;
  if (f.bf !== undefined) out.BF = f.bf;
  if (f.sizeMm !== undefined) out["Size (mm)"] = f.sizeMm;
  if (f.form !== undefined) out.Form = f.form;
  if (f.supplier !== undefined) {
    out.Supplier = f.supplier;
    // Keep Mill (legacy column) in sync so nothing is orphaned.
    out.Mill = f.supplier;
  }
  if (f.baseRate !== undefined) out["Base Rate (INR/kg)"] = f.baseRate;
  if (f.discount !== undefined) out["Discount (INR/kg)"] = f.discount;
  if (f.transport !== undefined) out["Transport (INR/kg)"] = f.transport;
  if (f.wetStrengthExtra !== undefined) out["Wet Strength Extra (INR/kg)"] = f.wetStrengthExtra;
  if (f.notes !== undefined) out.Notes = f.notes;
  if (f.active !== undefined) out.Active = f.active;
  // Stock fields
  if (f.qtyRolls !== undefined) out["Qty (Rolls)"] = f.qtyRolls;
  if (f.qtyKgs !== undefined) out["Qty (kgs)"] = f.qtyKgs;
  if (f.coating !== undefined) out.Coating = f.coating;
  if (f.location !== undefined) out.Location = f.location;
  if (f.status !== undefined) out.Status = f.status;
  // Free-text pointer to the Paper RM Database master (stores `Material Name`).
  // Airtable links can't cross bases, so we keep it as text.
  if (f.masterRmName !== undefined) out["Master RM"] = f.masterRmName;
  return out;
}

function normRawMaterial(row) {
  const f = row.fields || {};
  return {
    id: row.id,
    name: f.Name || "",
    paperType: f["Paper Type"] || "",
    gsm: typeof f.GSM === "number" ? f.GSM : null,
    bf: typeof f.BF === "number" ? f.BF : null,
    sizeMm: typeof f["Size (mm)"] === "number" ? f["Size (mm)"] : (f["Size (mm)"] || null),
    form: f.Form || "",
    supplier: f.Supplier || f.Mill || "",
    baseRate: typeof f["Base Rate (INR/kg)"] === "number" ? f["Base Rate (INR/kg)"] : null,
    discount: typeof f["Discount (INR/kg)"] === "number" ? f["Discount (INR/kg)"] : null,
    transport: typeof f["Transport (INR/kg)"] === "number" ? f["Transport (INR/kg)"] : null,
    wetStrengthExtra: typeof f["Wet Strength Extra (INR/kg)"] === "number" ? f["Wet Strength Extra (INR/kg)"] : null,
    effectiveRate: typeof f["Effective Rate (INR/kg)"] === "number" ? f["Effective Rate (INR/kg)"] : null,
    notes: f.Notes || "",
    active: f.Active !== false,
    // Stock levels
    qtyRolls: typeof f["Qty (Rolls)"] === "number" ? f["Qty (Rolls)"] : null,
    qtyKgs: typeof f["Qty (kgs)"] === "number" ? f["Qty (kgs)"] : null,
    coating: f.Coating || "",
    location: f.Location || "",
    status: f.Status || "",
    masterRmName: f["Master RM"] || "",
    lastUpdated: f["Last Updated"] || null,
  };
}

function normCustomerPO(row) {
  const f = row.fields || {};
  const files = Array.isArray(f.File) ? f.File : [];
  const first = files[0];
  return {
    id: row.id,
    poNumber: f["PO Number"] || "",
    clientIds: Array.isArray(f.Client) ? f.Client : [],
    uploadedByEmail: f["Uploaded By"] || "",
    notes: f.Notes || "",
    createdAt: f.Created || null,
    fileUrl: first?.url || null,
    fileName: first?.filename || null,
    fileSize: first?.size || null,
    fileType: first?.type || null,
  };
}
