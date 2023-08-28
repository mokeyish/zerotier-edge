
import type { components } from './zerotier-api';

export type Network = components['schemas']['Network'] & {
  ui?: {
    membersHelpCollapsed?: boolean,
    rulesHelpCollapsed?: boolean,
    settingsHelpCollapsed?: boolean,
    v4EasyMode?: boolean
  }
}

export type Member = components['schemas']['Member'] & {
  active: boolean
}


export type Status = components['schemas']['Status'] & {
  clock: number,
  address?: string,
  config?: {
    settings?: {
      surfaceAddresses?: string[]
    }
  },
  online?: boolean
}
