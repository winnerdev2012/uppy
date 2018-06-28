import { Plugin, PluginOptions, Uppy } from '@uppy/core';

export interface GoogleDriveOptions extends PluginOptions {
  serverUrl: string;
  // TODO inherit from ProviderOptions
}

export default class GoogleDrive extends Plugin {
  constructor(uppy: Uppy, opts: Partial<GoogleDriveOptions>);
}

declare module '@uppy/core' {
  export interface Uppy {
    use(pluginClass: typeof GoogleDrive, opts: Partial<GoogleDriveOptions>): Uppy;
  }
}
