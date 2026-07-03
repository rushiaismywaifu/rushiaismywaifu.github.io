document.addEventListener("DOMContentLoaded", () => {
  // DOM 元素
  const minValEl = document.getElementById("minVal");
  const maxValEl = document.getElementById("maxVal");
  const attemptCountEl = document.getElementById("attemptCount");
  const remainsCountEl = document.getElementById("remainsCount");
  const messageBox = document.getElementById("messageBox");
  const guessInput = document.getElementById("guessInput");
  const btnGuess = document.getElementById("btnGuess");
  const btnMid = document.getElementById("btnMid");
  const historyList = document.getElementById("historyList");
  const historyCountEl = document.getElementById("historyCount");
  const btnRestart = document.getElementById("btnRestart");
  
  const diffBtns = document.querySelectorAll(".diff-btn");
  const gameContainer = document.getElementById("gameContainer");
  const godModePanel = document.getElementById("godModePanel");
  const godInput = document.getElementById("godInput");
  const btnSetGod = document.getElementById("btnSetGod");
  const btnShowGod = document.getElementById("btnShowGod");
  const btnExitGod = document.getElementById("btnExitGod");

  // 遊戲變數
  let min = 1;
  let max = 100;
  let target = Math.floor(Math.random() * 100) + 1;
  let attempts = 0;
  let maxAttempts = Infinity;
  let currentMode = "easy";
  let history = [];
  let isGameOver = false;
  let isGodMode = false;

  // 難度設定
  const modeConfigs = {
    easy: { min: 1, max: 100, maxAttempts: Infinity, label: "無限" },
    normal: { min: 1, max: 100, maxAttempts: 7, label: "7 次" },
    hard: { min: 1, max: 1000, maxAttempts: 10, label: "10 次" }
  };

  // 切換難度
  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      resetGame();
    });
  });

  function resetGame() {
    const config = modeConfigs[currentMode];
    min = config.min;
    max = config.max;
    maxAttempts = config.maxAttempts;
    attempts = 0;
    history = [];
    isGameOver = false;

    if (!isGodMode) {
      target = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    minValEl.textContent = min;
    maxValEl.textContent = max;
    attemptCountEl.textContent = "0";
    remainsCountEl.textContent = config.label;
    
    guessInput.disabled = false;
    guessInput.value = "";
    guessInput.focus();
    btnGuess.disabled = false;
    btnRestart.style.display = "none";
    
    updateHelper();
    renderHistory();
    showMessage("💡 請輸入數字開始挑戰終極密碼！", "");
  }

  function updateHelper() {
    const mid = Math.floor((min + max) / 2);
    btnMid.textContent = `🎯 推薦二分法中點：${mid}`;
  }

  btnMid.addEventListener("click", () => {
    if (isGameOver) return;
    const mid = Math.floor((min + max) / 2);
    guessInput.value = mid;
    checkGuess();
  });

  function showMessage(text, className) {
    messageBox.className = `message-box ${className}`;
    messageBox.textContent = text;
  }

  function renderHistory() {
    historyList.innerHTML = "";
    historyCountEl.textContent = `${history.length} 筆`;
    history.forEach(item => {
      const div = document.createElement("div");
      div.className = `history-item ${item.type}`;
      div.innerHTML = `<span>${item.val}</span><span>${item.icon}</span>`;
      historyList.appendChild(div);
    });
  }

  // 處理猜測核心邏輯
  function checkGuess() {
    if (isGameOver) return;
    const val = parseInt(guessInput.value);

    // 檢查 God Mode 啟動彩蛋 (5487)
    if (val === 5487 && !isGodMode) {
      isGodMode = true;
      gameContainer.classList.add("god-mode-active");
      godModePanel.style.display = "block";
      showMessage("⚡ 上帝模式啟動！您可以看穿或修改終極密碼。", "");
      guessInput.value = "";
      return;
    }

    if (isNaN(val)) {
      showMessage("⚠️ 請輸入有效的數字！", "");
      return;
    }

    if (val < min || val > max) {
      showMessage(`🚫 數字超出範圍！請猜 ${min} ~ ${max} 之間的數字`, "");
      return;
    }

    // 檢查是否重複猜測
    if (history.some(h => h.val === val)) {
      showMessage(`🤔 您已經猜過 ${val} 囉！換個數字吧。`, "");
      return;
    }

    attempts++;
    attemptCountEl.textContent = attempts;
    if (maxAttempts !== Infinity) {
      const remains = maxAttempts - attempts;
      remainsCountEl.textContent = remains >= 0 ? `${remains} 次` : "0 次";
    }

    // 判定勝負與範圍
    if (val === target) {
      isGameOver = true;
      history.unshift({ val: val, type: "win", icon: "🎉" });
      renderHistory();
      showMessage(`🎉 恭喜你答對了！終極密碼就是 ${target}！(共猜了 ${attempts} 次)`, "msg-win");
      guessInput.disabled = true;
      btnGuess.disabled = true;
      btnRestart.style.display = "block";
      triggerConfetti();
    } else if (val < target) {
      min = val + 1;
      minValEl.textContent = min;
      history.unshift({ val: val, type: "low", icon: "⬆️" });
      renderHistory();
      showMessage(`⬆️ 太小了！往大一點猜。`, "msg-too-small");
    } else {
      max = val - 1;
      maxValEl.textContent = max;
      history.unshift({ val: val, type: "high", icon: "⬇️" });
      renderHistory();
      showMessage(`⬇️ 太大了！往小一點猜。`, "msg-too-big");
    }

    // 檢查次數耗盡
    if (!isGameOver && maxAttempts !== Infinity && attempts >= maxAttempts) {
      isGameOver = true;
      showMessage(`💥 挑戰失敗！機會已耗盡，正確的終極密碼是：${target}`, "msg-lose");
      guessInput.disabled = true;
      btnGuess.disabled = true;
      btnRestart.style.display = "block";
    } else if (!isGameOver) {
      updateHelper();
    }

    guessInput.value = "";
    guessInput.focus();
  }

  btnGuess.addEventListener("click", checkGuess);
  guessInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkGuess();
  });

  btnRestart.addEventListener("click", resetGame);

  // ===== God Mode 上帝控制台 =====
  btnSetGod.addEventListener("click", () => {
    const num = parseInt(godInput.value);
    if (isNaN(num) || num < 1 || num > 1000) {
      alert("請設定介於 1 ~ 1000 之間的數字");
      return;
    }
    target = num;
    showMessage(`⚡ 上帝密碼已變更為：${target}`, "");
    godInput.value = "";
  });

  btnShowGod.addEventListener("click", () => {
    alert(`⚡ 目標終極密碼是：${target}`);
  });

  btnExitGod.addEventListener("click", () => {
    isGodMode = false;
    gameContainer.classList.remove("god-mode-active");
    godModePanel.style.display = "none";
    resetGame();
  });

  // ===== 紙花特效 Canvas =====
  function triggerConfetti() {
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#ff4081", "#00e5ff", "#00e676", "#ffab00", "#ffffff"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 8,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.vy += 0.3; // 重力
          p.y += p.vy;
          p.alpha -= 0.008;
          p.rotation += p.rotSpeed;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  }

  // 初始化
  resetGame();
});