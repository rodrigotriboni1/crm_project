import type { Theme } from '@glideapps/glide-data-grid'
import { getDefaultTheme } from '@glideapps/glide-data-grid'

/** Tema escuro para o DataEditor (alinhado ao CRM em `.dark`). */
export function getGlideGridDarkTheme(): Theme {
  const base = getDefaultTheme()
  return {
    ...base,
    textDark: '#eae9e4',
    textMedium: '#a8a6a0',
    textLight: '#6f6d68',
    bgCell: '#1a1a19',
    bgCellMedium: '#1f1f1e',
    bgHeader: '#222221',
    bgHeaderHasFocus: '#2a2a28',
    bgHeaderHovered: '#2a2a28',
    borderColor: '#3f3e3b',
    horizontalBorderColor: '#3f3e3b',
    drilldownBorder: '#3f3e3b',
    linkColor: '#8ab4e0',
    bgSearchResult: '#2a2a28',
    bgIconHeader: '#1a1a19',
    fgIconHeader: '#eae9e4',
    bgBubble: '#2e2e2c',
    bgBubbleSelected: '#3a3a37',
  }
}
