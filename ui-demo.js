/* All demonstration state is ephemeral and confined to this component. */
(() => {
  "use strict";
  const root = document.getElementById("ui-showcase");
  if (!root) return;
  const get = id => root.querySelector(`#${id}`);
  const title = get("demoTitle");
  const description = get("demoDescription");
  const theme = get("demoTheme");
  const email = get("demoEmail");
  const card = get("demoPreviewCard");
  const glow = get("demoGlow");
  const badge = get("demoBadge");
  const radius = get("demoRadius");
  const dialog = get("demoDialog");
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  let toastTimer;
  let loadTimer;

  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      get(tab.getAttribute("aria-controls")).hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(index));
    tab.addEventListener("keydown", event => {
      const indices = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!(event.key in indices)) return;
      event.preventDefault();
      selectTab(indices[event.key], true);
    });
  });

  function updatePreview() {
    // User input stays text, never markup.
    get("demoPreviewTitle").textContent = title.value.trim() || "尚未命名的靈感";
    get("demoPreviewDescription").textContent = description.value || "在輸入區寫下一點靈感吧。";
    get("demoCharCount").textContent = `${description.value.length} / 120`;
    card.dataset.theme = theme.value;
    card.dataset.glow = String(glow.checked);
    card.dataset.density = root.querySelector('input[name="demoDensity"]:checked').value;
    card.style.borderRadius = `${radius.value}px`;
    get("demoRadiusValue").value = `${radius.value} px`;
    get("demoPreviewBadge").hidden = !badge.checked;
  }
  [title, description, theme, glow, badge, radius, ...root.querySelectorAll('input[name="demoDensity"]')]
    .forEach(control => control.addEventListener("input", updatePreview));

  function clearValidation() {
    email.removeAttribute("aria-invalid");
    email.setAttribute("aria-describedby", "demoEmailHint");
    get("demoValidation").textContent = "";
    delete get("demoValidation").dataset.error;
  }
  email.addEventListener("input", clearValidation);
  function validateEmail() {
    const valid = email.checkValidity();
    email.setAttribute("aria-invalid", String(!valid));
    email.setAttribute("aria-describedby", "demoEmailHint demoValidation");
    get("demoValidation").dataset.error = String(!valid);
    get("demoValidation").textContent = valid
      ? "✓ 格式正確！這是本地驗證，沒有送出任何資料。"
      : email.validity.valueMissing ? "請先輸入 Email，再試一次。" : "Email 格式不正確，請使用 name@example.com 的格式。";
    if (!valid) email.focus();
  }
  get("demoValidate").addEventListener("click", validateEmail);
  email.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      validateEmail();
    }
  });

  function dismissToast() {
    clearTimeout(toastTimer);
    if (document.activeElement === get("demoToastClose")) get("demoReset").focus({ preventScroll: true });
    get("demoToastText").textContent = "";
    get("demoToastClose").hidden = true;
  }
  function notify(message) {
    clearTimeout(toastTimer);
    get("demoToastText").textContent = message;
    get("demoToastClose").hidden = false;
    toastTimer = setTimeout(dismissToast, 5000);
  }
  get("demoToastButton").addEventListener("click", () => notify("✓ 操作成功！這是一則通知訊息示範。"));
  get("demoToastClose").addEventListener("click", dismissToast);

  get("demoDialogButton").addEventListener("click", () => {
    get("demoDialogSelection").textContent = get("demoPreviewTitle").textContent;
    dialog.showModal();
  });
  get("demoDialogCancel").addEventListener("click", () => dialog.close());
  get("demoDialogConfirm").addEventListener("click", () => {
    dialog.close();
    notify("✓ 已完成對話框體驗，未儲存任何資料。");
  });

  function setProgress(value) {
    get("demoProgress").value = value;
    get("demoProgressValue").value = `${value}%`;
  }
  get("demoLoad").addEventListener("click", () => {
    if (get("demoLoad").disabled) return;
    clearInterval(loadTimer);
    setProgress(0);
    get("demoLoad").disabled = true;
    get("demoLoad").textContent = "模擬中…";
    get("demoLoadStatus").textContent = "正在展示進度，沒有傳送資料。";
    loadTimer = setInterval(() => {
      const value = Math.min(100, get("demoProgress").value + 10);
      setProgress(value);
      if (value === 100) {
        clearInterval(loadTimer);
        get("demoLoad").disabled = false;
        get("demoLoad").textContent = "重新模擬 →";
        get("demoLoadStatus").textContent = "模擬完成！沒有上傳任何檔案。";
      }
    }, 180);
  });

  get("demoReset").addEventListener("click", () => {
    clearInterval(loadTimer);
    dismissToast();
    if (dialog.open) dialog.close();
    [title, description, email, radius].forEach(input => { input.value = input.defaultValue; });
    theme.selectedIndex = 0;
    [glow, badge, ...root.querySelectorAll('input[name="demoDensity"]')].forEach(input => { input.checked = input.defaultChecked; });
    clearValidation();
    setProgress(0);
    get("demoLoad").disabled = false;
    get("demoLoad").textContent = "開始模擬 →";
    get("demoLoadStatus").textContent = "尚未開始，不會上傳檔案。";
    get("demoDetails").open = false;
    selectTab(0);
    updatePreview();
    notify("✓ 已恢復預設內容，並清除自訂輸入與模擬進度。");
  });
  updatePreview();
})();
