import e from "node:path";
import t, { existsSync as n } from "node:fs";
import { fileURLToPath as r } from "node:url";
import { BrowserWindow as i, Menu as a, app as o, dialog as s, ipcMain as c } from "electron";
import { spawn as l } from "node:child_process";
import u from "node:fs/promises";
//#region src/main/settings.html?raw
var d = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <style>\n      :root {\n        font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif;\n        color: #1f2328;\n      }\n\n      * {\n        box-sizing: border-box;\n      }\n\n      body {\n        margin: 0;\n        background: #f6f7f9;\n        height: 100vh;\n        overflow: hidden;\n      }\n\n      .settings-root {\n        height: 100vh;\n        display: flex;\n        flex-direction: column;\n      }\n\n      .content-scroll {\n        flex: 1;\n        overflow: auto;\n        padding: 16px;\n      }\n\n      .section {\n        max-width: 760px;\n        margin: 0 auto;\n        background: #ffffff;\n        border: 1px solid #e1e4e9;\n        border-radius: 12px;\n        padding: 16px;\n        display: grid;\n        gap: 12px;\n      }\n\n      h1 {\n        margin: 0;\n        font-size: 20px;\n      }\n\n      p {\n        margin: 0;\n        color: #626b75;\n        font-size: 13px;\n      }\n\n      label {\n        display: grid;\n        gap: 6px;\n        font-size: 13px;\n      }\n\n      input {\n        border: 1px solid #c8ccd2;\n        border-radius: 8px;\n        background: #ffffff;\n        color: #1f2328;\n        padding: 8px 10px;\n      }\n\n      .path-row {\n        display: grid;\n        grid-template-columns: 1fr auto;\n        gap: 8px;\n      }\n\n      .path-row button {\n        min-width: 84px;\n      }\n\n      .actions-sticky {\n        position: sticky;\n        bottom: 0;\n        background: #ffffff;\n        border-top: 1px solid #e3e6ea;\n        padding: 12px 16px;\n        display: flex;\n        justify-content: space-between;\n        gap: 8px;\n      }\n\n      button {\n        border-radius: 8px;\n        border: 1px solid #c8ccd2;\n        background: #ffffff;\n        color: #27303a;\n        padding: 8px 12px;\n        font-size: 13px;\n      }\n\n      .primary {\n        border-color: #2f6fda;\n        background: #2f6fda;\n        color: #ffffff;\n        font-weight: 600;\n      }\n    </style>\n  </head>\n  <body>\n    <div class=\"settings-root\">\n      <main class=\"content-scroll\">\n        <section class=\"section\">\n          <h1>Konfiguration</h1>\n          <label>\n            Watchfolder\n            <div class=\"path-row\">\n              <input id=\"watchFolder\" placeholder=\"/path/to/watchfolder\" />\n              <button id=\"browseWatchFolder\" type=\"button\">Durchsuchen...</button>\n            </div>\n          </label>\n\n          <label>\n            Temporärer Exportordner\n            <div class=\"path-row\">\n              <input id=\"tempExportFolder\" placeholder=\"/path/to/temp\" />\n              <button id=\"browseTempFolder\" type=\"button\">Durchsuchen...</button>\n            </div>\n          </label>\n\n          <label>\n            Namensschema\n            <input id=\"namingPreset\" placeholder=\"{sourceName}\" />\n          </label>\n\n        </section>\n      </main>\n\n      <footer class=\"actions-sticky\">\n        <button id=\"cancelButton\" type=\"button\">Abbrechen</button>\n        <button id=\"saveButton\" type=\"button\" class=\"primary\">Speichern</button>\n      </footer>\n    </div>\n\n    <script>\n      const watchFolderInput = document.getElementById('watchFolder')\n      const tempExportFolderInput = document.getElementById('tempExportFolder')\n      const browseWatchFolderButton = document.getElementById('browseWatchFolder')\n      const browseTempFolderButton = document.getElementById('browseTempFolder')\n      const namingPresetInput = document.getElementById('namingPreset')\n      const saveButton = document.getElementById('saveButton')\n      const cancelButton = document.getElementById('cancelButton')\n\n      function readFormSettings() {\n        return {\n          watchFolder: watchFolderInput.value,\n          tempExportFolder: tempExportFolderInput.value,\n          namingPreset: namingPresetInput.value,\n        }\n      }\n\n      function applyFormSettings(settings) {\n        watchFolderInput.value = settings.watchFolder ?? ''\n        tempExportFolderInput.value = settings.tempExportFolder ?? ''\n        namingPresetInput.value = settings.namingPreset ?? '{sourceName}'\n      }\n\n      async function browseInto(inputElement) {\n        try {\n          const selectedPath = await window.eventPipe.pickDirectory(inputElement.value)\n          if (selectedPath) {\n            inputElement.value = selectedPath\n          }\n        } catch (error) {\n          window.alert(error instanceof Error ? error.message : 'Ordnerauswahl fehlgeschlagen.')\n        }\n      }\n\n      async function loadSettings() {\n        try {\n          const snapshot = await window.eventPipe.getSettings()\n          applyFormSettings(snapshot.settings)\n        } catch (error) {\n          window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht geladen werden.')\n        }\n      }\n\n      async function saveSettings() {\n        saveButton.disabled = true\n\n        try {\n          const snapshot = await window.eventPipe.saveSettings(readFormSettings())\n          applyFormSettings(snapshot.settings)\n          window.close()\n        } catch (error) {\n          window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht gespeichert werden.')\n        } finally {\n          saveButton.disabled = false\n        }\n      }\n\n      saveButton.addEventListener('click', () => {\n        void saveSettings()\n      })\n\n      cancelButton.addEventListener('click', () => {\n        window.close()\n      })\n\n      browseWatchFolderButton.addEventListener('click', () => {\n        void browseInto(watchFolderInput)\n      })\n\n      browseTempFolderButton.addEventListener('click', () => {\n        void browseInto(tempExportFolderInput)\n      })\n\n      void loadSettings()\n    <\/script>\n  </body>\n</html>\n", f = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <style>\n      body {\n        margin: 0;\n        font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif;\n        background: transparent;\n      }\n\n      .card {\n        width: 100vw;\n        height: 100vh;\n        display: grid;\n        place-items: center;\n        background: rgba(255, 255, 255, 0.96);\n        border-radius: 16px;\n        border: 1px solid rgba(0, 0, 0, 0.08);\n        color: #1f1f1f;\n        box-shadow: 0 22px 60px rgba(0, 0, 0, 0.2);\n      }\n\n      .inner {\n        text-align: center;\n        display: grid;\n        gap: 10px;\n      }\n\n      .pinwheel {\n        width: 52px;\n        height: 52px;\n        margin: 0 auto 8px;\n        animation: spin 4s linear infinite;\n        object-fit: contain;\n        display: block;\n      }\n\n      p {\n        margin: 0;\n        color: #6f7680;\n      }\n\n      h1 {\n        margin: 0;\n        font-size: 24px;\n        font-weight: 600;\n      }\n\n      @keyframes spin {\n        to {\n          transform: rotate(360deg);\n        }\n      }\n    </style>\n  </head>\n  <body>\n    <div class=\"card\">\n      <div class=\"inner\">\n        <img class=\"pinwheel\" src=\"__SPLASH_ICON_SRC__\" alt=\"\" aria-hidden=\"true\" />\n        <p>Ja, aber...</p>\n        <h1>immo24 EventPipe</h1>\n      </div>\n    </div>\n  </body>\n</html>\n", p = {
	2: [1, 2],
	4: [
		1,
		2,
		3,
		4
	],
	6: [
		1,
		3,
		2,
		5,
		6,
		4
	],
	8: [
		1,
		3,
		2,
		7,
		8,
		5,
		6,
		4
	]
}, m = [
	2,
	4,
	6,
	8
];
function h(e) {
	return m.includes(e);
}
function g(e, t = []) {
	return Array.from({ length: e }, (e, n) => ({
		mxfTrack: n + 1,
		wavChannel: n + 1,
		name: t[n]
	}));
}
function _(e) {
	return p[e].map((e, t) => ({
		mxfTrack: t + 1,
		wavChannel: e
	}));
}
//#endregion
//#region src/shared/classifier.ts
function ee(e) {
	let t = [];
	for (let [n, r] of Object.entries(e.streamTags ?? {})) t.push(`${n}=${r}`);
	for (let [n, r] of Object.entries(e.formatTags ?? {})) t.push(`${n}=${r}`);
	return t.join(" | ").toLowerCase();
}
function te(e) {
	let t = (e) => e.trim().replace(/[\s/|,;:-]+$/g, "").trim(), n = (e) => e.replace(/\s*\|\s*[a-z_][a-z0-9_ -]*\s*=.*$/i, "").replace(/\s+[a-z_][a-z0-9_ -]*\s*=.*$/i, "").trim(), r = /* @__PURE__ */ new Map(), i = [...Object.entries(e.streamTags ?? {}), ...Object.entries(e.formatTags ?? {})], a = i.map(([e, t]) => `${e}=${t}`).join(" | "), o = [...a.matchAll(/dTRK\s*(\d+)\s*=/gi)];
	for (let e = 0; e < o.length; e += 1) {
		let i = o[e], s = o[e + 1];
		if (i.index === void 0) continue;
		let c = i.index + i[0].length, l = s?.index ?? a.length, u = a.slice(c, l), d = Number(i[1]), f = t(n(u));
		f && r.set(d, f);
	}
	for (let [e, a] of i) {
		let i = e.match(/^\s*dtrk\s*(\d+)\s*$/i);
		i && a.trim() && r.set(Number(i[1]), t(n(a)));
	}
	return [...r.entries()].sort((e, t) => e[0] - t[0]).map(([, e]) => e);
}
function ne(e) {
	if (!h(e.channels)) return {
		type: "unknown",
		trackNames: [],
		reason: `Unsupported channel count: ${e.channels}`
	};
	let t = te(e);
	if (t.length > 0) return {
		type: "bounce-polywav",
		trackNames: t,
		reason: "dTRK metadata detected"
	};
	let n = ee(e), r = (e.channelLayout ?? "").toLowerCase();
	return r.includes("l r c lfe lb rb ls rs") || r.includes("l r c lfe ls rs") || r.includes("l r ls rs") || r.includes("7.1") || r.includes("5.1") || n.includes("l r c lfe lb rb ls rs") ? {
		type: "legacy-surround-print",
		trackNames: [],
		reason: "Legacy surround channel layout detected"
	} : e.channels === 2 || e.channels === 4 ? {
		type: "legacy-surround-print",
		trackNames: [],
		reason: "No dTRK metadata found for stereo/quad WAV, defaulting to legacy mapping"
	} : {
		type: "unknown",
		trackNames: [],
		reason: "No dTRK metadata and no known legacy layout found"
	};
}
//#endregion
//#region src/main/ffprobeService.ts
function v(e) {
	if (!e) return {};
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n.toLowerCase()] = r;
	return t;
}
async function y(e, t) {
	return new Promise((n, r) => {
		let i = l(t, [
			"-v",
			"error",
			"-print_format",
			"json",
			"-show_streams",
			"-show_format",
			e
		], { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] }), a = "", o = "";
		i.stdout.on("data", (e) => {
			a += e.toString();
		}), i.stderr.on("data", (e) => {
			o += e.toString();
		}), i.on("error", (e) => {
			r(/* @__PURE__ */ Error(`Unable to start ffprobe: ${e.message}`));
		}), i.on("close", (e) => {
			if (e !== 0) {
				r(/* @__PURE__ */ Error(`ffprobe exited with code ${e}: ${o.trim()}`));
				return;
			}
			try {
				let e = JSON.parse(a), t = e.streams?.find((e) => typeof e.channels == "number");
				if (!t || typeof t.channels != "number") {
					r(/* @__PURE__ */ Error("No audio stream with channel information found in WAV file"));
					return;
				}
				n({
					channels: t.channels,
					channelLayout: t.channel_layout,
					sampleRate: t.sample_rate ? Number(t.sample_rate) : void 0,
					bitsPerSample: t.bits_per_sample,
					durationSeconds: t.duration ? Number(t.duration) : e.format?.duration ? Number(e.format.duration) : void 0,
					codecName: t.codec_name,
					streamTags: v(t.tags),
					formatTags: v(e.format?.tags)
				});
			} catch (e) {
				r(/* @__PURE__ */ Error(`Could not parse ffprobe output: ${e.message}`));
			}
		});
	});
}
async function re(e, t) {
	return new Promise((n, r) => {
		let i = l(t, [
			"-v",
			"error",
			"-print_format",
			"json",
			"-show_streams",
			"-show_format",
			e
		], { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] }), a = "", o = "";
		i.stdout.on("data", (e) => {
			a += e.toString();
		}), i.stderr.on("data", (e) => {
			o += e.toString();
		}), i.on("error", (e) => {
			r(/* @__PURE__ */ Error(`Unable to start ffprobe: ${e.message}`));
		}), i.on("close", (e) => {
			if (e !== 0) {
				r(/* @__PURE__ */ Error(`ffprobe exited with code ${e}: ${o.trim()}`));
				return;
			}
			try {
				let e = JSON.parse(a), t = e.streams ?? [], i = t.find((e) => e.codec_type === "video"), o = t.filter((e) => e.codec_type === "audio");
				if (!i) {
					r(/* @__PURE__ */ Error("No video stream found in MXF file"));
					return;
				}
				n({
					durationSeconds: e.format?.duration ? Number(e.format.duration) : void 0,
					videoCodecName: i.codec_name,
					audioStreamCount: o.length,
					streamCount: t.length,
					formatTags: v(e.format?.tags)
				});
			} catch (e) {
				r(/* @__PURE__ */ Error(`Could not parse ffprobe output: ${e.message}`));
			}
		});
	});
}
//#endregion
//#region src/main/filePublisher.ts
async function b(e) {
	let t = await u.stat(e);
	if (!t.isFile()) throw Error(`Temp export is not a file: ${e}`);
	if (t.size <= 0) throw Error(`Temp export is empty: ${e}`);
}
async function x(t) {
	let n = e.parse(t);
	for (let t = 0; t < 1e3; t += 1) {
		let r = t === 0 ? "" : `__${String(t).padStart(3, "0")}`, i = e.join(n.dir, `${n.name}${r}${n.ext}`);
		try {
			await u.access(i);
		} catch {
			return {
				path: i,
				conflictResolved: t > 0
			};
		}
	}
	throw Error(`Could not resolve publish target after many conflicts: ${t}`);
}
async function S(t, n) {
	if (!n.trim()) throw Error("Watchfolder is not configured.");
	await b(t), await u.mkdir(n, { recursive: !0 });
	let r = await x(e.join(n, e.basename(t))), i = e.join(n, `.${e.basename(r.path)}.${Date.now()}.eventpipe-copying`), a = !1;
	try {
		try {
			await u.rename(t, i), a = !0;
		} catch (e) {
			if ((typeof e == "object" && e && "code" in e ? String(e.code) : "") !== "EXDEV") throw e;
			await u.copyFile(t, i), await u.rm(t, { force: !0 }), a = !0;
		}
		await u.rename(i, r.path);
	} catch (e) {
		if (a) try {
			await u.rename(i, t);
		} catch {
			await u.rm(i, { force: !0 });
		}
		else await u.rm(i, { force: !0 });
		let n = e instanceof Error ? e.message : String(e);
		throw Error(`Publishing to watchfolder failed: ${n}`);
	}
	return {
		publishedPath: r.path,
		conflictResolved: r.conflictResolved
	};
}
//#endregion
//#region src/main/ffmpegService.ts
function C(e, t, n, r) {
	let i = n.map((e, t) => `[1:a]pan=mono|c0=c${e.wavChannel - 1}[a${t}]`), a = n.flatMap((e, t) => ["-map", `[a${t}]`]);
	return [
		"-i",
		e,
		"-i",
		t,
		"-stats",
		"-map",
		"0:v",
		"-filter_complex",
		i.join(";"),
		"-c:v",
		"copy",
		...a,
		"-c:a",
		"pcm_s24le",
		"-y",
		r
	];
}
function ie(e, t) {
	return (e.trim() || "{sourceName}").replaceAll("{sourceName}", t);
}
function w(e) {
	return e.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim() || "eventpipe-export";
}
function T(e) {
	let [t, n, r] = e.split(":");
	return Number(t) * 3600 + Number(n) * 60 + Number(r);
}
function ae(e, t) {
	let n = /time=([0-9:.]+)/.exec(e), r = /speed=\s*([0-9.]+x)/.exec(e);
	if (!n && !r) return;
	let i = {
		timecode: n?.[1],
		speed: r?.[1]
	};
	if (n && typeof t == "number" && t > 0) {
		let e = T(n[1]);
		i.percent = Math.max(0, Math.min(100, e / t * 100));
	}
	return i;
}
async function E(t, n, r, i) {
	let a = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), o = e.join(n.tempExportFolder, "logs");
	await u.mkdir(o, { recursive: !0 });
	let s = `${a}-${w(t)}-${i}.log`, c = e.join(o, s);
	return await u.writeFile(c, r, "utf-8"), c;
}
function D(e, t, n, r) {
	return new Promise((i, a) => {
		let o = l(e, t, { windowsHide: !0 }), s = "", c = "";
		o.stdout.on("data", (e) => {
			s += e.toString();
		}), o.stderr.on("data", (e) => {
			let t = e.toString();
			s += t, c += t;
			let i = c.split(/\r|\n/);
			c = i.pop() ?? "";
			for (let e of i) {
				let t = ae(e, n);
				t && r && r(t);
			}
		}), o.on("error", (e) => {
			a(/* @__PURE__ */ Error(`Failed to start ffmpeg: ${e.message}`));
		}), o.on("close", (e) => {
			if (e === 0) {
				i(s.trim());
				return;
			}
			a(Error(`ffmpeg exited with code ${e}.\n${s.trim()}`.trim()));
		});
	});
}
async function O(t, n, r) {
	let i = e.parse(t.mxfPath).name, a = t.customFileName ? `${w(t.customFileName)}.mxf` : `${w(ie(n.namingPreset, i))}.mxf`;
	await u.mkdir(n.tempExportFolder, { recursive: !0 });
	let o = e.join(n.tempExportFolder, a), s = C(t.mxfPath, t.wavPath, t.mapping, o), c = await y(t.wavPath, n.ffprobePath);
	try {
		let e = await D(n.ffmpegPath, s, c.durationSeconds, r), t = await S(o, n.watchFolder), a = await E(i, n, e, "success");
		return {
			outputPath: t.publishedPath,
			tempOutputPath: o,
			publishedPath: t.publishedPath,
			publishConflictResolved: t.conflictResolved,
			command: n.ffmpegPath,
			args: s,
			log: e,
			logPath: a
		};
	} catch (e) {
		let t = e instanceof Error ? e.message : String(e), r = await E(i, n, t, "error");
		throw Error(`Export failed. Log: ${r}\n${t}`);
	}
}
//#endregion
//#region src/main/historyService.ts
function k(t) {
	return e.join(e.dirname(t), "export-history.jsonl");
}
async function A(t, n) {
	await u.mkdir(e.dirname(t), { recursive: !0 }), await u.appendFile(t, `${JSON.stringify(n)}\n`, "utf-8");
}
async function oe(e, t = 20) {
	try {
		let n = (await u.readFile(e, "utf-8")).split("\n").map((e) => e.trim()).filter((e) => e.length > 0), r = [];
		for (let e = n.length - 1; e >= 0 && r.length < t; --e) try {
			r.push(JSON.parse(n[e]));
		} catch {}
		return r;
	} catch {
		return [];
	}
}
//#endregion
//#region src/main/logService.ts
function se(e) {
	let t = {
		ts: (/* @__PURE__ */ new Date()).toISOString(),
		...e
	};
	console.log(JSON.stringify(t));
}
//#endregion
//#region src/main/settingsService.ts
var j = "config.json";
function M(t) {
	let r = process.platform === "win32" ? `${t}.exe` : t, i = [
		e.join(process.resourcesPath, "bin", r),
		e.join(process.resourcesPath, "tools", r),
		e.join(process.cwd(), "resources", "bin", r)
	];
	for (let e of i) if (n(e)) return e;
	if (process.platform === "darwin") for (let r of ["/opt/homebrew/bin", "/usr/local/bin"]) {
		let i = e.join(r, t);
		if (n(i)) return i;
	}
	return t;
}
var N = {
	watchFolder: e.join(process.cwd(), "eventpipe-watchfolder"),
	tempExportFolder: e.join(process.cwd(), "eventpipe-temp"),
	ffmpegPath: M("ffmpeg"),
	ffprobePath: M("ffprobe"),
	namingPreset: "{sourceName}",
	maxDurationDeltaSeconds: .2,
	debugLoggingEnabled: !1
};
function P(e, t) {
	if (typeof e != "string") return t;
	let n = e.trim();
	return n.length > 0 ? n : t;
}
function F(e) {
	let t = M("ffmpeg"), n = M("ffprobe");
	return {
		watchFolder: P(e?.watchFolder, N.watchFolder),
		tempExportFolder: P(e?.tempExportFolder, N.tempExportFolder),
		ffmpegPath: t,
		ffprobePath: n,
		namingPreset: P(e?.namingPreset, N.namingPreset),
		maxDurationDeltaSeconds: N.maxDurationDeltaSeconds,
		debugLoggingEnabled: N.debugLoggingEnabled
	};
}
function I() {
	if (process.env.EVENTPIPE_CONFIG_PATH?.trim()) return process.env.EVENTPIPE_CONFIG_PATH.trim();
	if (process.platform === "darwin") return e.join("/Users/Shared", "immo24-eventpipe", j);
	if (process.platform === "win32") {
		let t = process.env.PROGRAMDATA?.trim() || e.join("C:", "ProgramData");
		return e.join(t, "immo24-eventpipe", j);
	}
	return e.join("/var/lib", "immo24-eventpipe", j);
}
async function L(e) {
	try {
		return await u.access(e), !0;
	} catch {
		return !1;
	}
}
async function R(e) {
	try {
		let t = await u.readFile(e, "utf-8");
		return F(JSON.parse(t));
	} catch {
		return { ...N };
	}
}
async function z(t, n) {
	let r = F(n);
	return await u.mkdir(e.dirname(t), { recursive: !0 }), await u.writeFile(t, `${JSON.stringify(r, null, 2)}\n`, "utf-8"), r;
}
//#endregion
//#region src/main/index.ts
var B = null, V = null, H = null, U = 0, W = { ...N }, G = "", K = "", q = !1, ce = process.argv.includes("--debug-logging") || [
	"1",
	"true",
	"yes",
	"on"
].includes((process.env.EVENTPIPE_DEBUG_LOGGING || "").toLowerCase()), J = r(import.meta.url), Y = e.dirname(J);
o.requestSingleInstanceLock() || o.quit();
function X(e) {
	return {
		...e,
		debugLoggingEnabled: ce
	};
}
function Z(e, t) {
	W.debugLoggingEnabled && se({
		level: "info",
		message: e,
		context: t
	});
}
function le() {
	let n = o.getAppPath(), r = [e.resolve(n, "src/assets/icon.png"), e.resolve(n, "dist/assets/icon.png")];
	for (let e of r) if (t.existsSync(e)) return `data:image/png;base64,${t.readFileSync(e).toString("base64")}`;
	return "";
}
function ue() {
	V = new i({
		width: 420,
		height: 250,
		frame: !1,
		transparent: !0,
		resizable: !1,
		minimizable: !1,
		maximizable: !1,
		fullscreenable: !1,
		alwaysOnTop: !0,
		movable: !0,
		show: !1,
		webPreferences: {
			contextIsolation: !0,
			sandbox: !0
		}
	});
	let e = f.replace("__SPLASH_ICON_SRC__", le());
	V.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(e)}`), V.once("ready-to-show", () => {
		U = Date.now(), V?.show();
	});
}
function Q() {
	if (H && !H.isDestroyed()) {
		H.focus();
		return;
	}
	let t = B && !B.isDestroyed() && B.isVisible() ? B : void 0;
	H = new i({
		width: 900,
		height: 650,
		minWidth: 780,
		minHeight: 560,
		resizable: !0,
		title: "Konfiguration",
		parent: t,
		modal: !!t,
		show: !1,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: e.join(Y, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1
		}
	}), H.setMenu(null), H.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(d)}`), H.once("ready-to-show", () => {
		H?.show();
	}), H.on("closed", () => {
		H = null;
	});
}
async function de(e = 2e3) {
	if (U === 0) return;
	let t = e - (Date.now() - U);
	t <= 0 || await new Promise((e) => setTimeout(e, t));
}
function fe() {
	let e = process.platform === "darwin", t = !!process.env.VITE_DEV_SERVER_URL, n = [
		...e ? [{
			label: o.name,
			submenu: [
				{ role: "about" },
				{ type: "separator" },
				{
					label: "Konfiguration",
					accelerator: "CommandOrControl+,",
					click: Q
				},
				{ type: "separator" },
				{ role: "hide" },
				{ role: "hideOthers" },
				{ role: "unhide" },
				{ type: "separator" },
				{ role: "quit" }
			]
		}] : [{
			label: "Datei",
			submenu: [
				{
					label: "Konfiguration",
					accelerator: "CommandOrControl+,",
					click: Q
				},
				{ type: "separator" },
				{ role: "quit" }
			]
		}],
		{
			label: "Bearbeiten",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				...e ? [
					{ role: "pasteAndMatchStyle" },
					{ role: "delete" },
					{ role: "selectAll" },
					{ type: "separator" },
					{
						label: "Sprachausgabe",
						submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }]
					}
				] : [
					{ role: "delete" },
					{ type: "separator" },
					{ role: "selectAll" }
				]
			]
		},
		...t ? [{
			label: "Entwickler",
			submenu: [
				{ role: "toggleDevTools" },
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleFullScreen" }
			]
		}] : []
	];
	a.setApplicationMenu(a.buildFromTemplate(n));
}
function $() {
	B = new i({
		width: 500,
		height: 500,
		minWidth: 320,
		minHeight: 320,
		show: !1,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: e.join(Y, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1
		}
	}), process.env.VITE_DEV_SERVER_URL ? B.loadURL(process.env.VITE_DEV_SERVER_URL) : B.loadFile(e.join(Y, "../index.html")), B.setAspectRatio(1), B.webContents.once("did-finish-load", async () => {
		await de(2e3), V?.close(), V = null, B?.show(), q &&= (Q(), !1);
	});
}
o.whenReady().then(() => (o.setName("immo24 EventPipe"), G = I(), K = k(G), L(G).then(async (e) => {
	q = !e, W = X(e ? await R(G) : { ...N }), ue(), fe(), c.handle("eventpipe:get-settings", () => ({
		settings: W,
		configPath: G
	})), c.handle("eventpipe:get-export-history", async (e, t) => oe(K, Math.max(1, Math.min(100, typeof t == "number" ? Math.floor(t) : 20)))), c.handle("eventpipe:pick-directory", async (e, t) => {
		let n = H && !H.isDestroyed() ? H : B ?? void 0, r = {
			title: "Ordner auswählen",
			properties: [
				"openDirectory",
				"createDirectory",
				"promptToCreate"
			],
			defaultPath: t?.trim() || void 0
		}, i = n ? await s.showOpenDialog(n, r) : await s.showOpenDialog(r);
		if (!(i.canceled || i.filePaths.length === 0)) return i.filePaths[0];
	}), c.handle("eventpipe:save-settings", async (e, t) => {
		let n = {
			...W,
			...t
		};
		return W = X(await z(G, n)), Z("Settings saved", { configPath: G }), {
			settings: W,
			configPath: G
		};
	}), c.handle("eventpipe:analyze-mxf", async (e, t) => (Z("Analyze MXF requested", { mxfPath: t }), { probe: await re(t, W.ffprobePath) })), c.handle("eventpipe:analyze-wav", async (e, t) => {
		Z("Analyze WAV requested", { wavPath: t });
		let n = await y(t, W.ffprobePath), r = ne(n);
		if (!h(n.channels)) throw Error(`Unsupported channel count ${n.channels}. Allowed: 2, 4, 6, 8.`);
		return {
			probe: n,
			classification: r,
			mapping: r.type === "legacy-surround-print" ? _(n.channels) : g(n.channels, r.trackNames)
		};
	}), c.handle("eventpipe:export-job", async (e, t) => {
		if (!t.mxfPath || !t.wavPath || t.mapping.length === 0) throw Error("Export request is incomplete.");
		Z("Export requested", {
			mxfPath: t.mxfPath,
			wavPath: t.wavPath,
			mappingEntries: t.mapping.length
		}), e.sender.send("eventpipe:export-progress", { percent: 0 });
		try {
			let n = await O(t, W, (t) => {
				e.sender.send("eventpipe:export-progress", t);
			}), r = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				status: "success",
				mxfPath: t.mxfPath,
				wavPath: t.wavPath,
				outputPath: n.outputPath,
				tempOutputPath: n.tempOutputPath,
				publishedPath: n.publishedPath,
				publishConflictResolved: n.publishConflictResolved,
				logPath: n.logPath,
				detectedWavType: t.metadata?.detectedWavType,
				selectedWavType: t.metadata?.selectedWavType,
				manualSelectionApplied: t.metadata?.manualSelectionApplied,
				classificationReason: t.metadata?.classificationReason,
				mappingCount: t.mapping.length
			};
			return await A(K, r), e.sender.send("eventpipe:export-progress", { percent: 100 }), n;
		} catch (e) {
			let n = e instanceof Error ? e.message : String(e), r = n.match(/Export failed\. Log: (.+)\n/), i = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				status: "error",
				mxfPath: t.mxfPath,
				wavPath: t.wavPath,
				logPath: r?.[1]?.trim(),
				errorMessage: n,
				detectedWavType: t.metadata?.detectedWavType,
				selectedWavType: t.metadata?.selectedWavType,
				manualSelectionApplied: t.metadata?.manualSelectionApplied,
				classificationReason: t.metadata?.classificationReason,
				mappingCount: t.mapping.length
			};
			throw await A(K, i), e;
		}
	}), $(), o.on("second-instance", () => {
		if (B) {
			B.isMinimized() && B.restore(), B.focus();
			return;
		}
		$();
	}), o.on("activate", () => {
		i.getAllWindows().length === 0 && $();
	});
}))), o.on("window-all-closed", () => {
	process.platform !== "darwin" && o.quit();
});
//#endregion
