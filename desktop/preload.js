const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sproutWorkDesktop', {
  notify: (title, body) => ipcRenderer.send('sprout-work-notify', { title, body }),
  getSystemIdleTime: () => ipcRenderer.invoke('sprout-work-idle-time'),
  // floating timer window: push the current timer snapshot to the main process,
  // and receive control commands (pause/resume/finish) coming back from it.
  updateFloat: (data) => ipcRenderer.send('sprout-work-float-update', data),
  onFloatCommand: (cb) => ipcRenderer.on('sprout-work-float-cmd', (_e, c) => cb(c))
});
