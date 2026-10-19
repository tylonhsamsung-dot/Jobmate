"use strict";

const KEY = "jobmate_data_v1";

const emptyData = () => ({
  customers: [],
  jobs: [],
  documents: [],
  settings: {
    name: "",
    phone: "",
    email: "",
    address: ""
  },
  nextId: 1
});

let db = loadData();

function loadData() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...emptyData(), ...JSON.parse(saved) } : emptyData();
  } catch (e) {
    return emptyData();
  }
}

function saveData() {
  localStorage.setItem(KEY, JSON.stringify(db));
  render();
}

function id() {
  return db.nextId++;
}

function money(value) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR"
  }).format(Number(value) || 0);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showTab(tab) {
  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== tab);
  });
  window.scrollTo(0, 0);
}

function addCustomer() {
  const name = prompt("Customer's full name:");
  if (!name || !name.trim()) return;

  const phone = prompt("Phone number:", "") || "";
  const email = prompt("Email address:", "") || "";
  const address = prompt("Customer address:", "") || "";

  db.customers.push({
    id: id(),
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: address.trim()
  });

  saveData();
}

function editCustomer(customerId) {
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) return;

  const name = prompt("Customer name:", customer.name);
  if (!name || !name.trim()) return;

  customer.name = name.trim();
  customer.phone = prompt("Phone:", customer.phone) ?? customer.phone;
  customer.email = prompt("Email:", customer.email) ?? customer.email;
  customer.address = prompt("Address:", customer.address) ?? customer.address;

  saveData();
}

function deleteCustomer(customerId) {
  const linked = db.jobs.some(j => j.customerId === customerId) ||
    db.documents.some(d => d.customerId === customerId);

  if (linked) {
    alert("This customer is linked to a job or document. Keep the record to preserve your history.");
    return;
  }

  if (confirm("Delete this customer?")) {
    db.customers = db.customers.filter(c => c.id !== customerId);
    saveData();
  }
}

function addJob() {
  if (!db.customers.length) {
    alert("Add a customer first.");
    showTab("customers");
    return;
  }

  const customerOptions = db.customers.map(c =>
    `${c.id}: ${c.name}`).join("\n");

  const selected = prompt(
    "Enter the customer ID:\n" + customerOptions,
    String(db.customers[0].id)
  );

  const customerId = Number(selected);
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    alert("Customer ID not found.");
    return;
  }

  const title = prompt("Job description:");
  if (!title || !title.trim()) return;

  const date = new Date().toISOString().slice(0, 10);

  db.jobs.push({
    id: id(),
    customerId,
    title: title.trim(),
    status: "Pending",
    date
  });

  saveData();
}

function cycleJob(jobId) {
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) return;

  const states = ["Pending", "In Progress", "Completed"];
  const current = states.indexOf(job.status);
  job.status = states[(current + 1) % states.length];

  saveData();
}

function deleteJob(jobId) {
  if (!confirm("Delete this job?")) return;
  db.jobs = db.jobs.filter(j => j.id !== jobId);
  saveData();
}

function addDocument(type) {
  if (!db.customers.length) {
    alert("Add a customer first.");
    showTab("customers");
    return;
  }

  const options = db.customers.map(c =>
    `${c.id}: ${c.name}`).join("\n");

  const selected = prompt(
    "Enter the customer ID:\n" + options,
    String(db.customers[0].id)
  );

  const customerId = Number(selected);
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    alert("Customer ID not found.");
    return;
  }

  const description = prompt("Description of work or item:");
  if (!description || !description.trim()) return;

  const quantity = Number(prompt("Quantity:", "1"));
  const unitPrice = Number(prompt("Price per unit in rand:", "0"));

  if (!Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(unitPrice) || unitPrice < 0) {
    alert("Enter a valid positive quantity and non-negative price.");
    return;
  }

  const total = quantity * unitPrice;
  const number = String(db.nextId).padStart(4, "0");

  const doc = {
    id: id(),
    number: (type === "Quote" ? "Q-" : "INV-") + number,
    type,
    customerId,
    description: description.trim(),
    quantity,
    unitPrice,
    total,
    date: new Date().toISOString().slice(0, 10),
    paid: false
  };

  db.documents.push(doc);
  saveData();
}

function getCustomer(customerId) {
  return db.customers.find(c => c.id === customerId) ||
    { name: "Unknown customer", phone: "", email: "", address: "" };
}

function documentText(doc) {
  const customer = getCustomer(doc.customerId);
  const business = db.settings.name || "Your business";

  return [
    business,
    doc.type + " " + doc.number,
    "Date: " + doc.date,
    "",
    "Customer: " + customer.name,
    "Description: " + doc.description,
    "Quantity: " + doc.quantity,
    "Unit price: " + money(doc.unitPrice),
    "Total: " + money(doc.total),
    "",
    doc.type === "Quote"
      ? "Please contact me to accept this quote."
      : "Thank you for your business.",
    db.settings.phone ? "Contact: " + db.settings.phone : "",
    db.settings.email ? "Email: " + db.settings.email : ""
  ].filter(Boolean).join("\n");
}

function shareDocument(docId) {
  const doc = db.documents.find(d => d.id === docId);
  if (!doc) return;

  const text = documentText(doc);
  if (window.Android) {
    Android.shareText(text);
  } else {
    prompt("Copy this text to share:", text);
  }
}

