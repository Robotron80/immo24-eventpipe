const watchFolderInput = document.getElementById('watchFolder')
const tempExportFolderInput = document.getElementById('tempExportFolder')
const browseWatchFolderButton = document.getElementById('browseWatchFolder')
const browseTempFolderButton = document.getElementById('browseTempFolder')
const saveButton = document.getElementById('saveButton')
const cancelButton = document.getElementById('cancelButton')

function readFormSettings() {
  return {
    watchFolder: watchFolderInput.value,
    tempExportFolder: tempExportFolderInput.value,
  }
}

function applyFormSettings(settings) {
  watchFolderInput.value = settings.watchFolder ?? ''
  tempExportFolderInput.value = settings.tempExportFolder ?? ''
}

async function browseInto(inputElement) {
  try {
    const selectedPath = await window.eventPipe.pickDirectory(inputElement.value)
    if (selectedPath) {
      inputElement.value = selectedPath
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Ordnerauswahl fehlgeschlagen.')
  }
}

async function loadSettings() {
  try {
    const snapshot = await window.eventPipe.getSettings()
    applyFormSettings(snapshot.settings)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht geladen werden.')
  }
}

async function saveSettings() {
  saveButton.disabled = true
  let shouldClose = false

  try {
    const snapshot = await window.eventPipe.saveSettings(readFormSettings())
    applyFormSettings(snapshot.settings)
    shouldClose = true
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Konfiguration konnte nicht gespeichert werden.')
  } finally {
    if (shouldClose) {
      queueMicrotask(() => window.close())
      return
    }

    saveButton.disabled = false
  }
}

saveButton.addEventListener('click', () => {
  void saveSettings()
})

cancelButton.addEventListener('click', () => {
  window.close()
})

browseWatchFolderButton.addEventListener('click', () => {
  void browseInto(watchFolderInput)
})

browseTempFolderButton.addEventListener('click', () => {
  void browseInto(tempExportFolderInput)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    window.close()
    return
  }

  if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
    event.preventDefault()
    void saveSettings()
  }
})

watchFolderInput.focus()

void loadSettings()
