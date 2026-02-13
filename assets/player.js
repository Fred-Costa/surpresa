// assets/player.js
(() => {
  const STORAGE_KEY = "love_music_state_v1";

  // Cria (ou reutiliza) um <audio> global nesta página
  function getOrCreateAudio() {
    let audio = document.getElementById("bgMusic");
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "bgMusic";
      audio.loop = true;
      audio.preload = "auto";

      const src = document.createElement("source");
      src.src = "musica/love.mp3";
      src.type = "audio/mpeg";
      audio.appendChild(src);

      document.body.appendChild(audio);
    }
    return audio;
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveState(partial) {
    const prev = loadState();
    const next = { ...prev, ...partial, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function ensureToggleButton() {
    let btn = document.getElementById("musicToggle");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "musicToggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Alternar música");
    btn.style.cssText = `
      position:fixed;
      right:18px;
      bottom:18px;
      z-index:9999;
      border:none;
      cursor:pointer;
      padding:12px 14px;
      border-radius:14px;
      font-weight:800;
      color: rgba(246,243,255,.92);
      background: rgba(0,0,0,.35);
      border: 1px solid rgba(255,255,255,.16);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
      user-select:none;
    `;
    btn.textContent = "🔇 Música";
    document.body.appendChild(btn);
    return btn;
  }

  function addPageFade() {
    // Fade in ao carregar
    document.documentElement.style.opacity = "0";
    document.documentElement.style.transition = "opacity .45s ease";
    requestAnimationFrame(() => (document.documentElement.style.opacity = "1"));

    // helper global para navegar com fade-out
    window.goTo = (url) => {
      document.documentElement.style.opacity = "0";
      setTimeout(() => (window.location.href = url), 420);
    };
  }

  async function tryResume(audio) {
    const st = loadState();
    const volume = typeof st.volume === "number" ? st.volume : 0.55;
    const shouldPlay = !!st.playing;

    audio.volume = volume;

    // Retoma o tempo (quando possível)
    if (typeof st.time === "number" && st.time > 0 && isFinite(st.time)) {
      const seek = Math.max(0, st.time);
      // Espera metadata para definir currentTime com segurança
      if (audio.readyState < 1) {
        await new Promise((res) => audio.addEventListener("loadedmetadata", res, { once: true }));
      }
      // Evita seek além da duração
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(seek, Math.max(0, audio.duration - 0.25));
      } else {
        audio.currentTime = seek;
      }
    }

    // Tentativa de continuar a tocar
    if (shouldPlay) {
      try {
        await audio.play();
      } catch {
        // Bloqueado até haver interação do utilizador
      }
    }
  }

  function wireStateTracking(audio) {
    // Guarda tempo periodicamente
    const tick = () => saveState({ time: audio.currentTime, volume: audio.volume, playing: !audio.paused });
    const timer = setInterval(tick, 600);

    audio.addEventListener("play", () => saveState({ playing: true }));
    audio.addEventListener("pause", () => saveState({ playing: false }));
    audio.addEventListener("volumechange", () => saveState({ volume: audio.volume }));
    window.addEventListener("beforeunload", () => {
      tick();
      clearInterval(timer);
    });
  }

  function wireToggle(btn, audio) {
    const updateLabel = () => {
      btn.textContent = audio.paused ? "🔇 Música" : "🔊 Música";
    };

    updateLabel();

    btn.addEventListener("click", async () => {
      if (audio.paused) {
        try {
          await audio.play();
          saveState({ playing: true });
        } catch {
          // se falhar, não faz drama
        }
      } else {
        audio.pause();
        saveState({ playing: false });
      }
      updateLabel();
    });

    audio.addEventListener("play", updateLabel);
    audio.addEventListener("pause", updateLabel);
  }

  function wireStartOnFirstInteraction(audio) {
    // Se ainda não começou, qualquer clique "ativa" o áudio
    const st = loadState();
    if (st.userActivated) return;

    const activate = async () => {
      saveState({ userActivated: true, playing: true });
      try {
        await audio.play();
      } catch {}
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
    };

    window.addEventListener("pointerdown", activate, { once: true });
    window.addEventListener("keydown", activate, { once: true });
  }

  // INIT
  addPageFade();

  const audio = getOrCreateAudio();
  const btn = ensureToggleButton();

  wireStateTracking(audio);
  wireToggle(btn, audio);
  wireStartOnFirstInteraction(audio);

  // tenta retomar automaticamente se já estava a tocar antes
  tryResume(audio);
})();
