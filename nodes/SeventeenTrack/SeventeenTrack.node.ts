import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

// Only a single production default; e2e sandbox overrides via SEVENTEEN_TRACK_API_BASE env.
const API_BASE = process.env.SEVENTEEN_TRACK_API_BASE ?? 'https://api.17track.net/track/v2.4';

const parseNumbers = (raw: string): string[] =>
  raw
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z0-9-]{5,50}$/.test(item));

export class SeventeenTrack implements INodeType {
  description: INodeTypeDescription = {
    displayName: '17TRACK',
    name: 'seventeenTrack',
    icon: 'file:seventeenTrack.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Cross-border e-commerce order tracking for 3500+ carriers',
    defaults: { name: '17TRACK' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'seventeenTrackApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Register Trackings',
            value: 'register_trackings',
            description: 'Register up to 40 tracking numbers for automatic tracking by 17TRACK',
            action: 'Register trackings',
          },
          {
            name: 'Get Tracking Details',
            value: 'get_tracking_details',
            description: 'Get current tracking details for up to 40 registered tracking numbers',
            action: 'Get tracking details',
          },
          {
            name: 'List Trackings',
            value: 'list_trackings',
            description: 'List registered shipments with status and pagination filters',
            action: 'List trackings',
          },
          {
            name: 'Get Quota',
            value: 'get_quota',
            description: 'Get the current tracking and email quota counters',
            action: 'Get quota',
          },
          {
            name: 'Stop Trackings',
            value: 'stop_trackings',
            description: 'Stop automatic tracking for up to 40 registered tracking numbers',
            action: 'Stop trackings',
          },
          {
            name: 'Restart Trackings',
            value: 'restart_trackings',
            description: 'Restart automatic tracking for up to 40 stopped tracking numbers',
            action: 'Restart trackings',
          },
          {
            name: 'Delete Trackings',
            value: 'delete_trackings',
            description: 'Permanently delete up to 40 registered tracking numbers',
            action: 'Delete trackings',
          },
          {
            name: 'Push Trackings',
            value: 'push_trackings',
            description: 'Queue a webhook push of the latest tracking results',
            action: 'Push trackings',
          },
          {
            name: 'Change Carrier',
            value: 'change_carrier',
            description: 'Change the carrier of registered tracking numbers',
            action: 'Change carrier',
          },
          {
            name: 'Update Tracking Info',
            value: 'update_tracking_info',
            description: 'Update the metadata of registered tracking numbers',
            action: 'Update tracking info',
          },
          {
            name: 'Get Realtime Tracking Details',
            value: 'get_realtime_tracking_details',
            description: 'Query a single tracking number against carriers in real time',
            action: 'Get realtime tracking details',
          },
        ],
        default: 'get_tracking_details',
      },
      {
        displayName: 'Tracking Numbers',
        name: 'numbers',
        type: 'string',
        typeOptions: { rows: 3 },
        displayOptions: {
          show: {
            operation: [
              'register_trackings',
              'get_tracking_details',
              'stop_trackings',
              'restart_trackings',
              'delete_trackings',
              'push_trackings',
              'change_carrier',
              'update_tracking_info',
            ],
          },
        },
        default: '',
        required: true,
        description: 'Tracking numbers, comma or newline separated (max 40)',
      },
      {
        displayName: 'Auto Detection',
        name: 'autoDetection',
        type: 'boolean',
        displayOptions: { show: { operation: ['register_trackings'] } },
        default: true,
        description: 'Whether 17TRACK should auto-detect the carrier',
      },
      {
        displayName: 'Old Carrier Code',
        name: 'carrierOld',
        type: 'number',
        displayOptions: { show: { operation: ['change_carrier'] } },
        default: 0,
        description: 'Current numeric 17TRACK carrier code',
      },
      {
        displayName: 'New Carrier Code',
        name: 'carrierNew',
        type: 'number',
        displayOptions: { show: { operation: ['change_carrier'] } },
        default: 0,
        required: true,
        description: 'New numeric 17TRACK carrier code',
      },
      {
        displayName: 'Tag',
        name: 'tag',
        type: 'string',
        displayOptions: { show: { operation: ['update_tracking_info', 'register_trackings'] } },
        default: '',
        description: 'A custom tag attached to the tracking numbers',
      },
      {
        displayName: 'Remark',
        name: 'remark',
        type: 'string',
        typeOptions: { rows: 2 },
        displayOptions: { show: { operation: ['update_tracking_info', 'register_trackings'] } },
        default: '',
        description: 'A note describing the packages (max 1000 chars)',
      },
      {
        displayName: 'Realtime Number',
        name: 'realtimeNumber',
        type: 'string',
        displayOptions: { show: { operation: ['get_realtime_tracking_details'] } },
        default: '',
        required: true,
        description: 'The single tracking number to query in real time',
      },
      {
        displayName: 'Cache Level',
        name: 'cacheLevel',
        type: 'options',
        displayOptions: { show: { operation: ['get_realtime_tracking_details'] } },
        options: [
          { name: 'Standard (cacheLevel 0, 1 quota)', value: 0 },
          { name: 'Instant (cacheLevel 1, 10 quota)', value: 1 },
        ],
        default: 0,
        description: 'Standard returns data cached within the last 3 hours; Instant fetches immediately',
      },
      {
        displayName: 'Page Number',
        name: 'pageNo',
        type: 'number',
        displayOptions: { show: { operation: ['list_trackings'] } },
        default: 0,
        description: 'The result page number, starting from 0',
      },
      {
        displayName: 'Package Status',
        name: 'packageStatus',
        type: 'options',
        displayOptions: { show: { operation: ['list_trackings'] } },
        options: [
          { name: 'Not Found', value: 'NotFound' },
          { name: 'Info Received', value: 'InfoReceived' },
          { name: 'In Transit', value: 'InTransit' },
          { name: 'Expired', value: 'Expired' },
          { name: 'Available For Pickup', value: 'AvailableForPickup' },
          { name: 'Out For Delivery', value: 'OutForDelivery' },
          { name: 'Delivery Failure', value: 'DeliveryFailure' },
          { name: 'Delivered', value: 'Delivered' },
          { name: 'Exception', value: 'Exception' },
        ],
        default: 'InTransit',
        description: 'Filter by current main package status',
      },
      {
        displayName: 'Tracking Status',
        name: 'trackingStatus',
        type: 'options',
        displayOptions: { show: { operation: ['list_trackings'] } },
        options: [
          { name: 'Tracking', value: 'Tracking' },
          { name: 'Stopped', value: 'Stopped' },
        ],
        default: 'Tracking',
        description: 'Whether 17TRACK is still tracking the shipment',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const operation = this.getNodeParameter('operation', 0) as string;
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      let body: unknown;
      let path: string;

      if (operation === 'get_quota') {
        path = 'getquota';
        body = [];
      } else if (operation === 'register_trackings') {
        const numbers = parseNumbers(this.getNodeParameter('numbers', i) as string);
        if (numbers.length === 0 || numbers.length > 40) {
          throw new NodeOperationError(this.getNode(), 'Provide between 1 and 40 valid tracking numbers');
        }
        const autoDetection = this.getNodeParameter('autoDetection', i) as boolean;
        const tag = this.getNodeParameter('tag', i) as string;
        const remark = this.getNodeParameter('remark', i) as string;
        path = 'register';
        body = numbers.map((number) => ({
          number,
          auto_detection: autoDetection,
          ...(tag ? { tag } : {}),
          ...(remark ? { remark } : {}),
        }));
      } else if (operation === 'get_tracking_details') {
        const numbers = parseNumbers(this.getNodeParameter('numbers', i) as string);
        if (numbers.length === 0 || numbers.length > 40) {
          throw new NodeOperationError(this.getNode(), 'Provide between 1 and 40 valid tracking numbers');
        }
        path = 'gettrackinfo';
        body = numbers.map((number) => ({ number }));
      } else if (operation === 'change_carrier') {
        const numbers = parseNumbers(this.getNodeParameter('numbers', i) as string);
        if (numbers.length === 0 || numbers.length > 40) {
          throw new NodeOperationError(this.getNode(), 'Provide between 1 and 40 valid tracking numbers');
        }
        const carrierOld = this.getNodeParameter('carrierOld', i) as number;
        const carrierNew = this.getNodeParameter('carrierNew', i) as number;
        path = 'changecarrier';
        body = numbers.map((number) => ({
          number,
          ...(carrierOld ? { carrier_old: carrierOld } : {}),
          carrier_new: carrierNew,
        }));
      } else if (operation === 'update_tracking_info') {
        const numbers = parseNumbers(this.getNodeParameter('numbers', i) as string);
        if (numbers.length === 0 || numbers.length > 40) {
          throw new NodeOperationError(this.getNode(), 'Provide between 1 and 40 valid tracking numbers');
        }
        const tag = this.getNodeParameter('tag', i) as string;
        const remark = this.getNodeParameter('remark', i) as string;
        const items = { ...(tag ? { tag } : {}), ...(remark ? { remark } : {}) };
        if (Object.keys(items).length === 0) {
          throw new NodeOperationError(this.getNode(), 'Provide at least one field to update (tag or remark)');
        }
        path = 'changeinfo';
        body = numbers.map((number) => ({ number, items }));
      } else if (operation === 'get_realtime_tracking_details') {
        const number = this.getNodeParameter('realtimeNumber', i) as string;
        const cacheLevel = this.getNodeParameter('cacheLevel', i) as number;
        path = 'getRealTimeTrackInfo';
        body = [{ number, cacheLevel }];
      } else if (
        ['stop_trackings', 'restart_trackings', 'delete_trackings', 'push_trackings'].includes(operation)
      ) {
        const numbers = parseNumbers(this.getNodeParameter('numbers', i) as string);
        if (numbers.length === 0 || numbers.length > 40) {
          throw new NodeOperationError(this.getNode(), 'Provide between 1 and 40 valid tracking numbers');
        }
        path =
          operation === 'stop_trackings'
            ? 'stoptrack'
            : operation === 'restart_trackings'
              ? 'retrack'
              : operation === 'delete_trackings'
                ? 'deletetrack'
                : 'push';
        body = numbers.map((number) => ({ number }));
      } else {
        const pageNo = this.getNodeParameter('pageNo', i) as number;
        const packageStatus = this.getNodeParameter('packageStatus', i) as string;
        const trackingStatus = this.getNodeParameter('trackingStatus', i) as string;
        path = 'gettracklist';
        body = {
          page_no: pageNo,
          package_status: packageStatus,
          tracking_status: trackingStatus,
        };
      }

      const response = await this.helpers.httpRequest({
        method: 'POST',
        url: `${API_BASE}/${path}`,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });

      const envelope = typeof response === 'string' ? JSON.parse(response) : response;
      const data = (envelope && typeof envelope === 'object' ? envelope : {}) as Record<string, unknown>;
      const innerData = (data.data ?? {}) as Record<string, unknown>;
      const errors = Array.isArray((innerData as Record<string, unknown>).errors)
        ? ((innerData as Record<string, unknown>).errors as unknown[])
        : [];
      const first = (errors[0] ?? {}) as Record<string, unknown>;

      if (data.code !== 0 || errors.length > 0) {
        throw new NodeOperationError(
          this.getNode(),
          `17TRACK error ${String(first.code ?? data.code)}: ${String(first.message ?? 'request failed')}`,
        );
      }

      returnData.push({ json: innerData });
    }

    return [returnData];
  }
}
