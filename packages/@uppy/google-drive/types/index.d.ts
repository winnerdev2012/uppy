import type { PluginOptions, UIPlugin, PluginTarget } from '@uppy/core'
import type { PublicProviderOptions, TokenStorage } from '@uppy/companion-client'

  interface GoogleDriveOptions extends PluginOptions, PublicProviderOptions {
    replaceTargetContent?: boolean
    target?: PluginTarget
    title?: string
    storage?: TokenStorage
}

declare class GoogleDrive extends UIPlugin<GoogleDriveOptions> {}

export default GoogleDrive
