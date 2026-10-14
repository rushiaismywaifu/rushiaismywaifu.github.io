document.addEventListener("DOMContentLoaded", () => {
  // 核心 DOM 元件
  const audio = new Audio();
  // 必須在指定 src 前啟用 CORS，否則跨域音檔經 Web Audio 處理會被靜音。
  audio.crossOrigin = "anonymous";
  audio.preload = "metadata";
  const albumArt = document.getElementById("albumArt");
  const trackTitle = document.getElementById("trackTitle");
  const trackArtist = document.getElementById("trackArtist");
  const playbackStatus = document.getElementById("playbackStatus");
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
  let playRequested = false;
  let playbackRequest = 0;
  let playMode = "repeat-all"; // repeat-all, repeat-one, shuffle
  const modes = [
    { id: "repeat-all", icon: "🔁", title: "列表循環" },
    { id: "repeat-one", icon: "🔂", title: "單曲循環" },
    { id: "shuffle", icon: "🔀", title: "隨機播放" }
  ];

  // ===== Web Audio API 視覺化設定 =====
  let audioCtx, analyser, source;
  function initVisualizer() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (audioCtx || !AudioContext || !ctx) return;
    try {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.connect(audioCtx.destination);
      // 分析器準備好後才接管媒體輸出，避免初始化失敗造成無聲。
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
    } catch (e) {
      console.warn("無法啟用頻譜，改用一般音訊播放", e);
      analyser = null;
      if (source) {
        source.disconnect();
        source.connect(audioCtx.destination);
      } else {
        if (audioCtx) audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    }
    if (analyser) drawVisualizer();
  }

  let vizData = null;
  let vizGradient = null;

  // 只在容器尺寸變動時重設 canvas 與漸層(重設 canvas 尺寸會清空內容且耗效能)
  function syncVisualizerSize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      vizGradient = ctx.createLinearGradient(0, h, 0, 0);
      vizGradient.addColorStop(0, "#ff4081");
      vizGradient.addColorStop(1, "#00e5ff");
    }
  }

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    if (!analyser) return;

    syncVisualizerSize();

    const bufferLength = analyser.frequencyBinCount;
    if (!vizData || vizData.length !== bufferLength) {
      vizData = new Uint8Array(bufferLength);
    }
    analyser.getByteFrequencyData(vizData);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.4;
    ctx.fillStyle = vizGradient;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (vizData[i] / 255) * canvas.height;
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
          <div class="item-title"></div>
          <div class="item-artist"></div>
        </div>
        <button class="item-remove" title="移除歌曲">🗑️</button>
      `;

      li.querySelector(".item-title").textContent = track.title;
      li.querySelector(".item-artist").textContent = track.artist;

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
    const removingCurrent = idx === currentIndex;
    const wasPlaying = isPlaying || playRequested;
    playlist.splice(idx, 1);

    if (removingCurrent) {
      if (currentIndex >= playlist.length) currentIndex = 0;
      loadTrack(currentIndex);
      if (wasPlaying) playTrack();
    } else {
      // 移除目前歌曲之前的項目時僅校正索引,不中斷播放
      if (idx < currentIndex) currentIndex--;
      renderPlaylist();
    }
  }

  // ===== 載入與播放控制 =====
  function loadTrack(idx) {
    pauseTrack();
    playbackStatus.textContent = "";
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

  function updatePlaybackUI(playing) {
    isPlaying = playing;
    btnPlayPause.textContent = playing ? "⏸️" : "▶️";
    albumArt.classList.toggle("playing", playing);
  }

  function showPlaybackError(error) {
    pauseTrack();
    playbackStatus.textContent = error.name === "NotAllowedError"
      ? "瀏覽器阻擋了播放，請再按一次播放按鈕。"
      : "無法播放這首歌，請檢查網路或音檔格式，或上傳本地音檔。";
    console.warn("播放失敗:", error);
  }

  async function playTrack() {
    const request = ++playbackRequest;
    playRequested = true;
    playbackStatus.textContent = "";
    initVisualizer();
    try {
      // 兩者都在使用者操作中啟動；也處理 resume() 被拒絕的情況。
      const resume = audioCtx && audioCtx.state !== "running"
        ? audioCtx.resume() : Promise.resolve();
      await Promise.all([resume, audio.play()]);
      if (request !== playbackRequest) return;
      playRequested = false;
      updatePlaybackUI(!audio.paused);
    } catch (err) {
      // 切歌或暫停會取消尚未完成的 play()，不可覆蓋新歌曲的狀態。
      if (request !== playbackRequest) return;
      if (err.name === "AbortError") {
        pauseTrack();
        return;
      }
      showPlaybackError(err);
    }
  }

  function pauseTrack() {
    playbackRequest++;
    playRequested = false;
    audio.pause();
    updatePlaybackUI(false);
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
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
    fileInput.value = "";
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
    if (isPlaying || playRequested) {
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

  audio.addEventListener("playing", () => updatePlaybackUI(true));
  audio.addEventListener("pause", () => updatePlaybackUI(false));
  audio.addEventListener("error", () => {
    if (audio.error) showPlaybackError(audio.error);
  });
  audio.addEventListener("loadedmetadata", () => {
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progressCurrent.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    totalTimeEl.textContent = formatTime(audio.duration);
  });

  progressBar.addEventListener("click", (e) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (width > 0) {
      audio.currentTime = Math.max(0, Math.min(1, clickX / width)) * audio.duration;
    }
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

  // 初始化第一首歌（音量與滑桿預設值一致）
  audio.volume = Number(volumeSlider.value);
  loadTrack(0);
});
