export interface ICustomDataMap {
  [key: string]: {
    currency: string;
    value: number;
    content_ids: string[];
    content_type: string;
  };
}

export const CUSTOM_DATA_MAP: ICustomDataMap = {
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
