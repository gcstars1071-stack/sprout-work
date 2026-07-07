const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sproutWorkDesktop', {
  notify: (title, body) => ipcRenderer.send('sprout-work-notify', { title, body }),
  getSystemIdleTime: () => ipcRenderer.invoke('sprout-work-idle-time')
});
