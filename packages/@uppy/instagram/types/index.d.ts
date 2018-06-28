import { Plugin, PluginOptions, Uppy } from '@uppy/core';

export interface InstagramOptions extends PluginOptions {
  serverUrl: string;
  // TODO inherit from ProviderOptions
}

export default class Instagram extends Plugin {
  constructor(uppy: Uppy, opts: Partial<InstagramOptions>);
}

declare module '@uppy/core' {
  export interface Uppy {
    use(pluginClass: typeof Instagram, opts: Partial<InstagramOptions>): Uppy;
  }
}
