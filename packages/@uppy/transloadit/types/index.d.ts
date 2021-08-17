import type { PluginOptions, UppyFile, BasePlugin } from '@uppy/core'
import TransloaditLocale from './generatedLocale'

export interface FileInfo {
    id: string,
    name: string,
    basename: string,
    ext: string,
    size: number,
    mime: string,
    type: string,
    field: string,
    md5hash: string,
    is_tus_file: boolean,
    original_md5hash: string,
    original_id: string,
    original_name: string
    original_basename: string,
    original_path: string,
    url: string,
    ssl_url: string,
    tus_upload_url: string,
    meta: Record<string, any>
  }

export interface Result extends FileInfo {
    cost: number,
    execTime: number,
    queue: string,
    queueTime: number,
    localId: string | null
  }

export interface Assembly {
    ok?: string,
    message?: string,
    assembly_id: string,
    parent_id?: string,
    account_id: string,
    template_id?: string,
    instance: string,
    assembly_url: string,
    assembly_ssl_url: string,
    uppyserver_url: string,
    companion_url: string,
    websocket_url: string,
    tus_url: string,
    bytes_received: number,
    bytes_expected: number,
    upload_duration: number,
    client_agent?: string,
    client_ip?: string,
    client_referer?: string,
    transloadit_client: string,
    start_date: string,
    upload_meta_data_extracted: boolean,
    warnings: any[],
    is_infinite: boolean,
    has_dupe_jobs: boolean,
    execution_start: string,
    execution_duration: number,
    queue_duration: number,
    jobs_queue_duration: number,
    notify_start?: any,
    notify_url?: string,
    notify_status?: any,
    notify_response_code?: any,
    notify_duration?: any,
    last_job_completed?: string,
    fields: Record<string, any>,
    running_jobs: any[],
    bytes_usage: number,
    executing_jobs: any[],
    started_jobs: string[],
    parent_assembly_status: any,
    params: string,
    template?: any,
    merged_params: string,
    uploads: FileInfo[],
    results: Record<string, Result[]>,
    build_id: string,
    error?: string,
    stderr?: string,
    stdout?: string,
    reason?: string,
  }

  interface AssemblyParameters {
    auth: {
      key: string,
      expires?: string
    }
    template_id?: string
    steps?: { [step: string]: Record<string, unknown> }
    notify_url?: string
    fields?: { [name: string]: number | string }
  }

interface AssemblyOptions {
    params: AssemblyParameters
    fields?: { [name: string]: number | string }
    signature?: string
  }

interface TransloaditOptionsBase extends PluginOptions {
    service?: string
    errorReporting?: boolean
    waitForEncoding?: boolean
    waitForMetadata?: boolean
    importFromUploadURLs?: boolean
    alwaysRunAssembly?: boolean
    locale?: TransloaditLocale
    limit?: number
}

// Either have a getAssemblyOptions() that returns an AssemblyOptions, *or* have them embedded in the options
export type TransloaditOptions = TransloaditOptionsBase &
    (
      | {
          getAssemblyOptions?: (file: UppyFile) => AssemblyOptions | Promise<AssemblyOptions>
        }
      | AssemblyOptions)

declare class Transloadit extends BasePlugin<TransloaditOptions> {
  static COMPANION: string

  static COMPANION_PATTERN: RegExp
}

export default Transloadit

// Events

export type TransloaditAssemblyCreatedCallback = (assembly: Assembly, fileIDs: string[]) => void;
export type TransloaditUploadedCallback = (file: FileInfo, assembly: Assembly) => void;
export type TransloaditAssemblyExecutingCallback = (assembly: Assembly) => void;
export type TransloaditResultCallback = (stepName: string, result: Result, assembly: Assembly) => void;
export type TransloaditCompleteCallback = (assembly: Assembly) => void;

declare module '@uppy/core' {
  export interface UppyEventMap {
    'transloadit:assembly-created': TransloaditAssemblyCreatedCallback
    'transloadit:upload': TransloaditUploadedCallback
    'transloadit:assembly-executing': TransloaditAssemblyExecutingCallback
    'transloadit:result': TransloaditResultCallback
    'transloadit:complete': TransloaditCompleteCallback
  }
}
