let currentCustomer = null;
let currentSign = null;

const cards = document.getElementById("cards");
const modal = document.getElementById("modal");



/* ===== BROWSER BACK BUTTON HANDLER ===== */
window.onpopstate = function (event) {
  if (!event.state || event.state.view !== "history") {
    loadCustomers();
  }
};



/* =========================
   OWNER INFO
   ========================= */
fetch("/owner/info")
  .then(res => res.json())
  .then(data => {
    document.getElementById("owner-info").innerHTML =
      `Shop Code: <strong>${data.shop_code}</strong>`;
  });

/* =========================
   MODAL CONTROLS
   ========================= */
function openModal(customerCode, sign) {
  currentCustomer = customerCode;
  currentSign = sign;

  document.getElementById("modal-title").innerText =
    sign === 1 ? "Add Purchase" : "Add Payment";

  document.getElementById("txn-fields").classList.remove("hidden");
  document.getElementById("customer-fields").classList.add("hidden");

  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";

  modal.classList.remove("hidden");
}

function openAddCustomer() {
  currentCustomer = null;
  currentSign = null;

  document.getElementById("modal-title").innerText = "Add Customer";

  document.getElementById("txn-fields").classList.add("hidden");
  document.getElementById("customer-fields").classList.remove("hidden");

  document.getElementById("cust-name").value = "";
  document.getElementById("cust-pass").value = "";

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

/* =========================
   CONFIRM BUTTON HANDLER
   ========================= */
document.getElementById("confirm").onclick = function () {

  /* ADD CUSTOMER MODE */
  if (currentCustomer === null && currentSign === null) {
    const name = document.getElementById("cust-name").value.trim();
    const pass = document.getElementById("cust-pass").value.trim();

    if (!name || !pass) {
      alert("Enter name and password");
      return;
    }

    fetch("/owner/customers", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `name=${encodeURIComponent(name)}&password=${encodeURIComponent(pass)}`
    })
    .then(res => res.json())
    .then(() => {
      closeModal();
      loadCustomers();
    });

    return;
  }

  /* TRANSACTION MODE */
  const amount = parseInt(document.getElementById("amount").value);
  const note = document.getElementById("note").value;

  if (!amount || amount <= 0) {
    alert("Enter valid amount");
    return;
  }

  fetch("/owner/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `customer_code=${currentCustomer}` +
      `&amount=${amount * currentSign}` +
      `&note=${encodeURIComponent(note)}`
  })
  .then(() => {
    closeModal();
    loadCustomers();
  });
};

/* =========================
   LOAD CUSTOMERS (GRID)
   ========================= */
function loadCustomers() {
  fetch("/owner/customers")
    .then(res => res.json())
    .then(data => {
      cards.className = "grid";
      cards.innerHTML = "";

      data.customers.forEach(c => {
        const card = document.createElement("div");
        card.className = "card";
        card.onclick = () => openHistory(c.customer_code);

        card.innerHTML = `
          <div class="name">${c.name}</div>
          <div class="code">${c.customer_code}</div>
          <div class="balance">₹${c.balance}</div>

          <div class="actions">
            <button class="plus">+</button>
            <button class="minus">−</button>
          </div>
        `;

        const plusBtn = card.querySelector(".plus");
        const minusBtn = card.querySelector(".minus");

        plusBtn.onclick = (e) => {
          e.stopPropagation();
          openModal(c.customer_code, 1);
        };

        minusBtn.onclick = (e) => {
          e.stopPropagation();
          openModal(c.customer_code, -1);
        };

        cards.appendChild(card);
      });
    });
}

/* =========================
   HISTORY VIEW
   ========================= */
function openHistory(customerCode) {
  history.pushState({ view: "history" },"","#history");

  fetch(`/owner/customers/${customerCode}/transactions`)
    .then(res => res.json())
    .then(data => {
      cards.className = "history";
      cards.innerHTML = "";

      const header = document.createElement("div");
      header.className = "history-header";
      header.innerHTML = `
        <button onclick="history.back()">← Back</button>
        <strong>${data.customer} (${data.customer_code})</strong>
        `;

      cards.appendChild(header);

      data.transactions.forEach(t => {
        const txn = document.createElement("div");
        txn.className = "txn " + (t.amount > 0 ? "plus" : "minus");

        txn.innerHTML = `
          <div>${t.amount > 0 ? "+" : ""}${t.amount}</div>
          <small>${t.note || ""}</small>
        `;

        cards.appendChild(txn);
      });
    });
}

/* =========================
   INITIAL LOAD
   ========================= */
loadCustomers();
