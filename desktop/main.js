const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, powerMonitor } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
app.isQuitting = false;

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

  const menu = Menu.buildFromTemplate([
    { label: '열기', click: () => showAndFocus() },
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
