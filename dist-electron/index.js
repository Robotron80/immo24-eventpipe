import path from "node:path";
import fs, { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from "electron";
import fs$1 from "node:fs/promises";
import { spawn } from "node:child_process";
//#region src/main/settings.html?raw
var settings_default$2 = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <style>\n      __SETTINGS_STYLE__\n    </style>\n  </head>\n  <body>\n    <div class=\"settings-root\">\n      <header class=\"settings-header\">\n        <h1>Konfiguration</h1>\n      </header>\n\n      <main class=\"content-scroll\">\n        <section class=\"settings-content\">\n          <label>\n            Watchfolder\n            <div class=\"path-row\">\n              <input id=\"watchFolder\" placeholder=\"/path/to/watchfolder\" />\n              <button id=\"browseWatchFolder\" type=\"button\">Durchsuchen...</button>\n            </div>\n          </label>\n\n          <label>\n            Temporärer Exportordner\n            <div class=\"path-row\">\n              <input id=\"tempExportFolder\" placeholder=\"/path/to/temp\" />\n              <button id=\"browseTempFolder\" type=\"button\">Durchsuchen...</button>\n            </div>\n          </label>\n\n        </section>\n      </main>\n\n      <footer class=\"actions-sticky\">\n        <button id=\"cancelButton\" type=\"button\">Abbrechen</button>\n        <button id=\"saveButton\" type=\"button\" class=\"primary\">Speichern</button>\n      </footer>\n    </div>\n\n    <script>\n      __SETTINGS_SCRIPT__\n    <\/script>\n  </body>\n</html>\n";
//#endregion
//#region src/main/settings.js?raw
var settings_default$1 = "const watchFolderInput = document.getElementById('watchFolder')\nconst tempExportFolderInput = document.getElementById('tempExportFolder')\nconst browseWatchFolderButton = document.getElementById('browseWatchFolder')\nconst browseTempFolderButton = document.getElementById('browseTempFolder')\nconst saveButton = document.getElementById('saveButton')\nconst cancelButton = document.getElementById('cancelButton')\n\nfunction readFormSettings() {\n  return {\n    watchFolder: watchFolderInput.value,\n    tempExportFolder: tempExportFolderInput.value,\n  }\n}\n\nfunction applyFormSettings(settings) {\n  watchFolderInput.value = settings.watchFolder ?? ''\n  tempExportFolderInput.value = settings.tempExportFolder ?? ''\n}\n\nasync function browseInto(inputElement) {\n  try {\n    const selectedPath = await window.eventPipe.pickDirectory(inputElement.value)\n    if (selectedPath) {\n      inputElement.value = selectedPath\n    }\n  } catch (error) {\n    window.alert(error instanceof Error ? error.message : 'Ordnerauswahl fehlgeschlagen.')\n  }\n}\n\nasync function loadSettings() {\n  try {\n    const snapshot = await window.eventPipe.getSettings()\n    applyFormSettings(snapshot.settings)\n  } catch (error) {\n    window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht geladen werden.')\n  }\n}\n\nasync function saveSettings() {\n  saveButton.disabled = true\n  let shouldClose = false\n\n  try {\n    const snapshot = await window.eventPipe.saveSettings(readFormSettings())\n    applyFormSettings(snapshot.settings)\n    shouldClose = true\n  } catch (error) {\n    window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht gespeichert werden.')\n  } finally {\n    if (shouldClose) {\n      queueMicrotask(() => window.close())\n      return\n    }\n\n    saveButton.disabled = false\n  }\n}\n\nsaveButton.addEventListener('click', () => {\n  void saveSettings()\n})\n\ncancelButton.addEventListener('click', () => {\n  window.close()\n})\n\nbrowseWatchFolderButton.addEventListener('click', () => {\n  void browseInto(watchFolderInput)\n})\n\nbrowseTempFolderButton.addEventListener('click', () => {\n  void browseInto(tempExportFolderInput)\n})\n\ndocument.addEventListener('keydown', (event) => {\n  if (event.key === 'Escape') {\n    event.preventDefault()\n    window.close()\n    return\n  }\n\n  if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {\n    event.preventDefault()\n    void saveSettings()\n  }\n})\n\nwatchFolderInput.focus()\n\nvoid loadSettings()\n";
//#endregion
//#region src/main/settings.css?raw
var settings_default = ":root {\n  font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif;\n  color: #1f2328;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  background: #f3f5f8;\n  height: 100vh;\n  overflow: hidden;\n}\n\n.settings-root {\n  height: 100vh;\n  display: grid;\n  grid-template-rows: auto 1fr auto;\n  background: #f3f5f8;\n}\n\n.settings-header {\n  padding: 18px 22px 10px;\n  background: #f3f5f8;\n}\n\n.settings-header h1 {\n  margin: 0;\n  font-size: 20px;\n  font-weight: 600;\n  line-height: 1.2;\n  letter-spacing: -0.01em;\n  color: #20252b;\n}\n\n.settings-header p {\n  margin: 6px 0 0;\n  color: #5a6270;\n  font-size: 13px;\n}\n\n.content-scroll {\n  overflow: auto;\n  padding: 12px 22px;\n}\n\n.settings-content {\n  margin: 0;\n  background: #ffffff;\n  border: 1px solid #dbe2e9;\n  border-radius: 10px;\n  padding: 12px;\n  display: grid;\n  gap: 12px;\n}\n\nlabel {\n  display: grid;\n  gap: 6px;\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.02em;\n  text-transform: uppercase;\n  color: #616b79;\n}\n\ninput {\n  border: 1px solid #c8ccd2;\n  border-radius: 8px;\n  background: #ffffff;\n  color: #1f2328;\n  padding: 9px 10px;\n  font-size: 13px;\n}\n\ninput:focus {\n  outline: none;\n  border-color: #2f6fda;\n  box-shadow: 0 0 0 3px rgba(47, 111, 218, 0.1);\n}\n\n.path-row {\n  display: grid;\n  grid-template-columns: 1fr auto;\n  gap: 8px;\n}\n\n.path-row button {\n  min-width: 84px;\n}\n\n.actions-sticky {\n  background: #f3f5f8;\n  padding: 12px 22px;\n  display: flex;\n  justify-content: flex-end;\n  align-items: center;\n  gap: 10px;\n}\n\nbutton {\n  border-radius: 9px;\n  border: 1px solid #c8ccd2;\n  background: #ffffff;\n  color: #22272e;\n  padding: 9px 14px;\n  font-size: 13px;\n  cursor: pointer;\n  transition: transform 100ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease;\n  box-shadow: 0 1px 1px rgba(15, 23, 42, 0.06);\n}\n\n.primary {\n  border-color: #2f6fda;\n  background: #2f6fda;\n  color: #ffffff;\n  font-weight: 600;\n  box-shadow: 0 1px 1px rgba(24, 69, 148, 0.18);\n}\n\nbutton:disabled {\n  opacity: 1;\n  color: #8a93a2;\n  background: #edf1f5;\n  border-color: #d2d9e2;\n  box-shadow: none;\n  cursor: not-allowed;\n}\n\nbutton.primary:disabled {\n  color: #dfe8f8;\n  background: #8aa9dd;\n  border-color: #8aa9dd;\n}\n\nbutton:not(:disabled):hover {\n  transform: translateY(-0.5px);\n  border-color: #b7c0cb;\n  background: #f9fafc;\n  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);\n}\n\nbutton.primary:not(:disabled):hover {\n  border-color: #2d6ace;\n  background: #2d6ace;\n  box-shadow: 0 2px 8px rgba(30, 82, 171, 0.22);\n}\n\nbutton:not(:disabled):active {\n  transform: translateY(0);\n  background: #edf1f5;\n  border-color: #aeb8c4;\n  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.14);\n}\n\nbutton.primary:not(:disabled):active {\n  background: #275eba;\n  border-color: #275eba;\n  box-shadow: inset 0 1px 2px rgba(16, 46, 95, 0.24);\n}\n\nbutton:focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 3px rgba(47, 111, 218, 0.2);\n}\n\ninput:focus-visible {\n  outline: none;\n  border-color: #2f6fda;\n  box-shadow: 0 0 0 3px rgba(47, 111, 218, 0.12);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  button {\n    transition: none !important;\n  }\n}\n\n@media (max-width: 900px) {\n  .settings-header,\n  .content-scroll,\n  .actions-sticky {\n    padding-left: 14px;\n    padding-right: 14px;\n  }\n}\n";
//#endregion
//#region src/main/splash.html?raw
var splash_default$1 = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <style>\n      __SPLASH_STYLE__\n    </style>\n  </head>\n  <body>\n    <div class=\"card\">\n      <div class=\"inner\">\n        <img class=\"pinwheel\" src=\"__SPLASH_ICON_SRC__\" alt=\"\" aria-hidden=\"true\" />\n        <p>Ja, aber...</p>\n        <h1>immo24 EventPipe</h1>\n      </div>\n      <p class=\"version\">v__APP_VERSION__</p>\n    </div>\n  </body>\n</html>\n";
//#endregion
//#region src/main/splash.css?raw
var splash_default = "body {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif;\n  background: transparent;\n}\n\n.card {\n  width: 100vw;\n  height: 100vh;\n  display: grid;\n  place-items: center;\n  background: rgba(255, 255, 255, 0.96);\n  border-radius: 16px;\n  border: 1px solid rgba(0, 0, 0, 0.08);\n  color: #1f1f1f;\n  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.2);\n}\n\n.inner {\n  text-align: center;\n  display: grid;\n  gap: 10px;\n}\n\n.version {\n  position: absolute;\n  right: 12px;\n  bottom: 10px;\n  margin: 0;\n  font-size: 11px;\n  line-height: 1;\n  color: #a4aab3;\n  letter-spacing: 0.02em;\n}\n\n.pinwheel {\n  width: 120px;\n  height: 120px;\n  margin: 0 auto 8px;\n  animation: spin 4s linear infinite;\n  object-fit: contain;\n  display: block;\n}\n\np {\n  margin: 0;\n  color: #6f7680;\n}\n\nh1 {\n  margin: 0;\n  font-size: 24px;\n  font-weight: 600;\n}\n\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n";
//#endregion
//#region src/main/historyService.ts
function getExportHistoryPath(configPath) {
	return path.join(path.dirname(configPath), "export-history.jsonl");
}
async function appendExportHistory(historyPath, entry) {
	await fs$1.mkdir(path.dirname(historyPath), { recursive: true });
	await fs$1.appendFile(historyPath, `${JSON.stringify(entry)}\n`, "utf-8");
}
async function readExportHistory(historyPath, limit = 20) {
	try {
		const lines = (await fs$1.readFile(historyPath, "utf-8")).split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
		const parsed = [];
		for (let index = lines.length - 1; index >= 0 && parsed.length < limit; index -= 1) try {
			parsed.push(JSON.parse(lines[index]));
		} catch {}
		return parsed;
	} catch {
		return [];
	}
}
//#endregion
//#region src/main/logService.ts
function writeLog(entry) {
	const payload = {
		ts: (/* @__PURE__ */ new Date()).toISOString(),
		...entry
	};
	console.log(JSON.stringify(payload));
}
//#endregion
//#region src/shared/mapping.ts
var LEGACY_MAPPING = {
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
};
var SUPPORTED_CHANNEL_COUNTS = [
	2,
	4,
	6,
	8
];
function isSupportedChannelCount(value) {
	return SUPPORTED_CHANNEL_COUNTS.includes(value);
}
function buildBounceMapping(channels, trackNames = []) {
	return Array.from({ length: channels }, (_, index) => ({
		mxfTrack: index + 1,
		wavChannel: index + 1,
		name: trackNames[index]
	}));
}
function buildLegacyMapping(channels) {
	return LEGACY_MAPPING[channels].map((wavChannel, index) => ({
		mxfTrack: index + 1,
		wavChannel
	}));
}
//#endregion
//#region src/shared/classifier.ts
function normalizeTags$1(probe) {
	const values = [];
	for (const [key, value] of Object.entries(probe.streamTags ?? {})) values.push(`${key}=${value}`);
	for (const [key, value] of Object.entries(probe.formatTags ?? {})) values.push(`${key}=${value}`);
	return values.join(" | ").toLowerCase();
}
function extractDtrkNames(probe) {
	const cleanName = (value) => value.trim().replace(/[\s/|,;:-]+$/g, "").trim();
	const stripMetadataTail = (value) => value.replace(/\s*\|\s*[a-z_][a-z0-9_ -]*\s*=.*$/i, "").replace(/\s+[a-z_][a-z0-9_ -]*\s*=.*$/i, "").trim();
	const dtrkByIndex = /* @__PURE__ */ new Map();
	const allTagEntries = [...Object.entries(probe.streamTags ?? {}), ...Object.entries(probe.formatTags ?? {})];
	const combinedText = allTagEntries.map(([key, value]) => `${key}=${value}`).join(" | ");
	const tokenMatches = [...combinedText.matchAll(/dTRK\s*(\d+)\s*=/gi)];
	for (let index = 0; index < tokenMatches.length; index += 1) {
		const current = tokenMatches[index];
		const next = tokenMatches[index + 1];
		if (current.index === void 0) continue;
		const valueStart = current.index + current[0].length;
		const valueEnd = next?.index ?? combinedText.length;
		const rawValue = combinedText.slice(valueStart, valueEnd);
		const trackIndex = Number(current[1]);
		const name = cleanName(stripMetadataTail(rawValue));
		if (name) dtrkByIndex.set(trackIndex, name);
	}
	for (const [key, value] of allTagEntries) {
		const keyMatch = key.match(/^\s*dtrk\s*(\d+)\s*$/i);
		if (keyMatch && value.trim()) dtrkByIndex.set(Number(keyMatch[1]), cleanName(stripMetadataTail(value)));
	}
	return [...dtrkByIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, name]) => name);
}
function classifyWav(probe) {
	if (!isSupportedChannelCount(probe.channels)) return {
		type: "unknown",
		trackNames: [],
		reason: `Unsupported channel count: ${probe.channels}`
	};
	const dtrkNames = extractDtrkNames(probe);
	if (dtrkNames.length > 0) return {
		type: "multitrack-wav",
		trackNames: dtrkNames,
		reason: "dTRK metadata detected"
	};
	const tagBlob = normalizeTags$1(probe);
	const layout = (probe.channelLayout ?? "").toLowerCase();
	if (layout.includes("l r c lfe lb rb ls rs") || layout.includes("l r c lfe ls rs") || layout.includes("l r ls rs") || layout.includes("7.1") || layout.includes("5.1") || tagBlob.includes("l r c lfe lb rb ls rs")) return {
		type: "legacy-surround-track",
		trackNames: [],
		reason: "Legacy surround channel layout detected"
	};
	if (probe.channels === 2 || probe.channels === 4) return {
		type: "legacy-surround-track",
		trackNames: [],
		reason: "No dTRK metadata found for stereo/quad WAV, defaulting to legacy mapping"
	};
	return {
		type: "unknown",
		trackNames: [],
		reason: "No dTRK metadata and no known legacy layout found"
	};
}
//#endregion
//#region src/main/ffprobeService.ts
function normalizeTags(tags) {
	if (!tags) return {};
	const normalized = {};
	for (const [key, value] of Object.entries(tags)) normalized[key.toLowerCase()] = value;
	return normalized;
}
async function analyzeWavWithFfprobe(wavPath, ffprobePath) {
	return new Promise((resolve, reject) => {
		const child = spawn(ffprobePath, [
			"-v",
			"error",
			"-print_format",
			"json",
			"-show_streams",
			"-show_format",
			wavPath
		], { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", (error) => {
			reject(/* @__PURE__ */ new Error(`Unable to start ffprobe: ${error.message}`));
		});
		child.on("close", (code) => {
			if (code !== 0) {
				reject(/* @__PURE__ */ new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`));
				return;
			}
			try {
				const parsed = JSON.parse(stdout);
				const audioStream = parsed.streams?.find((stream) => typeof stream.channels === "number");
				if (!audioStream || typeof audioStream.channels !== "number") {
					reject(/* @__PURE__ */ new Error("No audio stream with channel information found in WAV file"));
					return;
				}
				resolve({
					channels: audioStream.channels,
					channelLayout: audioStream.channel_layout,
					sampleRate: audioStream.sample_rate ? Number(audioStream.sample_rate) : void 0,
					bitsPerSample: audioStream.bits_per_sample,
					durationSeconds: audioStream.duration ? Number(audioStream.duration) : parsed.format?.duration ? Number(parsed.format.duration) : void 0,
					codecName: audioStream.codec_name,
					streamTags: normalizeTags(audioStream.tags),
					formatTags: normalizeTags(parsed.format?.tags)
				});
			} catch (error) {
				reject(/* @__PURE__ */ new Error(`Could not parse ffprobe output: ${error.message}`));
			}
		});
	});
}
async function analyzeMxfWithFfprobe(mxfPath, ffprobePath) {
	return new Promise((resolve, reject) => {
		const child = spawn(ffprobePath, [
			"-v",
			"error",
			"-print_format",
			"json",
			"-show_streams",
			"-show_format",
			mxfPath
		], { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", (error) => {
			reject(/* @__PURE__ */ new Error(`Unable to start ffprobe: ${error.message}`));
		});
		child.on("close", (code) => {
			if (code !== 0) {
				reject(/* @__PURE__ */ new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`));
				return;
			}
			try {
				const parsed = JSON.parse(stdout);
				const streams = parsed.streams ?? [];
				const videoStream = streams.find((stream) => stream.codec_type === "video");
				const audioStreams = streams.filter((stream) => stream.codec_type === "audio");
				if (!videoStream) {
					reject(/* @__PURE__ */ new Error("No video stream found in MXF file"));
					return;
				}
				resolve({
					durationSeconds: parsed.format?.duration ? Number(parsed.format.duration) : void 0,
					videoCodecName: videoStream.codec_name,
					audioStreamCount: audioStreams.length,
					streamCount: streams.length,
					formatTags: normalizeTags(parsed.format?.tags)
				});
			} catch (error) {
				reject(/* @__PURE__ */ new Error(`Could not parse ffprobe output: ${error.message}`));
			}
		});
	});
}
//#endregion
//#region src/main/filePublisher.ts
async function ensureFinishedTempFile(tempFile) {
	const stats = await fs$1.stat(tempFile);
	if (!stats.isFile()) throw new Error(`Temp export is not a file: ${tempFile}`);
	if (stats.size <= 0) throw new Error(`Temp export is empty: ${tempFile}`);
}
async function resolvePublishTarget(preferredTarget) {
	const parsed = path.parse(preferredTarget);
	for (let attempt = 0; attempt < 1e3; attempt += 1) {
		const suffix = attempt === 0 ? "" : `__${String(attempt).padStart(3, "0")}`;
		const candidate = path.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
		try {
			await fs$1.access(candidate);
		} catch {
			return {
				path: candidate,
				conflictResolved: attempt > 0
			};
		}
	}
	throw new Error(`Could not resolve publish target after many conflicts: ${preferredTarget}`);
}
async function publishToWatchFolder(tempFile, watchFolder) {
	if (!watchFolder.trim()) throw new Error("Watchfolder is not configured.");
	await ensureFinishedTempFile(tempFile);
	await fs$1.mkdir(watchFolder, { recursive: true });
	const target = await resolvePublishTarget(path.join(watchFolder, path.basename(tempFile)));
	const stagingPath = path.join(watchFolder, `.${path.basename(target.path)}.${Date.now()}.eventpipe-copying`);
	let sourceMoved = false;
	try {
		try {
			await fs$1.rename(tempFile, stagingPath);
			sourceMoved = true;
		} catch (moveError) {
			if ((typeof moveError === "object" && moveError !== null && "code" in moveError ? String(moveError.code) : "") !== "EXDEV") throw moveError;
			await fs$1.copyFile(tempFile, stagingPath);
			await fs$1.rm(tempFile, { force: true });
			sourceMoved = true;
		}
		await fs$1.rename(stagingPath, target.path);
	} catch (error) {
		if (sourceMoved) try {
			await fs$1.rename(stagingPath, tempFile);
		} catch {
			await fs$1.rm(stagingPath, { force: true });
		}
		else await fs$1.rm(stagingPath, { force: true });
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Publishing to watchfolder failed: ${message}`);
	}
	return {
		publishedPath: target.path,
		conflictResolved: target.conflictResolved
	};
}
//#endregion
//#region src/main/ffmpegService.ts
function buildFfmpegArgs(mxfPath, wavPath, mapping, outputPath) {
	const filterChains = mapping.map((entry, index) => `[1:a]pan=mono|c0=c${entry.wavChannel - 1}[a${index}]`);
	const mappedMonoStreams = mapping.flatMap((_entry, index) => ["-map", `[a${index}]`]);
	return [
		"-i",
		mxfPath,
		"-i",
		wavPath,
		"-stats",
		"-map",
		"0:v",
		"-filter_complex",
		filterChains.join(";"),
		"-c:v",
		"copy",
		...mappedMonoStreams,
		"-c:a",
		"pcm_s24le",
		"-y",
		outputPath
	];
}
function applyNamingPreset(preset, sourceName) {
	return (preset.trim() || "{sourceName}").replaceAll("{sourceName}", sourceName);
}
function sanitizeFileNameSegment(value) {
	return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim() || "eventpipe-export";
}
function parseTimecodeToSeconds(timecode) {
	const [hh, mm, ss] = timecode.split(":");
	return Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
}
function parseProgress(rawLine, inputDurationSeconds) {
	const timeMatch = /time=([0-9:.]+)/.exec(rawLine);
	const speedMatch = /speed=\s*([0-9.]+x)/.exec(rawLine);
	if (!timeMatch && !speedMatch) return;
	const update = {
		timecode: timeMatch?.[1],
		speed: speedMatch?.[1]
	};
	if (timeMatch && typeof inputDurationSeconds === "number" && inputDurationSeconds > 0) {
		const seconds = parseTimecodeToSeconds(timeMatch[1]);
		update.percent = Math.max(0, Math.min(100, seconds / inputDurationSeconds * 100));
	}
	return update;
}
async function writeExportLog(sourceName, settings, content, status) {
	const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
	const logsDir = path.join(settings.tempExportFolder, "logs");
	await fs$1.mkdir(logsDir, { recursive: true });
	const fileName = `${timestamp}-${sanitizeFileNameSegment(sourceName)}-${status}.log`;
	const logPath = path.join(logsDir, fileName);
	await fs$1.writeFile(logPath, content, "utf-8");
	return logPath;
}
function runFfmpeg(command, args, inputDurationSeconds, onProgress) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { windowsHide: true });
		let output = "";
		let progressBuffer = "";
		child.stdout.on("data", (chunk) => {
			output += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			const text = chunk.toString();
			output += text;
			progressBuffer += text;
			const lines = progressBuffer.split(/\r|\n/);
			progressBuffer = lines.pop() ?? "";
			for (const line of lines) {
				const update = parseProgress(line, inputDurationSeconds);
				if (update && onProgress) onProgress(update);
			}
		});
		child.on("error", (error) => {
			reject(/* @__PURE__ */ new Error(`Failed to start ffmpeg: ${error.message}`));
		});
		child.on("close", (exitCode) => {
			if (exitCode === 0) {
				resolve(output.trim());
				return;
			}
			reject(new Error(`ffmpeg exited with code ${exitCode}.\n${output.trim()}`.trim()));
		});
	});
}
async function exportMxfWithMappedAudio(request, settings, onProgress) {
	const sourceName = path.parse(request.mxfPath).name;
	const targetName = request.customFileName ? `${sanitizeFileNameSegment(request.customFileName)}.mxf` : `${sanitizeFileNameSegment(applyNamingPreset(settings.namingPreset, sourceName))}.mxf`;
	await fs$1.mkdir(settings.tempExportFolder, { recursive: true });
	const outputPath = path.join(settings.tempExportFolder, targetName);
	const args = buildFfmpegArgs(request.mxfPath, request.wavPath, request.mapping, outputPath);
	const wavProbe = await analyzeWavWithFfprobe(request.wavPath, settings.ffprobePath);
	try {
		const log = await runFfmpeg(settings.ffmpegPath, args, wavProbe.durationSeconds, onProgress);
		const published = await publishToWatchFolder(outputPath, settings.watchFolder);
		const logPath = await writeExportLog(sourceName, settings, log, "success");
		return {
			outputPath: published.publishedPath,
			tempOutputPath: outputPath,
			publishedPath: published.publishedPath,
			publishConflictResolved: published.conflictResolved,
			command: settings.ffmpegPath,
			args,
			log,
			logPath
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const logPath = await writeExportLog(sourceName, settings, message, "error");
		throw new Error(`Export failed. Log: ${logPath}\n${message}`);
	}
}
//#endregion
//#region src/main/settingsService.ts
var CONFIG_FILE_NAME = "config.json";
function resolveBinaryPath(binaryName) {
	const executableName = process.platform === "win32" ? `${binaryName}.exe` : binaryName;
	const bundledCandidates = [
		path.join(process.resourcesPath, "bin", executableName),
		path.join(process.resourcesPath, "tools", executableName),
		path.join(process.cwd(), "resources", "bin", executableName)
	];
	for (const candidate of bundledCandidates) if (existsSync(candidate)) return candidate;
	if (process.platform === "darwin") for (const dir of ["/opt/homebrew/bin", "/usr/local/bin"]) {
		const candidate = path.join(dir, binaryName);
		if (existsSync(candidate)) return candidate;
	}
	return binaryName;
}
var DEFAULT_SETTINGS = {
	watchFolder: path.join(process.cwd(), "eventpipe-watchfolder"),
	tempExportFolder: path.join(process.cwd(), "eventpipe-temp"),
	ffmpegPath: resolveBinaryPath("ffmpeg"),
	ffprobePath: resolveBinaryPath("ffprobe"),
	namingPreset: "{sourceName}",
	maxDurationDeltaSeconds: .2,
	debugLoggingEnabled: false
};
function ensureText(value, fallback) {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}
function sanitizeSettings(raw) {
	const ffmpegPath = resolveBinaryPath("ffmpeg");
	const ffprobePath = resolveBinaryPath("ffprobe");
	return {
		watchFolder: ensureText(raw?.watchFolder, DEFAULT_SETTINGS.watchFolder),
		tempExportFolder: ensureText(raw?.tempExportFolder, DEFAULT_SETTINGS.tempExportFolder),
		ffmpegPath,
		ffprobePath,
		namingPreset: ensureText(raw?.namingPreset, DEFAULT_SETTINGS.namingPreset),
		maxDurationDeltaSeconds: DEFAULT_SETTINGS.maxDurationDeltaSeconds,
		debugLoggingEnabled: DEFAULT_SETTINGS.debugLoggingEnabled
	};
}
function getConfigPath() {
	if (process.env.EVENTPIPE_CONFIG_PATH?.trim()) return process.env.EVENTPIPE_CONFIG_PATH.trim();
	if (process.platform === "darwin") return path.join("/Users/Shared", "immo24-eventpipe", CONFIG_FILE_NAME);
	if (process.platform === "win32") {
		const programData = process.env.PROGRAMDATA?.trim() || path.join("C:", "ProgramData");
		return path.join(programData, "immo24-eventpipe", CONFIG_FILE_NAME);
	}
	return path.join("/var/lib", "immo24-eventpipe", CONFIG_FILE_NAME);
}
async function hasSettingsFile(configPath) {
	try {
		await fs$1.access(configPath);
		return true;
	} catch {
		return false;
	}
}
async function loadSettings(configPath) {
	try {
		const payload = await fs$1.readFile(configPath, "utf-8");
		return sanitizeSettings(JSON.parse(payload));
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}
async function saveSettings(configPath, raw) {
	const settings = sanitizeSettings(raw);
	await fs$1.mkdir(path.dirname(configPath), { recursive: true });
	await fs$1.writeFile(configPath, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
	return settings;
}
//#endregion
//#region src/main/registerIpcHandlers.ts
function createHistoryId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function isPathWithin(parentPath, candidatePath) {
	const relative = path.relative(parentPath, candidatePath);
	return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}
function registerIpcHandlers(options) {
	const { getActiveSettings, setActiveSettings, getActiveConfigPath, getActiveHistoryPath, openWorkflowWindow, workflowStartPayloadByWebContentsId, getDialogOwnerWindow, debugLog, withRuntimeDebugLogging, isTrustedRenderer } = options;
	function assertTrustedSender(event) {
		const frameUrl = event.senderFrame?.url ?? "";
		if (isTrustedRenderer(event.sender.id, frameUrl)) return;
		throw new Error("Untrusted renderer attempted to call privileged IPC handler.");
	}
	function guarded(handler) {
		return (event, ...args) => {
			assertTrustedSender(event);
			return handler(event, ...args);
		};
	}
	ipcMain.handle("eventpipe:get-settings", guarded(() => {
		return {
			settings: getActiveSettings(),
			configPath: getActiveConfigPath()
		};
	}));
	ipcMain.handle("eventpipe:open-workflow-window", guarded((_event, payload) => {
		openWorkflowWindow(payload);
		return true;
	}));
	ipcMain.handle("eventpipe:get-workflow-start-payload", guarded((event) => {
		const payload = workflowStartPayloadByWebContentsId.get(event.sender.id);
		workflowStartPayloadByWebContentsId.delete(event.sender.id);
		return payload;
	}));
	ipcMain.handle("eventpipe:get-export-history", guarded(async (_event, limit) => {
		const safeLimit = Math.max(1, Math.min(100, typeof limit === "number" ? Math.floor(limit) : 20));
		return readExportHistory(getActiveHistoryPath(), safeLimit);
	}));
	ipcMain.handle("eventpipe:pick-directory", guarded(async (_event, initialPath) => {
		const ownerWindow = getDialogOwnerWindow();
		const dialogOptions = {
			title: "Ordner auswählen",
			properties: [
				"openDirectory",
				"createDirectory",
				"promptToCreate"
			],
			defaultPath: initialPath?.trim() || void 0
		};
		const result = ownerWindow ? await dialog.showOpenDialog(ownerWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
		if (result.canceled || result.filePaths.length === 0) return;
		return result.filePaths[0];
	}));
	ipcMain.handle("eventpipe:open-path", guarded(async (_event, targetPath) => {
		if (!targetPath?.trim()) return false;
		const resolvedTargetPath = path.resolve(targetPath);
		if (!isPathWithin(path.resolve(getActiveSettings().tempExportFolder, "logs"), resolvedTargetPath)) return false;
		if (!resolvedTargetPath.toLowerCase().endsWith(".log")) return false;
		return (await shell.openPath(resolvedTargetPath)).length === 0;
	}));
	ipcMain.handle("eventpipe:save-settings", guarded(async (_event, input) => {
		const merged = {
			...getActiveSettings(),
			...input
		};
		const saved = await saveSettings(getActiveConfigPath(), merged);
		const runtimeSettings = withRuntimeDebugLogging(saved);
		setActiveSettings(runtimeSettings);
		debugLog("Settings saved", { configPath: getActiveConfigPath() });
		return {
			settings: runtimeSettings,
			configPath: getActiveConfigPath()
		};
	}));
	ipcMain.handle("eventpipe:analyze-mxf", guarded(async (_event, mxfPath) => {
		debugLog("Analyze MXF requested", { mxfPath });
		return { probe: await analyzeMxfWithFfprobe(mxfPath, getActiveSettings().ffprobePath) };
	}));
	ipcMain.handle("eventpipe:analyze-wav", guarded(async (_event, wavPath) => {
		debugLog("Analyze WAV requested", { wavPath });
		const probe = await analyzeWavWithFfprobe(wavPath, getActiveSettings().ffprobePath);
		const classification = classifyWav(probe);
		if (!isSupportedChannelCount(probe.channels)) throw new Error(`Unsupported channel count ${probe.channels}. Allowed: 2, 4, 6, 8.`);
		return {
			probe,
			classification,
			mapping: classification.type === "legacy-surround-track" ? buildLegacyMapping(probe.channels) : buildBounceMapping(probe.channels, classification.trackNames)
		};
	}));
	ipcMain.handle("eventpipe:export-job", guarded(async (event, request) => {
		if (!request.mxfPath || !request.wavPath || request.mapping.length === 0) throw new Error("Export request is incomplete.");
		debugLog("Export requested", {
			mxfPath: request.mxfPath,
			wavPath: request.wavPath,
			mappingEntries: request.mapping.length
		});
		event.sender.send("eventpipe:export-progress", { percent: 0 });
		try {
			const result = await exportMxfWithMappedAudio(request, getActiveSettings(), (update) => {
				event.sender.send("eventpipe:export-progress", update);
			});
			const successEntry = {
				id: createHistoryId(),
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				status: "success",
				mxfPath: request.mxfPath,
				wavPath: request.wavPath,
				outputPath: result.outputPath,
				tempOutputPath: result.tempOutputPath,
				publishedPath: result.publishedPath,
				publishConflictResolved: result.publishConflictResolved,
				logPath: result.logPath,
				detectedWavType: request.metadata?.detectedWavType,
				selectedWavType: request.metadata?.selectedWavType,
				manualSelectionApplied: request.metadata?.manualSelectionApplied,
				classificationReason: request.metadata?.classificationReason,
				mappingCount: request.mapping.length
			};
			await appendExportHistory(getActiveHistoryPath(), successEntry);
			event.sender.send("eventpipe:export-progress", { percent: 100 });
			return result;
		} catch (exportError) {
			const message = exportError instanceof Error ? exportError.message : String(exportError);
			const logPathMatch = message.match(/Export failed\. Log: (.+)\n/);
			const errorEntry = {
				id: createHistoryId(),
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				status: "error",
				mxfPath: request.mxfPath,
				wavPath: request.wavPath,
				logPath: logPathMatch?.[1]?.trim(),
				errorMessage: message,
				detectedWavType: request.metadata?.detectedWavType,
				selectedWavType: request.metadata?.selectedWavType,
				manualSelectionApplied: request.metadata?.manualSelectionApplied,
				classificationReason: request.metadata?.classificationReason,
				mappingCount: request.mapping.length
			};
			await appendExportHistory(getActiveHistoryPath(), errorEntry);
			throw exportError;
		}
	}));
}
//#endregion
//#region src/main/index.ts
var mainWindow = null;
var splashWindow = null;
var settingsWindow = null;
var workflowWindow = null;
var workflowStartPayloadByWebContentsId = /* @__PURE__ */ new Map();
var splashShownAt = 0;
var activeSettings = { ...DEFAULT_SETTINGS };
var activeConfigPath = "";
var activeHistoryPath = "";
var shouldOpenSettingsOnStartup = false;
var cliDebugLoggingEnabled = process.argv.includes("--debug-logging") || [
	"1",
	"true",
	"yes",
	"on"
].includes((process.env.EVENTPIPE_DEBUG_LOGGING || "").toLowerCase());
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
if (!app.requestSingleInstanceLock()) app.quit();
function getDevServerOrigin() {
	if (!process.env.VITE_DEV_SERVER_URL) return;
	try {
		return new URL(process.env.VITE_DEV_SERVER_URL).origin;
	} catch {
		return;
	}
}
function attachNavigationGuards(window, isAllowedUrl) {
	window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
	window.webContents.on("will-navigate", (event, navigationUrl) => {
		if (isAllowedUrl(navigationUrl)) return;
		event.preventDefault();
	});
}
function withRuntimeDebugLogging(settings) {
	return {
		...settings,
		debugLoggingEnabled: cliDebugLoggingEnabled
	};
}
function debugLog(message, context) {
	if (!activeSettings.debugLoggingEnabled) return;
	writeLog({
		level: "info",
		message,
		context
	});
}
function resolveSplashIconDataUrl() {
	const appPath = app.getAppPath();
	const candidates = [path.resolve(appPath, "src/assets/icon.png"), path.resolve(appPath, "dist/assets/icon.png")];
	for (const filePath of candidates) {
		if (!fs.existsSync(filePath)) continue;
		return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
	}
	return "";
}
function createSplashWindow() {
	splashWindow = new BrowserWindow({
		width: 420,
		height: 250,
		frame: false,
		transparent: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreenable: false,
		alwaysOnTop: true,
		movable: true,
		show: false,
		webPreferences: {
			contextIsolation: true,
			sandbox: true
		}
	});
	attachNavigationGuards(splashWindow, (url) => url.startsWith("data:text/html"));
	const resolvedSplashHtml = splash_default$1.replace("__SPLASH_STYLE__", splash_default).replace("__SPLASH_ICON_SRC__", resolveSplashIconDataUrl()).replace("__APP_VERSION__", app.getVersion());
	splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(resolvedSplashHtml)}`);
	splashWindow.once("ready-to-show", () => {
		splashShownAt = Date.now();
		splashWindow?.show();
	});
}
function openSettingsWindow() {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		settingsWindow.focus();
		return;
	}
	const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : void 0;
	settingsWindow = new BrowserWindow({
		width: 780,
		height: 400,
		minWidth: 780,
		minHeight: 400,
		resizable: true,
		title: "Konfiguration",
		parent,
		modal: Boolean(parent),
		show: false,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	attachNavigationGuards(settingsWindow, (url) => url.startsWith("data:text/html"));
	settingsWindow.setMenu(null);
	const resolvedSettingsHtml = settings_default$2.replace("__SETTINGS_STYLE__", settings_default).replace("__SETTINGS_SCRIPT__", settings_default$1);
	settingsWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(resolvedSettingsHtml)}`);
	settingsWindow.once("ready-to-show", () => {
		settingsWindow?.show();
	});
	settingsWindow.on("closed", () => {
		settingsWindow = null;
	});
}
function openWorkflowWindow(payload) {
	const existingWorkflowWindow = workflowWindow;
	if (existingWorkflowWindow && !existingWorkflowWindow.isDestroyed() && !existingWorkflowWindow.webContents.isDestroyed()) {
		if (payload) workflowStartPayloadByWebContentsId.set(existingWorkflowWindow.webContents.id, payload);
		existingWorkflowWindow.focus();
		return;
	}
	const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : void 0;
	workflowWindow = new BrowserWindow({
		width: 900,
		height: 650,
		minWidth: 780,
		minHeight: 560,
		resizable: true,
		title: "Exportdialog",
		parent,
		modal: Boolean(parent),
		show: false,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	const devOrigin = getDevServerOrigin();
	attachNavigationGuards(workflowWindow, (url) => {
		if (devOrigin) return url.startsWith(devOrigin);
		return url.startsWith("file://");
	});
	if (payload) workflowStartPayloadByWebContentsId.set(workflowWindow.webContents.id, payload);
	const workflowWebContentsId = workflowWindow.webContents.id;
	workflowWindow.setMenu(null);
	if (process.env.VITE_DEV_SERVER_URL) {
		const dialogUrl = new URL(process.env.VITE_DEV_SERVER_URL);
		dialogUrl.searchParams.set("window", "workflow");
		workflowWindow.loadURL(dialogUrl.toString());
	} else workflowWindow.loadFile(path.join(__dirname, "../index.html"), { query: { window: "workflow" } });
	workflowWindow.once("ready-to-show", () => {
		workflowWindow?.show();
	});
	workflowWindow.on("closed", () => {
		workflowStartPayloadByWebContentsId.delete(workflowWebContentsId);
		workflowWindow = null;
	});
}
async function ensureMinimumSplashDuration(minimumMs = 2e3) {
	if (splashShownAt === 0) return;
	const remaining = minimumMs - (Date.now() - splashShownAt);
	if (remaining <= 0) return;
	await new Promise((resolve) => setTimeout(resolve, remaining));
}
function createApplicationMenu() {
	const isMac = process.platform === "darwin";
	const isDevMode = Boolean(process.env.VITE_DEV_SERVER_URL);
	const template = [
		...isMac ? [{
			label: app.name,
			submenu: [
				{ role: "about" },
				{ type: "separator" },
				{
					label: "Konfiguration",
					accelerator: "CommandOrControl+,",
					click: openSettingsWindow
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
					click: openSettingsWindow
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
				...isMac ? [
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
		...isDevMode ? [{
			label: "Entwickler",
			submenu: [
				{ role: "toggleDevTools" },
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleFullScreen" }
			]
		}] : []
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 320,
		height: 320,
		useContentSize: true,
		resizable: false,
		maximizable: false,
		fullscreenable: false,
		show: false,
		backgroundColor: "#f5f5f7",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	const devOrigin = getDevServerOrigin();
	attachNavigationGuards(mainWindow, (url) => {
		if (devOrigin) return url.startsWith(devOrigin);
		return url.startsWith("file://");
	});
	if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else mainWindow.loadFile(path.join(__dirname, "../index.html"));
	mainWindow.webContents.once("did-finish-load", async () => {
		await ensureMinimumSplashDuration(2e3);
		splashWindow?.close();
		splashWindow = null;
		mainWindow?.show();
		if (shouldOpenSettingsOnStartup) {
			openSettingsWindow();
			shouldOpenSettingsOnStartup = false;
		}
	});
}
app.whenReady().then(() => {
	app.setName("immo24 EventPipe");
	activeConfigPath = getConfigPath();
	activeHistoryPath = getExportHistoryPath(activeConfigPath);
	return hasSettingsFile(activeConfigPath).then(async (hasConfigFile) => {
		shouldOpenSettingsOnStartup = !hasConfigFile;
		activeSettings = withRuntimeDebugLogging(hasConfigFile ? await loadSettings(activeConfigPath) : { ...DEFAULT_SETTINGS });
		createSplashWindow();
		createApplicationMenu();
		registerIpcHandlers({
			getActiveSettings: () => activeSettings,
			setActiveSettings: (settings) => {
				activeSettings = settings;
			},
			getActiveConfigPath: () => activeConfigPath,
			getActiveHistoryPath: () => activeHistoryPath,
			openWorkflowWindow,
			workflowStartPayloadByWebContentsId,
			getDialogOwnerWindow: () => settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : mainWindow ?? void 0,
			debugLog,
			withRuntimeDebugLogging,
			isTrustedRenderer: (webContentsId, frameUrl) => {
				if (![
					mainWindow?.webContents.id,
					workflowWindow?.webContents.id,
					settingsWindow?.webContents.id
				].filter((id) => typeof id === "number").includes(webContentsId)) return false;
				const devOrigin = getDevServerOrigin();
				if (devOrigin && frameUrl.startsWith(devOrigin)) return true;
				if (frameUrl.startsWith("file://") || frameUrl.startsWith("data:text/html")) return true;
				return false;
			}
		});
		createMainWindow();
		app.on("second-instance", () => {
			if (mainWindow) {
				if (mainWindow.isMinimized()) mainWindow.restore();
				mainWindow.focus();
				return;
			}
			createMainWindow();
		});
		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
		});
	});
});
app.on("window-all-closed", () => {
	app.quit();
});
//#endregion
