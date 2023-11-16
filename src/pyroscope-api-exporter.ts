import { URL } from 'node:url'

import { encode } from '@datadog/pprof'
import axios, { AxiosError } from 'axios'
import FormData, { Headers } from 'form-data'
import { Profile } from 'pprof-format'
import { ProfileExport, ProfileExporter } from './profile-exporter'
import { dateToUnixTimestamp } from './utils/date-to-unix-timestamp'
import { processProfile } from './utils/process-profile'
import debug from 'debug'

const log = debug('pyroscope')

export class PyroscopeApiExporter implements ProfileExporter {
  private readonly applicationName: string
  private readonly authToken: string | undefined
  private readonly serverAddress: string

  constructor(
    applicationName: string,
    authToken: string | undefined,
    serverAddress: string
  ) {
    this.applicationName = applicationName
    this.authToken = authToken
    this.serverAddress = serverAddress
  }

  public async export(profileExport: ProfileExport): Promise<void> {
    await this.uploadProfile(profileExport)
  }

  private buildEndpointUrl(profileExport: ProfileExport): URL {
    const endpointUrl: URL = new URL(`${this.serverAddress}/ingest`)

    endpointUrl.searchParams.append(
      'from',
      dateToUnixTimestamp(profileExport.startedAt).toString()
    )
    endpointUrl.searchParams.append('name', this.applicationName)
    endpointUrl.searchParams.append('spyName', 'nodespy')
    endpointUrl.searchParams.append(
      'until',
      dateToUnixTimestamp(profileExport.stoppedAt).toString()
    )

    if (profileExport.sampleRate !== undefined) {
      endpointUrl.searchParams.append(
        'sampleRate',
        profileExport.sampleRate.toString()
      )
    }

    return endpointUrl
  }

  private buildRequestHeaders(formData: FormData): Headers {
    const headers: Headers = formData.getHeaders()

    if (this.authToken !== undefined) {
      headers['authorization'] = `Bearer ${this.authToken}`
    }

    return headers
  }

  private async buildUploadProfileFormData(
    profile: Profile
  ): Promise<FormData> {
    const processedProfile: Profile = processProfile(profile)

    const profileBuffer: Buffer = await encode(processedProfile)

    const formData: FormData = new FormData()

    formData.append('profile', profileBuffer, {
      contentType: 'text/json',
      filename: 'profile',
      knownLength: profileBuffer.byteLength,
    })

    return formData
  }

  private handleAxiosError(error: AxiosError): void {
    if (error.response !== undefined) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      log('Pyroscope received error while ingesting data to server')
      log(error.response.data)
    } else if (error.request !== undefined) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      log('Error when ingesting data to server:', error.message)
    } else {
      // Something happened in setting up the request that triggered an Error
      log('Error', error.message)
    }
  }

  private async uploadProfile(profileExport: ProfileExport): Promise<void> {
    const formData: FormData = await this.buildUploadProfileFormData(
      profileExport.profile
    )

    try {
      await axios(this.buildEndpointUrl(profileExport).toString(), {
        data: formData,
        headers: this.buildRequestHeaders(formData),
        method: 'POST',
      })
    } catch (error: unknown) {
      this.handleAxiosError(error as AxiosError)
    }
  }
}
