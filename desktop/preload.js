const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sproutWorkDesktop', {
  notify: (title, body) => ipcRenderer.send('sprout-work-notify', { title, body }),
  getSystemIdleTime: () => ipcRenderer.invoke('sprout-work-idle-time'),
  // floating timer window: push the current timer snapshot to the main process,
  // and receive control commands (pause/resume/finish) coming back from it.
  updateFloat: (data) => ipcRenderer.send('sprout-work-float-update', data),
  onFloatCommand: (cb) => ipcRenderer.on('sprout-work-float-cmd', (_e, c) => cb(c)),
  // in-app updater (electron-updater): check / download / install a new release,
  // and receive status pushes so the Settings panel can drive its update button.
  update: {
    check: () => ipcRenderer.invoke('sprout-update-check'),
    download: () => ipcRenderer.send('sprout-update-download'),
    install: () => ipcRenderer.send('sprout-update-install'),
    onStatus: (cb) => ipcRenderer.on('sprout-update-status', (_e, s) => cb(s))
  }
});
