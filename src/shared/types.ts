export type SupportedChannelCount = 2 | 4 | 6 | 8

export type WavType = 'bounce-polywav' | 'legacy-surround-print' | 'unknown'

export interface AudioMappingEntry {
  mxfTrack: number
  wavChannel: number
  name?: string
}

export interface WavProbeData {
  channels: number
  channelLayout?: string
  sampleRate?: number
  bitsPerSample?: number
  durationSeconds?: number
  codecName?: string
  streamTags?: Record<string, string>
  formatTags?: Record<string, string>
}

export interface MxfProbeData {
  durationSeconds?: number
  videoCodecName?: string
  audioStreamCount: number
  streamCount: number
  formatTags?: Record<string, string>
}

export interface WavClassificationResult {
  type: WavType
  trackNames: string[]
  reason: string
}

export interface EventPipeJob {
  id: string
  projectName?: string
  projectPath?: string
  mxfPath?: string
  wavPath?: string
  aafPath?: string
  bounceFolder?: string
  tempExportFolder: string
  watchFolder: string
  namingPreset: string
  detectedWavType?: WavType
  channelCount?: SupportedChannelCount
  mapping?: AudioMappingEntry[]
}

export interface EventPipeSettings {
  watchFolder: string
  tempExportFolder: string
  ffmpegPath: string
  ffprobePath: string
  namingPreset: string
  maxDurationDeltaSeconds: number
  debugLoggingEnabled: boolean
}

export interface SettingsSnapshot {
  settings: EventPipeSettings
  configPath: string
}

export interface AnalyzeWavResult {
  probe: WavProbeData
  classification: WavClassificationResult
  mapping: AudioMappingEntry[]
}

export interface AnalyzeMxfResult {
  probe: MxfProbeData
}

export interface ExportJobRequest {
  mxfPath: string
  wavPath: string
  mapping: AudioMappingEntry[]
  customFileName?: string
  metadata?: {
    detectedWavType?: WavType
    selectedWavType?: WavType
    manualSelectionApplied?: boolean
    classificationReason?: string
  }
}

export interface ExportJobResult {
  outputPath: string
  tempOutputPath: string
  publishedPath: string
  publishConflictResolved: boolean
  command: string
  args: string[]
  log: string
  logPath: string
}

export interface ExportProgressUpdate {
  percent?: number
  timecode?: string
  speed?: string
}

export interface ExportHistoryEntry {
  id: string
  timestamp: string
  status: 'success' | 'error'
  mxfPath: string
  wavPath: string
  outputPath?: string
  tempOutputPath?: string
  publishedPath?: string
  publishConflictResolved?: boolean
  logPath?: string
  errorMessage?: string
  detectedWavType?: WavType
  selectedWavType?: WavType
  manualSelectionApplied?: boolean
  classificationReason?: string
  mappingCount: number
}
