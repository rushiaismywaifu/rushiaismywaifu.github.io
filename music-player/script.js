document.addEventListener("DOMContentLoaded", () => {
  // 核心 DOM 元件
  const audio = new Audio();
  const albumArt = document.getElementById("albumArt");
  const trackTitle = document.getElementById("trackTitle");
  const trackArtist = document.getElementById("trackArtist");
  const progressBar = document.getElementById("progressBar");
  const progressCurrent = document.getElementById("progressCurrent");
  const currentTimeEl = document.getElementById("currentTime");
  const totalTimeEl = document.getElementById("totalTime");
  
  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnMode = document.getElementById("btnMode");
  const btnMute = document.getElementById("btnMute");
  const volumeSlider = document.getElementById("volumeSlider");
  
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const playlistEl = document.getElementById("playlist");
  const trackCountEl = document.getElementById("trackCount");
  
  const canvas = document.getElementById("visualizer");
  const ctx = canvas.getContext("2d");

  // 播放清單與狀態
  let playlist = [
    {
      title: "隱形的翅膀 (Ayame AI Cover)",
      artist: "張韶涵 x 百鬼綾目",
      src: "https://raw.githubusercontent.com/rushiaismywaifu/PageTest/gh-pages/ayame.mp3",
      icon: "🌸"
    }
  ];

  let currentIndex = 0;
  let isPlaying = false;
  let playMode = "repeat-all"; // repeat-all, repeat-one, shuffle
  const modes = [
    { id: "repeat-all", icon: "🔁", title: "列表循環" },
    { id: "repeat-one", icon: "🔂", title: "單曲循環" },
    { id: "shuffle", icon: "🔀", title: "隨機播放" }
  ];

  // ===== Web Audio API 視覺化設定 =====
  let audioCtx, analyser, source;
  function initVisualizer() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyser.fftSize = 64;
      drawVisualizer();
    } catch (e) {
      console.warn("瀏覽器安全策略或跨域限制了 Web Audio API 視覺化", e);
    }
  }

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.4;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, "#ff4081");
      gradient.addColorStop(1, "#00e5ff");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
      x += barWidth;
    }
  }

  // ===== 更新與渲染清單 =====
  function renderPlaylist() {
    playlistEl.innerHTML = "";
    trackCountEl.textContent = `${playlist.length} 首`;

    playlist.forEach((track, idx) => {
      const li = document.createElement("li");
      li.className = `playlist-item ${idx === currentIndex ? "playing" : ""}`;
      li.innerHTML = `
        <span class="item-index">${idx === currentIndex ? "▶" : idx + 1}</span>
        <div class="item-info">
          <div class="item-title">${track.title}</div>
          <div class="item-artist">${track.artist}</div>
        </div>
        <button class="item-remove" title="移除歌曲">🗑️</button>
      `;

      // 點擊歌曲直接播放
      li.addEventListener("click", (e) => {
        if (e.target.classList.contains("item-remove")) return;
        loadTrack(idx);
        playTrack();
      });

      // 移除單曲
      const removeBtn = li.querySelector(".item-remove");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeTrack(idx);
      });

      playlistEl.appendChild(li);
    });
  }

  function removeTrack(idx) {
    if (playlist.length === 1) {
      alert("播放清單至少需要保留一首歌曲喔！");
      return;
    }
    // 釋放舊有的 Blob URL
    if (playlist[idx].src.startsWith("blob:")) {
      URL.revokeObjectURL(playlist[idx].src);
    }
    playlist.splice(idx, 1);
    if (currentIndex >= playlist.length) {
      currentIndex = 0;
    }
    renderPlaylist();
    loadTrack(currentIndex);
  }

  // ===== 載入與播放控制 =====
  function loadTrack(idx) {
    currentIndex = idx;
    const track = playlist[idx];
    audio.src = track.src;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || "未知歌手";
    albumArt.querySelector(".album-icon").textContent = track.icon || "🎧";
    
    progressCurrent.style.width = "0%";
    currentTimeEl.textContent = "0:00";
    totalTimeEl.textContent = "0:00";

    renderPlaylist();
  }

  function playTrack() {
    initVisualizer();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    audio.play().then(() => {
      isPlaying = true;
      btnPlayPause.textContent = "⏸️";
      albumArt.classList.add("playing");
    }).catch(err => {
      console.error("播放失敗:", err);
    });
  }

  function pauseTrack() {
    audio.pause();
    isPlaying = false;
    btnPlayPause.textContent = "▶️";
    albumArt.classList.remove("playing");
  }

  function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // ===== 上傳檔案處理 =====
  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    let firstNewIdx = playlist.length;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)) {
        return;
      }
      // 將檔名分割為歌名與歌手（例如 "歌手 - 歌曲名.mp3"）
      let cleanName = file.name.replace(/\.[^/.]+$/, "");
      let parts = cleanName.split("-").map(s => s.trim());
      let artist = parts.length > 1 ? parts[0] : "本地檔案";
      let title = parts.length > 1 ? parts.slice(1).join(" - ") : cleanName;

      const fileUrl = URL.createObjectURL(file);
      playlist.push({
        title: title,
        artist: artist,
        src: fileUrl,
        icon: "🎶"
      });
    });

    renderPlaylist();
    // 上傳後自動跳至新加入的第一首歌播放
    if (firstNewIdx < playlist.length) {
      loadTrack(firstNewIdx);
      playTrack();
    }
  }

  // ===== 事件監聽 =====
  btnPlayPause.addEventListener("click", () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  });

  btnPrev.addEventListener("click", () => {
    if (playlist.length === 0) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentIndex);
    playTrack();
  });

  btnNext.addEventListener("click", () => {
    if (playlist.length === 0) return;
    if (playMode === "shuffle") {
      currentIndex = Math.floor(Math.random() * playlist.length);
    } else {
      currentIndex = (currentIndex + 1) % playlist.length;
    }
    loadTrack(currentIndex);
    playTrack();
  });

  btnMode.addEventListener("click", () => {
    const currModeIdx = modes.findIndex(m => m.id === playMode);
    const nextMode = modes[(currModeIdx + 1) % modes.length];
    playMode = nextMode.id;
    btnMode.textContent = nextMode.icon;
    btnMode.title = nextMode.title;
  });

  btnMute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    btnMute.textContent = audio.muted ? "🔇" : "🔊";
  });

  volumeSlider.addEventListener("input", (e) => {
    audio.volume = e.target.value;
    audio.muted = false;
    btnMute.textContent = "🔊";
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progressCurrent.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  progressBar.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    audio.currentTime = (clickX / width) * audio.duration;
  });

  audio.addEventListener("ended", () => {
    if (playMode === "repeat-one") {
      audio.currentTime = 0;
      playTrack();
    } else if (playMode === "shuffle") {
      currentIndex = Math.floor(Math.random() * playlist.length);
      loadTrack(currentIndex);
      playTrack();
    } else {
      currentIndex = (currentIndex + 1) % playlist.length;
      loadTrack(currentIndex);
      playTrack();
    }
  });

  // 初始化第一首歌
  loadTrack(0);
});