function printDocument(docId) {
  const doc = db.documents.find(d => d.id === docId);
  if (!doc) return;

  const customer = getCustomer(doc.customerId);
  const s = db.settings;

  document.getElementById("printArea").innerHTML = `
    <h1>${safe(s.name || "Your business")}</h1>
    <p>${safe(s.address || "")}</p>
    <p>${safe(s.phone || "")} ${safe(s.email || "")}</p>
    <hr>
    <h2>${safe(doc.type)} ${safe(doc.number)}</h2>
    <p>Date: ${safe(doc.date)}</p>
    <h3>Bill to</h3>
    <p><strong>${safe(customer.name)}</strong><br>
    ${safe(customer.address)}<br>
    ${safe(customer.phone)}<br>${safe(customer.email)}</p>
    <table>
      <thead><tr><th>Description</th><th>Qty</th>
      <th>Unit price</th><th>Total</th></tr></thead>
      <tbody><tr>
      <td>${safe(doc.description)}</td>
      <td>${safe(doc.quantity)}</td>
      <td>${money(doc.unitPrice)}</td>
      <td>${money(doc.total)}</td>
      </tr></tbody>
    </table>
    <p class="total"><strong>Total: ${money(doc.total)}</strong></p>
    <p>${doc.type === "Quote" ?
      "Thank you for the opportunity to quote." :
      "Thank you for your business."}</p>
  `;

  if (window.Android) {
    Android.printPdf();
  } else {
    window.print();
  }
}

function togglePaid(docId) {
  const doc = db.documents.find(d => d.id === docId);
  if (!doc || doc.type !== "Invoice") return;

  doc.paid = !doc.paid;
  saveData();
}

function deleteDocument(docId) {
  if (!confirm("Delete this document?")) return;
  db.documents = db.documents.filter(d => d.id !== docId);
  saveData();
}

function saveSettings() {
  db.settings = {
    name: document.getElementById("businessName").value.trim(),
    phone: document.getElementById("businessPhone").value.trim(),
    email: document.getElementById("businessEmail").value.trim(),
    address: document.getElementById("businessAddress").value.trim()
  };
  saveData();
  alert("Business details saved.");
}

function exportBackup() {
  const text = JSON.stringify(db, null, 2);

  if (window.Android) {
    Android.shareText(text);
  } else {
    prompt("Copy and save this backup text:", text);
  }
}

function restoreBackup() {
  const text = document.getElementById("restoreText").value.trim();
  if (!text) {
    alert("Paste a backup first.");
    return;
  }

  if (!confirm("This will replace your current records. Continue?")) return;

  try {
    const incoming = JSON.parse(text);

    if (!incoming || !Array.isArray(incoming.customers) ||
        !Array.isArray(incoming.jobs) ||
        !Array.isArray(incoming.documents) ||
        !incoming.settings) {
      throw new Error("Invalid backup structure");
    }

    db = {
      ...emptyData(),
      ...incoming,
      settings: { ...emptyData().settings, ...incoming.settings },
      nextId: Math.max(Number(incoming.nextId) || 1, 1)
    };

    saveData();
    alert("Backup restored.");
    showTab("customers");
  } catch (e) {
    alert("This backup is invalid or damaged.");
  }
}

function render() {
  const activeJobs = db.jobs.filter(j => j.status !== "Completed");

  document.getElementById("customerCount").textContent =
    db.customers.length;
  document.getElementById("jobCount").textContent =
    activeJobs.length;
  document.getElementById("docCount").textContent =
    db.documents.length;

  document.getElementById("customerList").innerHTML =
    db.customers.map(c => `
      <div class="record">
        <strong>${safe(c.name)}</strong>
        <p>${safe(c.phone)}</p>
        <p>${safe(c.email)}</p>
        <p>${safe(c.address)}</p>
        <div class="actions">
          <button onclick="editCustomer(${c.id})">Edit</button>
          <button onclick="deleteCustomer(${c.id})">Delete</button>
        </div>
      </div>
    `).join("") || "<p>No customers yet. Add your first customer.</p>";

  document.getElementById("jobList").innerHTML =
    db.jobs.map(j => `
      <div class="record">
        <strong>${safe(j.title)}</strong>
        <p>Customer: ${safe(getCustomer(j.customerId).name)}</p>
        <p>Date: ${safe(j.date)}</p>
        <p>Status: <strong>${safe(j.status)}</strong></p>
        <div class="actions">
          <button onclick="cycleJob(${j.id})">Next status</button>
          <button onclick="deleteJob(${j.id})">Delete</button>
        </div>
      </div>
    `).join("") || "<p>No jobs yet. Add a job to get started.</p>";

  document.getElementById("documentList").innerHTML =
    db.documents.map(d => `
      <div class="record">
        <strong>${safe(d.type)} ${safe(d.number)}</strong>
        <p>Customer: ${safe(getCustomer(d.customerId).name)}</p>
        <p>${safe(d.description)}</p>
        <p>Date: ${safe(d.date)}</p>
        <p>Total: <strong>${money(d.total)}</strong></p>
        ${d.type === "Invoice" ?
          `<p>Payment: ${d.paid ? "Paid" : "Unpaid"}</p>` : ""}
        <div class="actions">
          <button onclick="shareDocument(${d.id})">Share</button>
          <button onclick="printDocument(${d.id})">Print / PDF</button>
          ${d.type === "Invoice" ?
            `<button onclick="togglePaid(${d.id})">
              Mark ${d.paid ? "unpaid" : "paid"}
            </button>` : ""}
          <button onclick="deleteDocument(${d.id})">Delete</button>
        </div>
      </div>
    `).join("") || "<p>No documents yet.</p>";

  document.getElementById("businessName").value =
    db.settings.name || "";
  document.getElementById("businessPhone").value =
    db.settings.phone || "";
  document.getElementById("businessEmail").value =
    db.settings.email || "";
  document.getElementById("businessAddress").value =
    db.settings.address || "";
}

render();
