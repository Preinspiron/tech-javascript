export interface ICustomFBDataMap {
  [key: string]: {
    currency: string;
    value: number;
    content_ids: string[];
    content_type: string;
  };
}

export interface ICustomTTDataMap {
  [key: string]: {
    currency: string;
    value: number;
    content_type: string;
    contents: [
      {
        price: number;
        quantity: number;
        content_id: string;
        content_category: string;
        content_name: string;
        brand: string;
      },
    ];
  };
}

export interface ITTEventConversion {
  [key: string]: {
    currency: string;
    value: number;
    content_type: string;
  };
}

export const CUSTOM_FB_DATA_MAP: ICustomFBDataMap = {
  PageView: {
    currency: 'USD',
    value: 0.01,
    content_ids: ['product.id.123'],
    content_type: 'product',
  },
  Lead: {
    currency: 'USD',
    value: 0.04,
    content_ids: ['product.id.123'],
    content_type: 'product',
  },
  ViewContent: {
    currency: 'USD',
    value: 0.1,
    content_ids: ['product.id.123'],
    content_type: 'product',
  },
  CompleteRegistration: {
    currency: 'USD',
    value: 2.0,
    content_ids: ['product.id.123'],
    content_type: 'product',
  },
  Purchase: {
    currency: 'USD',
    value: 20.0,
    content_ids: ['product.id.123'],
    content_type: 'product',
  },
};

export const TT_EVENT_CONVERSION: ITTEventConversion = {
  GenerateLead: {
    currency: 'USD',
    value: 0.04,
    content_type: 'product',
  },
  ViewContent: {
    currency: 'USD',
    value: 0.1,
    content_type: 'product',
  },
  Registration: {
    currency: 'USD',
    value: 2.0,
    content_type: 'product',
  },
  Purchase: {
    currency: 'USD',
    value: 20.0,
    content_type: 'product',
  },
};

export const CUSTOM_TT_DATA_MAP: ICustomTTDataMap = {
  PageView: {
    currency: 'USD',
    value: 0.01,
    content_type: 'product',
    contents: [
      {
        price: 0.01,
        quantity: 1,
        content_id: 'pageview_123',
        content_category: 'Game',
        content_name: 'Page Visit',
        brand: 'Buddy',
      },
    ],
  },
  Lead: {
    currency: 'USD',
    value: 0.04,
    content_type: 'product',
    contents: [
      {
        price: 0.04,
        quantity: 1,
        content_id: 'lead_123',
        content_category: 'Game',
        content_name: 'Lead Generation',
        brand: 'Buddy',
      },
    ],
  },
  ViewContent: {
    currency: 'USD',
    value: 0.1,
    content_type: 'product',
    contents: [
      {
        price: 0.1,
        quantity: 1,
        content_id: 'view_123',
        content_category: 'Game',
        content_name: 'Content View',
        brand: 'Buddy',
      },
    ],
  },
  CompleteRegistration: {
    currency: 'USD',
    value: 2.0,
    content_type: 'product',
    contents: [
      {
        price: 2.0,
        quantity: 1,
        content_id: 'reg_123',
        content_category: 'Game',
        content_name: 'Registration',
        brand: 'Buddy',
      },
    ],
  },
  Purchase: {
    currency: 'USD',
    value: 20.0,
    content_type: 'product',
    contents: [
      {
        price: 20.0,
        quantity: 1,
        content_id: 'offer_123',
        content_category: 'Game',
        content_name: 'Offer',
        brand: 'Buddy',
      },
    ],
  },
};
