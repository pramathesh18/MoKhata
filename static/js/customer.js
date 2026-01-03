fetch("/customer/data")
  .then(res => res.json())
  .then(data => {
    document.getElementById("name").innerText =
        `${data.customer} (${data.customer_code})`;

    document.getElementById("shop").innerText =
        `Shop Code: ${data.shop_code}`;

    document.getElementById("balance").innerText = data.balance;

    const history = document.getElementById("history");
    history.innerHTML = "";

    data.transactions.forEach(t => {
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${t.amount > 0 ? "+" : ""}${t.amount}</strong>
        <small>${t.note || ""}</small>
      `;
      history.appendChild(div);
    });
  });

document.getElementById("change-password-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const form = e.target;
    const data = new URLSearchParams(new FormData(form));

    fetch("/customer/change-password", {
      method: "POST",
      body: data
    })
    .then(res => res.text())
    .then(msg => {
      document.getElementById("pw-msg").innerText = msg;
      form.reset();
    });
  });
document.getElementById("toggle-password")
  .addEventListener("click", () => {
    document
      .getElementById("password-section")
      .classList
      .toggle("hidden");
  });
