import { computed, ref } from 'vue'

import type { UseWorkflowStateOptions } from './types'

export function useWorkflowState(options: UseWorkflowStateOptions) {
  const { allChecksOk, canExport } = options

  const showChecksDialog = ref(false)
  const dialogStep = ref<'checks' | 'mapping'>('checks')

  const canContinue = computed(() => {
    return canExport.value
  })

  const dialogTitle = computed(() => {
    return dialogStep.value === 'checks' ? 'Dateiüberprüfung' : 'Kanal-Mapping'
  })

  const dialogDescription = computed(() => {
    return dialogStep.value === 'checks' ? 'Bei der Prüfung der Dateien wurden Probleme festgestellt' : ''
  })

  function openWorkflowChecks(): void {
    dialogStep.value = allChecksOk.value ? 'mapping' : 'checks'
    showChecksDialog.value = true
  }

  function continueWorkflowStep(): boolean {
    if (dialogStep.value === 'checks') {
      if (!canContinue.value) {
        return false
      }

      dialogStep.value = 'mapping'
      return false
    }

    return true
  }

  function resetWorkflowState(): void {
    showChecksDialog.value = false
    dialogStep.value = 'checks'
  }

  return {
    canContinue,
    continueWorkflowStep,
    dialogDescription,
    dialogStep,
    dialogTitle,
    openWorkflowChecks,
    resetWorkflowState,
    showChecksDialog,
  }
}
