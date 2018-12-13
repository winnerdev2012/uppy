import { Plugin, PluginOptions, Uppy, UppyFile } from '@uppy/core';

declare module AwsS3 {
  interface AwsS3UploadParameters {
    method?: string;
    url: string;
    fields?: { [type: string]: string };
    headers?: { [type: string]: string };
  }

  interface AwsS3Options extends PluginOptions {
    serverUrl: string;
    getUploadParameters(file: UppyFile): Promise<AwsS3UploadParameters>;
    timeout: number;
    limit: number;
  }
}

declare class AwsS3 extends Plugin {
  constructor(uppy: Uppy, opts: Partial<AwsS3.AwsS3Options>);
}

export = AwsS3;

declare module '@uppy/core' {
  export interface Uppy {
    use(pluginClass: typeof AwsS3, opts: Partial<AwsS3.AwsS3Options>): Uppy;
  }
}
