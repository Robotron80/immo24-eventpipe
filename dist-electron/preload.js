import { contextBridge as e, ipcRenderer as t, webUtils as n } from "electron";
//#region src/main/preload.ts
e.exposeInMainWorld("eventPipe", {
	analyzeMxf: (e) => t.invoke("eventpipe:analyze-mxf", e),
	analyzeWav: (e) => t.invoke("eventpipe:analyze-wav", e),
	exportJob: (e) => t.invoke("eventpipe:export-job", e),
	getSettings: () => t.invoke("eventpipe:get-settings"),
	saveSettings: (e) => t.invoke("eventpipe:save-settings", e),
	getExportHistory: (e) => t.invoke("eventpipe:get-export-history", e),
	pickDirectory: (e) => t.invoke("eventpipe:pick-directory", e),
	onExportProgress: (e) => {
		let n = (t, n) => {
			e(n);
		};
		return t.on("eventpipe:export-progress", n), () => t.off("eventpipe:export-progress", n);
	},
	getPathForFile: (e) => n.getPathForFile(e)
});
//#endregion
