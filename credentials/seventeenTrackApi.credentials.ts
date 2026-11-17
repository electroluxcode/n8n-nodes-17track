import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SeventeenTrackApi implements ICredentialType {
  name = 'seventeenTrackApi';

  displayName = '17TRACK API';

  documentationUrl = 'https://docs.17track.net';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        '17TRACK API key sent in the 17token header. Get or change the key in 17TRACK API Settings: https://api.17track.net/admin/settings',
    },
  ];

  authenticate = {
    type: 'generic' as const,
    properties: {
      type: 'headers' as const,
      properties: {
        name: '17token',
        value: '={{$credentials.apiKey}}',
      },
    },
  };
}
