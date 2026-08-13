const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, powerMonitor, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let floatWindow = null;
let tray = null;
let floatEnabled = true;      // tray toggle for the floating timer
let lastFloatVisible = false; // last snapshot's visibility (a task is active/paused)
let floatOpacity = 1;         // 0.5–1, applied via setOpacity + persisted
let savePosTimer = null;      // debounce for persisting the float window position
app.isQuitting = false;

/* ---------- floating-timer preferences (position + opacity) ----------
   Persisted to a small JSON file in userData so the float window reopens where the
   user left it, at their chosen opacity. Kept separate from the web app's own state. */
function floatCfgPath() {
  return path.join(app.getPath('userData'), 'float-config.json');
}
function loadFloatCfg() {
  try { return JSON.parse(fs.readFileSync(floatCfgPath(), 'utf8')) || {}; }
  catch (e) { return {}; }
}
function saveFloatCfg(patch) {
  const cfg = Object.assign(loadFloatCfg(), patch);
  try { fs.writeFileSync(floatCfgPath(), JSON.stringify(cfg)); } catch (e) {}
  return cfg;
}
// only trust a saved position if its top-left still lands on some connected display's
// work area (guards against unplugged monitors / resolution changes stranding it offscreen)
function positionOnScreen(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  return screen.getAllDisplays().some((d) => {
    const wa = d.workArea;
    return x >= wa.x - 24 && x <= wa.x + wa.width - 48 &&
           y >= wa.y - 24 && y <= wa.y + wa.height - 48;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 760,
    minHeight: 600,
    title: 'Sprout Work',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'app.html'));

  // keep the app running in the tray instead of quitting when the window is closed
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Small always-on-top floating timer. It mirrors the main window's live timer and
// lets the user pause/resume/finish without surfacing the full app. Shown only while
// a task is active/paused (driven by snapshots from the renderer) and can be toggled
// off from the tray. Frameless + transparent so it reads as a floating card.
function createFloatWindow() {
  const W = 248, H = 104;
  const wa = screen.getPrimaryDisplay().workArea;
  const cfg = loadFloatCfg();

  // restore saved position if still on-screen, else default to bottom-right
  const usableSaved = positionOnScreen(cfg.x, cfg.y);
  const startX = usableSaved ? cfg.x : wa.x + wa.width - W - 16;
  const startY = usableSaved ? cfg.y : wa.y + wa.height - H - 16;
  floatOpacity = (typeof cfg.opacity === 'number') ? Math.min(1, Math.max(0.5, cfg.opacity)) : 1;

  floatWindow = new BrowserWindow({
    width: W,
    height: H,
    x: startX,
    y: startY,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    opacity: floatOpacity,
    webPreferences: {
      preload: path.join(__dirname, 'float-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  floatWindow.setAlwaysOnTop(true, 'screen-saver');
  floatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  floatWindow.setOpacity(floatOpacity);
  floatWindow.loadFile(path.join(__dirname, 'float.html'));

  // remember where the user drags it (debounced so we don't thrash the disk)
  floatWindow.on('moved', () => {
    if (savePosTimer) clearTimeout(savePosTimer);
    savePosTimer = setTimeout(() => {
      if (!floatWindow || floatWindow.isDestroyed()) return;
      const b = floatWindow.getBounds();
      saveFloatCfg({ x: b.x, y: b.y });
    }, 400);
  });

  // never truly close it — just hide, so we can re-show without recreating
  floatWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      floatWindow.hide();
    }
  });
}

// reconcile the floating window's visibility with the latest snapshot + tray toggle
function applyFloatVisibility() {
  if (!floatWindow) return;
  const shouldShow = floatEnabled && lastFloatVisible;
  if (shouldShow && !floatWindow.isVisible()) floatWindow.showInactive();
  else if (!shouldShow && floatWindow.isVisible()) floatWindow.hide();
}

// set the float window's opacity (0.5–1), apply live, and persist the choice
function applyFloatOpacity(v) {
  floatOpacity = Math.min(1, Math.max(0.5, v));
  if (floatWindow && !floatWindow.isDestroyed()) floatWindow.setOpacity(floatOpacity);
  saveFloatCfg({ opacity: floatOpacity });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
  tray.setToolTip('Sprout Work');

  const opacityItem = (label, val) => ({
    label,
    type: 'radio',
    checked: Math.abs(floatOpacity - val) < 0.001,
    click: () => applyFloatOpacity(val)
  });

  const menu = Menu.buildFromTemplate([
    { label: '열기', click: () => showAndFocus() },
    {
      label: '플로팅 타이머',
      type: 'checkbox',
      checked: floatEnabled,
      click: (item) => {
        floatEnabled = item.checked;
        applyFloatVisibility();
      }
    },
    {
      label: '플로팅 투명도',
      submenu: [
        opacityItem('100% (불투명)', 1),
        opacityItem('85%', 0.85),
        opacityItem('70%', 0.7),
        opacityItem('50%', 0.5)
      ]
    },
    { type: 'separator' },
    { label: '종료', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => showAndFocus());
}

function showAndFocus() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (process.platform === 'win32') mainWindow.flashFrame(false);
}

// renderer asks us to surface a real OS notification + pop the window forward
// renderer polls this to get true OS-wide idle time (in seconds). This works even
// when the user is active in a *different* application — unlike in-tab input events,
// which only fire while the Sprout Work window itself has focus.
ipcMain.handle('sprout-work-idle-time', () => {
  try { return powerMonitor.getSystemIdleTime(); } catch (e) { return null; }
});

// renderer pushes a timer snapshot each tick/render; relay it to the floating
// window and reconcile visibility (show while a task is active/paused).
ipcMain.on('sprout-work-float-update', (event, data) => {
  lastFloatVisible = !!(data && data.visible);
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.webContents.send('float-data', data);
  }
  applyFloatVisibility();
});

// floating window button pressed → 'open' surfaces the main window here; the
// pause/resume/finish commands are relayed to the renderer, which owns timer state.
ipcMain.on('sprout-work-float-cmd', (event, cmd) => {
  if (cmd === 'open') { showAndFocus(); return; }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sprout-work-float-cmd', cmd);
  }
});

ipcMain.on('sprout-work-notify', (event, { title, body }) => {
  try {
    new Notification({
      title: title || 'Sprout Work',
      body: body || '',
      icon: path.join(__dirname, '..', 'icon.png'),
      silent: false
    }).show();
  } catch (e) {}
  if (mainWindow) {
    showAndFocus();
    if (process.platform === 'win32' && !mainWindow.isFocused()) {
      mainWindow.flashFrame(true);
    }
  }
});

if (process.platform === 'win32') {
  // required for Windows toast notifications to actually display — without a
  // registered AppUserModelID, Notification.show() can silently no-op
  app.setAppUserModelId('xyz.sproutwork.app');
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  createFloatWindow();

  // start automatically when the computer/user logs in
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: false });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showAndFocus();
  });
});

app.on('window-all-closed', () => {
  // intentionally do nothing — app lives in the tray on mac/win until "종료" is chosen
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
