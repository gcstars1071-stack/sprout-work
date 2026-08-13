const { contextBridge, ipcRenderer } = require('electron');

// Bridge for the floating timer window. The main process pushes timer snapshots
// via 'float-data'; button presses go back out as 'sprout-work-float-cmd'.
contextBridge.exposeInMainWorld('floatBridge', {
  onData: (cb) => ipcRenderer.on('float-data', (_e, data) => cb(data)),
  cmd: (c) => ipcRenderer.send('sprout-work-float-cmd', c),
});
