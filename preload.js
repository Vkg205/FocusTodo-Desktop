const { contextBridge, ipcRenderer } = require('electron');

const storageListeners = new Set();
const runtimeListeners = new Set();

ipcRenderer.on('storage-changed', (_event, todoData) => {
  const change = { todoData: { newValue: todoData } };
  for (const listener of storageListeners) listener(change, 'local');
});

ipcRenderer.on('focus-quick-add', () => {
  for (const listener of runtimeListeners) listener({ type: 'FOCUS_QUICK_ADD' }, {}, () => {});
});

const chromeShim = {
  storage: {
    local: {
      get: async () => ipcRenderer.invoke('storage-get'),
      set: async payload => ipcRenderer.invoke('storage-set', payload)
    },
    onChanged: {
      addListener: listener => storageListeners.add(listener),
      removeListener: listener => storageListeners.delete(listener)
    }
  },
  runtime: {
    sendMessage: async message => {
      if (message?.type === 'REBUILD_ALARMS') return ipcRenderer.invoke('rebuild-reminders');
      if (message?.type === 'NOTIFY') return ipcRenderer.invoke('notify', message);
      return { ok: true };
    },
    onMessage: {
      addListener: listener => runtimeListeners.add(listener),
      removeListener: listener => runtimeListeners.delete(listener)
    }
  },
  tabs: {
    query: async () => [await ipcRenderer.invoke('get-active-page')]
  },
  sidePanel: {
    open: async () => ({ ok: true })
  }
};

contextBridge.exposeInMainWorld('chrome', chromeShim);
