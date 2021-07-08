import type { PluginOptions, UIPlugin, PluginTarget } from '@uppy/core'
import DragDropLocale from './generatedLocale'

declare module DragDrop {
  interface DragDropOptions extends PluginOptions {
    replaceTargetContent?: boolean
    target?: PluginTarget
    inputName?: string
    allowMultipleFiles?: boolean
    width?: string | number
    height?: string | number
    note?: string
    locale?: DragDropLocale
    onDragOver?: (event: MouseEvent) => void
    onDragLeave?: (event: MouseEvent) => void
    onDrop?: (event: MouseEvent) => void
  }
}

declare class DragDrop extends UIPlugin<DragDrop.DragDropOptions> {}

export default DragDrop
