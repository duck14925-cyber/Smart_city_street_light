import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    // Hãy copy và dán chính xác dòng dưới này vào dự án của bạn:
    'Authorization': 'token 4012e6cab2adcb6:b159a92081dab32',
  },
});

export interface FrappeListParams {
  fields?: string[];
  filters?: Record<string, any> | Array<any>;
  limit_page_length?: number;
  order_by?: string;
}

export const frappeGet = async <T = any>(doctype: string, params?: FrappeListParams): Promise<T[]> => {
  try {
    const response = await api.get(`/api/resource/${doctype}`, {
      params: {
        fields: params?.fields ? JSON.stringify(params.fields) : JSON.stringify(['*']),
        filters: params?.filters ? JSON.stringify(params.filters) : undefined,
        limit_page_length: params?.limit_page_length ?? 100,
        order_by: params?.order_by,
      },
    });
    return response.data.data ?? [];
  } catch (error) {
    console.error(`[API] GET ${doctype} failed:`, error);
    return [];
  }
};

export const frappeGetCount = async (doctype: string, filters?: Record<string, any>): Promise<number> => {
  try {
    const response = await api.get(`/api/method/frappe.client.get_count`, {
      params: {
        doctype,
        filters: filters ? JSON.stringify(filters) : undefined,
      },
    });
    return response.data.message ?? 0;
  } catch (error) {
    console.error(`[API] COUNT ${doctype} failed:`, error);
    return 0;
  }
};

export const frappeCreate = async <T = any>(doctype: string, data: Record<string, any>): Promise<T> => {
  const response = await api.post(`/api/resource/${doctype}`, data);
  return response.data.data;
};

export const frappeDelete = async (doctype: string, name: string): Promise<void> => {
  await api.delete(`/api/resource/${doctype}/${name}`);
};

export default api;
