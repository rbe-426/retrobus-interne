(() => {
  const LS_DISMISS_KEY = "pwa-install-dismissed-at";
  const DISMISS_COOLDOWN_DAYS = 7;

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  const ua = window.navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  let deferredPrompt = null;
  let modalEl = null;

  const shouldShow = () => {
    const last = Number(localStorage.getItem(LS_DISMISS_KEY) || 0);
    const diffDays = (Date.now() - last) / 86400000;
    return diffDays >= DISMISS_COOLDOWN_DAYS;
  };

  const injectStyles = () => {
    if (document.getElementById("pwa-install-styles")) return;
    const css = `
      .pwa-install-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;z-index:9999;}
      .pwa-install-modal{width:100%;max-width:480px;background:#fff;border-radius:16px 16px 0 0;padding:16px 16px 20px;box-shadow:0 -6px 24px rgba(0,0,0,.2);font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;}
      .pwa-install-header{display:flex;gap:12px;align-items:center;margin-bottom:8px;}
      .pwa-install-title{font-size:18px;margin:0;font-weight:600;}
      .pwa-install-body{color:#444;font-size:14px;margin:8px 0 16px;line-height:1.4;}
      .pwa-install-actions{display:flex;gap:8px;}
      .pwa-btn{flex:1;appearance:none;border:0;padding:12px 14px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer}
      .pwa-btn-primary{background:#0f766e;color:#fff;}
      .pwa-btn-secondary{background:#e5e7eb;color:#111827;}
      @media(min-width:640px){.pwa-install-backdrop{align-items:center}.pwa-install-modal{border-radius:16px}}
    `;
    const style = document.createElement("style");
    style.id = "pwa-install-styles";
    style.textContent = css;
    document.head.appendChild(style);
  };

  const buildModal = () => {
    injectStyles();
    const backdrop = document.createElement("div");
    backdrop.className = "pwa-install-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) dismiss();
    });

    const modal = document.createElement("div");
    modal.className = "pwa-install-modal";

    const header = document.createElement("div");
    header.className = "pwa-install-header";
    const title = document.createElement("h2");
    title.className = "pwa-install-title";
    title.textContent = "Installer l’application";
    header.appendChild(title);

    const body = document.createElement("div");
    body.className = "pwa-install-body";

    const actions = document.createElement("div");
    actions.className = "pwa-install-actions";

    const btnInstall = document.createElement("button");
    btnInstall.className = "pwa-btn pwa-btn-primary";
    btnInstall.textContent = "Installer";

    const btnLater = document.createElement("button");
    btnLater.className = "pwa-btn pwa-btn-secondary";
    btnLater.textContent = "Plus tard";

    btnLater.addEventListener("click", () => dismiss());

    if (isIOS) {
      // iOS: pas d’évènement beforeinstallprompt, montrer les étapes
      body.innerHTML = `
        Sur iPhone/iPad: ouvrez le menu Partager, puis “Sur l’écran d’accueil”.
      `;
      actions.appendChild(btnLater);
    } else if (isAndroid) {
      body.textContent = "Sur Android, vous pouvez installer RETROBUS comme une application.";
      btnInstall.addEventListener("click", async () => {
        if (!deferredPrompt) return dismiss();
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } finally {
          deferredPrompt = null;
          dismiss();
        }
      });
      actions.appendChild(btnInstall);
      actions.appendChild(btnLater);
    } else {
      body.textContent = "Ajoutez RETROBUS à votre écran d’accueil pour une expérience plein écran.";
      actions.appendChild(btnLater);
    }

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    return backdrop;
  };

  const show = () => {
    if (!shouldShow()) return;
    if (!modalEl) modalEl = buildModal();
    document.body.appendChild(modalEl);
  };

  const dismiss = () => {
    localStorage.setItem(LS_DISMISS_KEY, String(Date.now()));
    modalEl?.remove();
  };

  window.addEventListener("appinstalled", () => dismiss());

  if (isIOS) {
    // Sur iOS, attendre que l’app soit stable (éviter les flashes)
    window.setTimeout(() => show(), 1500);
    return;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // attendre la fin du chargement/rendu avant d’ouvrir
    window.setTimeout(() => show(), 1000);
  });
})();
