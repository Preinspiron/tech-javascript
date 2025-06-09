export interface IFacebook {
  [key: string]: {
    currency: string;
    value: number;
    content_ids: string[];
    content_type: string;
    content_id?: string;
  };
}



export interface ITikTok {
  [key: string]: {
    currency: string;
    value: number;
    content_type: string;
    // content_id?:number
     contents?: [
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

export const FB: IFacebook = {
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

export const TT: ITikTok = {
  PageView: {
    currency: 'USD',
    value: 0.01,
    content_type: 'product',
  },
  Lead: {
    currency: 'USD',
    value: 0.04,
    content_type: 'product',
  },
  ViewContent: {
    currency: 'USD',
    value: 0.1,
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
  CompleteRegistration: {
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
