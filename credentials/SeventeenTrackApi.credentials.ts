import {
	type IAuthenticateGeneric,
	type Icon,
	type ICredentialTestRequest,
	type ICredentialType,
	type INodeProperties,
} from 'n8n-workflow';

export class SeventeenTrackApi implements ICredentialType {
	icon: Icon = 'file:seventeenTrack.svg';

	name = 'seventeenTrackApi';

	displayName = '17TRACK API';

	documentationUrl = 'https://docs.17track.net';

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.17track.net',
			url: '/track/v2.4/getquota',
			method: 'POST',
		},
	};

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

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        '17token': '={{$credentials.apiKey}}',
      },
    },
  };
}
