import { contextBridge, ipcRenderer, webUtils } from "electron";
//#region src/main/preload.ts
contextBridge.exposeInMainWorld("eventPipe", {
	analyzeMxf: (mxfPath) => ipcRenderer.invoke("eventpipe:analyze-mxf", mxfPath),
	analyzeWav: (wavPath) => ipcRenderer.invoke("eventpipe:analyze-wav", wavPath),
	exportJob: (request) => ipcRenderer.invoke("eventpipe:export-job", request),
	getSettings: () => ipcRenderer.invoke("eventpipe:get-settings"),
	saveSettings: (settings) => ipcRenderer.invoke("eventpipe:save-settings", settings),
	getExportHistory: (limit) => ipcRenderer.invoke("eventpipe:get-export-history", limit),
	openWorkflowWindow: (payload) => ipcRenderer.invoke("eventpipe:open-workflow-window", payload),
	getWorkflowStartPayload: () => ipcRenderer.invoke("eventpipe:get-workflow-start-payload"),
	pickDirectory: (initialPath) => ipcRenderer.invoke("eventpipe:pick-directory", initialPath),
	openPath: (targetPath) => ipcRenderer.invoke("eventpipe:open-path", targetPath),
	onExportProgress: (listener) => {
		const handler = (_event, update) => {
			listener(update);
		};
		ipcRenderer.on("eventpipe:export-progress", handler);
		return () => ipcRenderer.off("eventpipe:export-progress", handler);
	},
	getPathForFile: (file) => webUtils.getPathForFile(file)
});
//#endregion
