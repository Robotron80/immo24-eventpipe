import e from "node:path";
import t, { existsSync as n } from "node:fs";
import { fileURLToPath as r } from "node:url";
import { BrowserWindow as i, Menu as a, app as o, dialog as s, ipcMain as c, shell as l } from "electron";
import u from "node:fs/promises";
import { spawn as d } from "node:child_process";
//#region src/main/settings.html?raw
var f = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <style>\n      __SETTINGS_STYLE__\n    </style>\n  </head>\n  <body>\n    <div class=\"settings-root\">\n      <header class=\"settings-header\">\n        <h1>Konfiguration</h1>\n      </header>\n\n      <main class=\"content-scroll\">\n        <section class=\"settings-content\">\n          <label>\n            Watchfolder\n            <div class=\"path-row\">\n              <input id=\"watchFolder\" placeholder=\"/path/to/watchfolder\" />\n              <button id=\"browseWatchFolder\" type=\"button\">Durchsuchen...</button>\n            </div>\n          </label>\n\n          <label>\n            Temporärer Exportordner\n            <div class=\"path-row\">\n              <input id=\"tempExportFolder\" placeholder=\"/path/to/temp\" />\n              <button id=\"browseTempFolder\" type=\"button\">Durchsuchen...</button>\n            </div>\n          </label>\n\n        </section>\n      </main>\n\n      <footer class=\"actions-sticky\">\n        <button id=\"cancelButton\" type=\"button\">Abbrechen</button>\n        <button id=\"saveButton\" type=\"button\" class=\"primary\">Speichern</button>\n      </footer>\n    </div>\n\n    <script>\n      __SETTINGS_SCRIPT__\n    <\/script>\n  </body>\n</html>\n", p = "const watchFolderInput = document.getElementById('watchFolder')\nconst tempExportFolderInput = document.getElementById('tempExportFolder')\nconst browseWatchFolderButton = document.getElementById('browseWatchFolder')\nconst browseTempFolderButton = document.getElementById('browseTempFolder')\nconst saveButton = document.getElementById('saveButton')\nconst cancelButton = document.getElementById('cancelButton')\n\nfunction readFormSettings() {\n  return {\n    watchFolder: watchFolderInput.value,\n    tempExportFolder: tempExportFolderInput.value,\n  }\n}\n\nfunction applyFormSettings(settings) {\n  watchFolderInput.value = settings.watchFolder ?? ''\n  tempExportFolderInput.value = settings.tempExportFolder ?? ''\n}\n\nasync function browseInto(inputElement) {\n  try {\n    const selectedPath = await window.eventPipe.pickDirectory(inputElement.value)\n    if (selectedPath) {\n      inputElement.value = selectedPath\n    }\n  } catch (error) {\n    window.alert(error instanceof Error ? error.message : 'Ordnerauswahl fehlgeschlagen.')\n  }\n}\n\nasync function loadSettings() {\n  try {\n    const snapshot = await window.eventPipe.getSettings()\n    applyFormSettings(snapshot.settings)\n  } catch (error) {\n    window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht geladen werden.')\n  }\n}\n\nasync function saveSettings() {\n  saveButton.disabled = true\n  let shouldClose = false\n\n  try {\n    const snapshot = await window.eventPipe.saveSettings(readFormSettings())\n    applyFormSettings(snapshot.settings)\n    shouldClose = true\n  } catch (error) {\n    window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht gespeichert werden.')\n  } finally {\n    if (shouldClose) {\n      queueMicrotask(() => window.close())\n      return\n    }\n\n    saveButton.disabled = false\n  }\n}\n\nsaveButton.addEventListener('click', () => {\n  void saveSettings()\n})\n\ncancelButton.addEventListener('click', () => {\n  window.close()\n})\n\nbrowseWatchFolderButton.addEventListener('click', () => {\n  void browseInto(watchFolderInput)\n})\n\nbrowseTempFolderButton.addEventListener('click', () => {\n  void browseInto(tempExportFolderInput)\n})\n\ndocument.addEventListener('keydown', (event) => {\n  if (event.key === 'Escape') {\n    event.preventDefault()\n    window.close()\n    return\n  }\n\n  if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {\n    event.preventDefault()\n    void saveSettings()\n  }\n})\n\nwatchFolderInput.focus()\n\nvoid loadSettings()\n", m = ":root {\n  font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif;\n  color: #1f2328;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  background: #f3f5f8;\n  height: 100vh;\n  overflow: hidden;\n}\n\n.settings-root {\n  height: 100vh;\n  display: grid;\n  grid-template-rows: auto 1fr auto;\n  background: #f3f5f8;\n}\n\n.settings-header {\n  padding: 18px 22px 10px;\n  background: #f3f5f8;\n}\n\n.settings-header h1 {\n  margin: 0;\n  font-size: 20px;\n  font-weight: 600;\n  line-height: 1.2;\n  letter-spacing: -0.01em;\n  color: #20252b;\n}\n\n.settings-header p {\n  margin: 6px 0 0;\n  color: #5a6270;\n  font-size: 13px;\n}\n\n.content-scroll {\n  overflow: auto;\n  padding: 12px 22px;\n}\n\n.settings-content {\n  margin: 0;\n  background: #ffffff;\n  border: 1px solid #dbe2e9;\n  border-radius: 10px;\n  padding: 12px;\n  display: grid;\n  gap: 12px;\n}\n\nlabel {\n  display: grid;\n  gap: 6px;\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.02em;\n  text-transform: uppercase;\n  color: #616b79;\n}\n\ninput {\n  border: 1px solid #c8ccd2;\n  border-radius: 8px;\n  background: #ffffff;\n  color: #1f2328;\n  padding: 9px 10px;\n  font-size: 13px;\n}\n\ninput:focus {\n  outline: none;\n  border-color: #2f6fda;\n  box-shadow: 0 0 0 3px rgba(47, 111, 218, 0.1);\n}\n\n.path-row {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 8px;\n}\n\n.path-row button {\n  min-width: 84px;\n}\n\n.actions-sticky {\n  background: #f3f5f8;\n  padding: 12px 22px;\n  display: flex;\n  justify-content: flex-end;\n  align-items: center;\n  gap: 10px;\n}\n\nbutton {\n  border-radius: 9px;\n  border: 1px solid #c8ccd2;\n  background: #ffffff;\n  color: #22272e;\n  padding: 9px 14px;\n  font-size: 13px;\n  cursor: pointer;\n  transition: transform 100ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease;\n  box-shadow: 0 1px 1px rgba(15, 23, 42, 0.06);\n}\n\n.primary {\n  border-color: #2f6fda;\n  background: #2f6fda;\n  color: #ffffff;\n  font-weight: 600;\n  box-shadow: 0 1px 1px rgba(24, 69, 148, 0.18);\n}\n\nbutton:disabled {\n  opacity: 1;\n  color: #8a93a2;\n  background: #edf1f5;\n  border-color: #d2d9e2;\n  box-shadow: none;\n  cursor: not-allowed;\n}\n\nbutton.primary:disabled {\n  color: #dfe8f8;\n  background: #8aa9dd;\n  border-color: #8aa9dd;\n}\n\nbutton:not(:disabled):hover {\n  transform: translateY(-0.5px);\n  border-color: #b7c0cb;\n  background: #f9fafc;\n  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);\n}\n\nbutton.primary:not(:disabled):hover {\n  border-color: #2d6ace;\n  background: #2d6ace;\n  box-shadow: 0 2px 8px rgba(30, 82, 171, 0.22);\n}\n\nbutton:not(:disabled):active {\n  transform: translateY(0);\n  background: #edf1f5;\n  border-color: #aeb8c4;\n  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.14);\n}\n\nbutton.primary:not(:disabled):active {\n  background: #275eba;\n  border-color: #275eba;\n  box-shadow: inset 0 1px 2px rgba(16, 46, 95, 0.24);\n}\n\nbutton:focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 3px rgba(47, 111, 218, 0.2);\n}\n\ninput:focus-visible {\n  outline: none;\n  border-color: #2f6fda;\n  box-shadow: 0 0 0 3px rgba(47, 111, 218, 0.12);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  button {\n    transition: none !important;\n  }\n}\n\n@media (max-width: 900px) {\n  .settings-header,\n  .content-scroll,\n  .actions-sticky {\n    padding-left: 14px;\n    padding-right: 14px;\n  }\n}\n", h = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <style>\n      __SPLASH_STYLE__\n    </style>\n  </head>\n  <body>\n    <div class=\"card\">\n      <div class=\"inner\">\n        <img class=\"pinwheel\" src=\"__SPLASH_ICON_SRC__\" alt=\"\" aria-hidden=\"true\" />\n        <p>Ja, aber...</p>\n        <h1>immo24 EventPipe</h1>\n      </div>\n      <p class=\"version\">v__APP_VERSION__</p>\n    </div>\n  </body>\n</html>\n", g = "html,\nbody {\n  width: 100%;\n  height: 100%;\n  margin: 0;\n  overflow: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif;\n  background: transparent;\n}\n\n.card {\n  width: 100%;\n  height: 100%;\n  display: grid;\n  place-items: center;\n  background: rgba(255, 255, 255, 0.96);\n  border-radius: 16px;\n  border: 1px solid rgba(0, 0, 0, 0.08);\n  box-sizing: border-box;\n  position: relative;\n  color: #1f1f1f;\n  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.2);\n}\n\n.inner {\n  text-align: center;\n  display: grid;\n  gap: 10px;\n}\n\n.version {\n  position: absolute;\n  right: 12px;\n  bottom: 10px;\n  margin: 0;\n  font-size: 11px;\n  line-height: 1;\n  color: #a4aab3;\n  letter-spacing: 0.02em;\n}\n\n.pinwheel {\n  width: 120px;\n  height: 120px;\n  margin: 0 auto 8px;\n  animation: spin 4s linear infinite;\n  object-fit: contain;\n  display: block;\n}\n\np {\n  margin: 0;\n  color: #6f7680;\n}\n\nh1 {\n  margin: 0;\n  font-size: 24px;\n  font-weight: 600;\n}\n\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n";
//#endregion
//#region src/main/historyService.ts
function ee(t) {
	return e.join(e.dirname(t), "export-history.jsonl");
}
async function _(t, n) {
	await u.mkdir(e.dirname(t), { recursive: !0 }), await u.appendFile(t, `${JSON.stringify(n)}\n`, "utf-8");
}
async function te(e, t = 20) {
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
function ne(e) {
	let t = {
		ts: (/* @__PURE__ */ new Date()).toISOString(),
		...e
	};
	console.log(JSON.stringify(t));
}
//#endregion
//#region src/shared/mapping.ts
var re = {
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
}, ie = [
	2,
	4,
	6,
	8
];
function v(e) {
	return ie.includes(e);
}
function ae(e, t = []) {
	return Array.from({ length: e }, (e, n) => ({
		mxfTrack: n + 1,
		wavChannel: n + 1,
		name: t[n]
	}));
}
function oe(e) {
	return re[e].map((e, t) => ({
		mxfTrack: t + 1,
		wavChannel: e
	}));
}
//#endregion
//#region src/shared/classifier.ts
function se(e) {
	let t = [];
	for (let [n, r] of Object.entries(e.streamTags ?? {})) t.push(`${n}=${r}`);
	for (let [n, r] of Object.entries(e.formatTags ?? {})) t.push(`${n}=${r}`);
	return t.join(" | ").toLowerCase();
}
function ce(e) {
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
function le(e) {
	if (!v(e.channels)) return {
		type: "unknown",
		trackNames: [],
		reason: `Unsupported channel count: ${e.channels}`
	};
	let t = ce(e);
	if (t.length > 0) return {
		type: "multitrack-wav",
		trackNames: t,
		reason: "dTRK metadata detected"
	};
	let n = se(e), r = (e.channelLayout ?? "").toLowerCase();
	return r.includes("l r c lfe lb rb ls rs") || r.includes("l r c lfe ls rs") || r.includes("l r ls rs") || r.includes("7.1") || r.includes("5.1") || n.includes("l r c lfe lb rb ls rs") ? {
		type: "legacy-surround-track",
		trackNames: [],
		reason: "Legacy surround channel layout detected"
	} : e.channels === 2 || e.channels === 4 ? {
		type: "legacy-surround-track",
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
function y(e) {
	if (!e) return {};
	let t = {};
	for (let [n, r] of Object.entries(e)) t[n.toLowerCase()] = r;
	return t;
}
async function b(e, t) {
	return new Promise((n, r) => {
		let i = d(t, [
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
				let e = o.trim();
				if (/invalid data found when processing input/i.test(e)) {
					r(/* @__PURE__ */ Error("Die ausgewählte Datei ist kein lesbares WAV."));
					return;
				}
				r(/* @__PURE__ */ Error("Die ausgewählte Datei ist kein lesbares WAV oder verwendet ein nicht unterstütztes Audioformat."));
				return;
			}
			try {
				let e = JSON.parse(a), t = e.streams?.find((e) => typeof e.channels == "number");
				if (!t || typeof t.channels != "number") {
					r(/* @__PURE__ */ Error("Die ausgewählte Datei ist kein lesbares WAV oder enthält keinen verwertbaren Audiostream."));
					return;
				}
				n({
					channels: t.channels,
					channelLayout: t.channel_layout,
					sampleRate: t.sample_rate ? Number(t.sample_rate) : void 0,
					bitsPerSample: t.bits_per_sample,
					durationSeconds: t.duration ? Number(t.duration) : e.format?.duration ? Number(e.format.duration) : void 0,
					codecName: t.codec_name,
					streamTags: y(t.tags),
					formatTags: y(e.format?.tags)
				});
			} catch (e) {
				r(/* @__PURE__ */ Error(`Could not parse ffprobe output: ${e.message}`));
			}
		});
	});
}
async function ue(e, t) {
	return new Promise((n, r) => {
		let i = d(t, [
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
					formatTags: y(e.format?.tags)
				});
			} catch (e) {
				r(/* @__PURE__ */ Error(`Could not parse ffprobe output: ${e.message}`));
			}
		});
	});
}
//#endregion
//#region src/main/filePublisher.ts
async function de(e) {
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
async function fe(t, n) {
	if (!n.trim()) throw Error("Watchfolder is not configured.");
	await de(t), await u.mkdir(n, { recursive: !0 });
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
function pe(e, t, n, r) {
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
function S(e, t) {
	return (e.trim() || "{sourceName}").replaceAll("{sourceName}", t);
}
function C(e) {
	return e.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim() || "eventpipe-export";
}
function me(e) {
	let [t, n, r] = e.split(":");
	return Number(t) * 3600 + Number(n) * 60 + Number(r);
}
function he(e, t) {
	let n = /time=([0-9:.]+)/.exec(e), r = /speed=\s*([0-9.]+x)/.exec(e);
	if (!n && !r) return;
	let i = {
		timecode: n?.[1],
		speed: r?.[1]
	};
	if (n && typeof t == "number" && t > 0) {
		let e = me(n[1]);
		i.percent = Math.max(0, Math.min(100, e / t * 100));
	}
	return i;
}
async function w(t, n, r, i) {
	let a = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), o = e.join(n.tempExportFolder, "logs");
	await u.mkdir(o, { recursive: !0 });
	let s = `${a}-${C(t)}-${i}.log`, c = e.join(o, s);
	return await u.writeFile(c, r, "utf-8"), c;
}
function T(e, t, n, r) {
	return new Promise((i, a) => {
		let o = d(e, t, { windowsHide: !0 }), s = "", c = "";
		o.stdout.on("data", (e) => {
			s += e.toString();
		}), o.stderr.on("data", (e) => {
			let t = e.toString();
			s += t, c += t;
			let i = c.split(/\r|\n/);
			c = i.pop() ?? "";
			for (let e of i) {
				let t = he(e, n);
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
async function ge(t, n, r) {
	let i = e.parse(t.mxfPath).name, a = t.customFileName ? `${C(t.customFileName)}.mxf` : `${C(S(n.namingPreset, i))}.mxf`;
	await u.mkdir(n.tempExportFolder, { recursive: !0 });
	let o = e.join(n.tempExportFolder, a), s = pe(t.mxfPath, t.wavPath, t.mapping, o), c = await b(t.wavPath, n.ffprobePath);
	try {
		let e = await T(n.ffmpegPath, s, c.durationSeconds, r), t = await fe(o, n.watchFolder), a = await w(i, n, e, "success");
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
		let t = e instanceof Error ? e.message : String(e), r = await w(i, n, t, "error");
		throw Error(`Export failed. Log: ${r}\n${t}`);
	}
}
//#endregion
//#region src/main/settingsService.ts
var E = "config.json";
function D(t) {
	let r = process.platform === "win32" ? `${t}.exe` : t, i = [e.join(process.resourcesPath, "bin", `${process.platform}-${process.arch}`, r), e.join(process.cwd(), "resources", "bin", `${process.platform}-${process.arch}`, r)];
	for (let e of i) if (n(e)) return e;
	if (process.env.EVENTPIPE_ALLOW_SYSTEM_BINARY_FALLBACK === "1") return t;
	throw Error(`Bundled ${t} binary not found for ${process.platform}-${process.arch}.`);
}
var O = {
	watchFolder: e.join(process.cwd(), "eventpipe-watchfolder"),
	tempExportFolder: e.join(process.cwd(), "eventpipe-temp"),
	ffmpegPath: D("ffmpeg"),
	ffprobePath: D("ffprobe"),
	namingPreset: "{sourceName}",
	maxDurationDeltaSeconds: .2,
	debugLoggingEnabled: !1
};
function k(e, t) {
	if (typeof e != "string") return t;
	let n = e.trim();
	return n.length > 0 ? n : t;
}
function A(e) {
	let t = D("ffmpeg"), n = D("ffprobe");
	return {
		watchFolder: k(e?.watchFolder, O.watchFolder),
		tempExportFolder: k(e?.tempExportFolder, O.tempExportFolder),
		ffmpegPath: t,
		ffprobePath: n,
		namingPreset: k(e?.namingPreset, O.namingPreset),
		maxDurationDeltaSeconds: O.maxDurationDeltaSeconds,
		debugLoggingEnabled: O.debugLoggingEnabled
	};
}
function j() {
	if (process.env.EVENTPIPE_CONFIG_PATH?.trim()) return process.env.EVENTPIPE_CONFIG_PATH.trim();
	if (process.platform === "darwin") return e.join("/Users/Shared", "immo24-eventpipe", E);
	if (process.platform === "win32") {
		let t = process.env.PROGRAMDATA?.trim() || e.join("C:", "ProgramData");
		return e.join(t, "immo24-eventpipe", E);
	}
	return e.join("/var/lib", "immo24-eventpipe", E);
}
async function M(e) {
	try {
		return await u.access(e), !0;
	} catch {
		return !1;
	}
}
async function N(e) {
	try {
		let t = await u.readFile(e, "utf-8");
		return A(JSON.parse(t));
	} catch {
		return { ...O };
	}
}
async function P(t, n) {
	let r = A(n);
	return await u.mkdir(e.dirname(t), { recursive: !0 }), await u.writeFile(t, `${JSON.stringify(r, null, 2)}\n`, "utf-8"), r;
}
//#endregion
//#region src/main/registerIpcHandlers.ts
function F() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function I(t, n) {
	let r = e.relative(t, n);
	return r.length > 0 && !r.startsWith("..") && !e.isAbsolute(r);
}
function L(t) {
	let { getActiveSettings: n, setActiveSettings: r, getActiveConfigPath: i, getActiveHistoryPath: a, openWorkflowWindow: o, workflowStartPayloadByWebContentsId: u, getDialogOwnerWindow: d, debugLog: f, withRuntimeDebugLogging: p, isTrustedRenderer: m } = t;
	function h(e) {
		let t = e.senderFrame?.url ?? "";
		if (!m(e.sender.id, t)) throw Error("Untrusted renderer attempted to call privileged IPC handler.");
	}
	function g(e) {
		return (t, ...n) => (h(t), e(t, ...n));
	}
	c.handle("eventpipe:get-settings", g(() => ({
		settings: n(),
		configPath: i()
	}))), c.handle("eventpipe:open-workflow-window", g((e, t) => (o(t), !0))), c.handle("eventpipe:get-workflow-start-payload", g((e) => {
		let t = u.get(e.sender.id);
		return u.delete(e.sender.id), t;
	})), c.handle("eventpipe:get-export-history", g(async (e, t) => {
		let n = Math.max(1, Math.min(100, typeof t == "number" ? Math.floor(t) : 20));
		return te(a(), n);
	})), c.handle("eventpipe:pick-directory", g(async (e, t) => {
		let n = d(), r = {
			title: "Ordner auswählen",
			properties: [
				"openDirectory",
				"createDirectory",
				"promptToCreate"
			],
			defaultPath: t?.trim() || void 0
		}, i = n ? await s.showOpenDialog(n, r) : await s.showOpenDialog(r);
		if (!(i.canceled || i.filePaths.length === 0)) return i.filePaths[0];
	})), c.handle("eventpipe:open-path", g(async (t, r) => {
		if (!r?.trim()) return !1;
		let i = e.resolve(r);
		return !I(e.resolve(n().tempExportFolder, "logs"), i) || !i.toLowerCase().endsWith(".log") ? !1 : (await l.openPath(i)).length === 0;
	})), c.handle("eventpipe:save-settings", g(async (e, t) => {
		let a = {
			...n(),
			...t
		}, o = await P(i(), a), s = p(o);
		return r(s), f("Settings saved", { configPath: i() }), {
			settings: s,
			configPath: i()
		};
	})), c.handle("eventpipe:analyze-mxf", g(async (e, t) => (f("Analyze MXF requested", { mxfPath: t }), { probe: await ue(t, n().ffprobePath) }))), c.handle("eventpipe:analyze-wav", g(async (e, t) => {
		f("Analyze WAV requested", { wavPath: t });
		let r = await b(t, n().ffprobePath), i = le(r);
		if (!v(r.channels)) throw Error(`Unsupported channel count ${r.channels}. Allowed: 2, 4, 6, 8.`);
		return {
			probe: r,
			classification: i,
			mapping: i.type === "legacy-surround-track" ? oe(r.channels) : ae(r.channels, i.trackNames)
		};
	})), c.handle("eventpipe:export-job", g(async (e, t) => {
		if (!t.mxfPath || !t.wavPath || t.mapping.length === 0) throw Error("Export request is incomplete.");
		f("Export requested", {
			mxfPath: t.mxfPath,
			wavPath: t.wavPath,
			mappingEntries: t.mapping.length
		}), e.sender.send("eventpipe:export-progress", { percent: 0 });
		try {
			let r = await ge(t, n(), (t) => {
				e.sender.send("eventpipe:export-progress", t);
			}), i = {
				id: F(),
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				status: "success",
				mxfPath: t.mxfPath,
				wavPath: t.wavPath,
				outputPath: r.outputPath,
				tempOutputPath: r.tempOutputPath,
				publishedPath: r.publishedPath,
				publishConflictResolved: r.publishConflictResolved,
				logPath: r.logPath,
				detectedWavType: t.metadata?.detectedWavType,
				selectedWavType: t.metadata?.selectedWavType,
				manualSelectionApplied: t.metadata?.manualSelectionApplied,
				classificationReason: t.metadata?.classificationReason,
				mappingCount: t.mapping.length
			};
			return await _(a(), i), e.sender.send("eventpipe:export-progress", { percent: 100 }), r;
		} catch (e) {
			let n = e instanceof Error ? e.message : String(e), r = n.match(/Export failed\. Log: (.+)\n/), i = {
				id: F(),
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
			throw await _(a(), i), e;
		}
	}));
}
//#endregion
//#region src/main/index.ts
var R = null, z = null, B = null, V = null, H = /* @__PURE__ */ new Map(), U = 0, W = { ...O }, G = "", K = "", q = !1, _e = process.argv.includes("--debug-logging") || [
	"1",
	"true",
	"yes",
	"on"
].includes((process.env.EVENTPIPE_DEBUG_LOGGING || "").toLowerCase()), ve = r(import.meta.url), J = e.dirname(ve);
o.requestSingleInstanceLock() || o.quit();
function Y() {
	if (process.env.VITE_DEV_SERVER_URL) try {
		return new URL(process.env.VITE_DEV_SERVER_URL).origin;
	} catch {
		return;
	}
}
function X(e, t) {
	e.webContents.setWindowOpenHandler(() => ({ action: "deny" })), e.webContents.on("will-navigate", (e, n) => {
		t(n) || e.preventDefault();
	});
}
function Z(e) {
	return {
		...e,
		debugLoggingEnabled: _e
	};
}
function ye(e, t) {
	W.debugLoggingEnabled && ne({
		level: "info",
		message: e,
		context: t
	});
}
function be() {
	let n = o.getAppPath(), r = [
		e.resolve(process.resourcesPath, "assets/icon.png"),
		e.resolve(n, "src/assets/icon.png"),
		e.resolve(n, "dist/assets/icon.png")
	];
	for (let e of r) if (t.existsSync(e)) return `data:image/png;base64,${t.readFileSync(e).toString("base64")}`;
	return "";
}
function xe() {
	z = new i({
		width: 420,
		height: 250,
		frame: !1,
		transparent: !0,
		backgroundColor: "#00000000",
		resizable: !1,
		minimizable: !1,
		maximizable: !1,
		center: !0,
		fullscreenable: !1,
		alwaysOnTop: !0,
		movable: !1,
		show: !1,
		webPreferences: {
			contextIsolation: !0,
			sandbox: !0
		}
	}), X(z, (e) => e.startsWith("data:text/html"));
	let e = h.replace("__SPLASH_STYLE__", g).replace("__SPLASH_ICON_SRC__", be()).replace("__APP_VERSION__", o.getVersion());
	z.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(e)}`), U = Date.now(), z.show();
}
function Q() {
	if (B && !B.isDestroyed()) {
		B.focus();
		return;
	}
	let t = R && !R.isDestroyed() && R.isVisible() ? R : void 0;
	B = new i({
		width: 780,
		height: 400,
		minWidth: 780,
		minHeight: 400,
		resizable: !0,
		title: "Konfiguration",
		parent: t,
		modal: !!t,
		show: !1,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: e.join(J, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1
		}
	}), X(B, (e) => e.startsWith("data:text/html")), B.setMenu(null);
	let n = f.replace("__SETTINGS_STYLE__", m).replace("__SETTINGS_SCRIPT__", p);
	B.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(n)}`), B.once("ready-to-show", () => {
		B?.show();
	}), B.on("closed", () => {
		B = null;
	});
}
function Se(t) {
	let n = V;
	if (n && !n.isDestroyed() && !n.webContents.isDestroyed()) {
		t && H.set(n.webContents.id, t), n.focus();
		return;
	}
	let r = R && !R.isDestroyed() && R.isVisible() ? R : void 0;
	V = new i({
		width: 900,
		height: 650,
		minWidth: 780,
		minHeight: 560,
		resizable: !0,
		title: "Exportdialog",
		parent: r,
		modal: !!r,
		show: !1,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: e.join(J, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1
		}
	});
	let a = Y();
	X(V, (e) => a ? e.startsWith(a) : e.startsWith("file://")), t && H.set(V.webContents.id, t);
	let o = V.webContents.id;
	if (V.setMenu(null), process.env.VITE_DEV_SERVER_URL) {
		let e = new URL(process.env.VITE_DEV_SERVER_URL);
		e.searchParams.set("window", "workflow"), V.loadURL(e.toString());
	} else V.loadFile(e.join(J, "../dist/index.html"), { query: { window: "workflow" } });
	V.once("ready-to-show", () => {
		V?.show();
	}), V.on("closed", () => {
		H.delete(o), V = null;
	});
}
async function Ce(e = 2e3) {
	if (U === 0) return;
	let t = e - (Date.now() - U);
	t <= 0 || await new Promise((e) => setTimeout(e, t));
}
function we() {
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
	R = new i({
		width: 320,
		height: 320,
		useContentSize: !0,
		resizable: !1,
		maximizable: !1,
		fullscreenable: !1,
		show: !1,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: e.join(J, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !1
		}
	});
	let t = Y();
	X(R, (e) => t ? e.startsWith(t) : e.startsWith("file://")), process.env.VITE_DEV_SERVER_URL ? R.loadURL(process.env.VITE_DEV_SERVER_URL) : R.loadFile(e.join(J, "../dist/index.html")), R.webContents.once("did-finish-load", async () => {
		await Ce(2e3), z?.close(), z = null, R?.show(), q &&= (Q(), !1);
	});
}
o.whenReady().then(() => (o.setName("immo24 EventPipe"), G = j(), K = ee(G), M(G).then(async (e) => {
	q = !e, W = Z(e ? await N(G) : { ...O }), xe(), we(), L({
		getActiveSettings: () => W,
		setActiveSettings: (e) => {
			W = e;
		},
		getActiveConfigPath: () => G,
		getActiveHistoryPath: () => K,
		openWorkflowWindow: Se,
		workflowStartPayloadByWebContentsId: H,
		getDialogOwnerWindow: () => B && !B.isDestroyed() ? B : R ?? void 0,
		debugLog: ye,
		withRuntimeDebugLogging: Z,
		isTrustedRenderer: (e, t) => {
			if (![
				R?.webContents.id,
				V?.webContents.id,
				B?.webContents.id
			].filter((e) => typeof e == "number").includes(e)) return !1;
			let n = Y();
			return !!(n && t.startsWith(n) || t.startsWith("file://") || t.startsWith("data:text/html"));
		}
	}), $(), o.on("second-instance", () => {
		if (R) {
			R.isMinimized() && R.restore(), R.focus();
			return;
		}
		$();
	}), o.on("activate", () => {
		i.getAllWindows().length === 0 && $();
	});
}))), o.on("window-all-closed", () => {
	o.quit();
});
//#endregion
