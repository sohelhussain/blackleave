export function showReview(suggestions) {
  document.querySelector("#profile-autofill-review")?.remove();
  const panel = document.createElement("aside");
  panel.id = "profile-autofill-review";
  panel.innerHTML = `<h2>Review suggested answers</h2><p>Only confirmed values will be filled.</p><div class="items"></div><div class="actions"><button class="cancel">Cancel</button><button class="fill">Fill selected</button></div>`;
  const items = panel.querySelector(".items");
  suggestions.forEach(({ fieldId, answer, mapping }) => {
    const item = document.createElement("label");
    item.className = "item";
    item.innerHTML = `<input type="checkbox" checked data-field-id="${fieldId}"><span><strong>${mapping.profileKey}</strong><input class="value" value="${escapeHtml(answer.value)}"><small>Verified profile data</small></span>`;
    items.append(item);
  });
  panel.querySelector(".cancel").onclick = () => panel.remove();
  panel.querySelector(".fill").onclick = () => {
    panel.querySelectorAll("[data-field-id]:checked").forEach((check) => {
      const field = document.getElementById(check.dataset.fieldId);
      const value = check.closest(".item").querySelector(".value").value;
      if (!field) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(field, value); field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new Event("change", { bubbles: true }));
    });
    panel.remove();
  };
  document.body.append(panel);
}

function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
