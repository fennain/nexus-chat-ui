import axios, {
  AxiosError,
} from "axios";
import { Toast } from '@douyinfe/semi-ui'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import type { ResultData } from "@/types/api";
import { ResultEnum } from '@/enums/httpEnum'
import { useChatConnectionStore } from '@/store/useChatConnectionStore'
import { checkStatus } from "./helper/checkStatus";

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  loading?: boolean; // 是否显示加载动画
}

const config = {
  baseURL: "",
  // 超时时间
  timeout: ResultEnum.TIMEOUT as number,
  // 允许跨域携带凭证
  withCredentials: false,
};

class RequestHttp {
  service: AxiosInstance;
  public constructor(config: AxiosRequestConfig) {
    // 实例化
    this.service = axios.create(config);

    /**
     * @description 请求拦截器
     * 客户端发送请求 -> [请求拦截器] -> 服务器
     * token验证(JWT)：接收服务器返回的token，并存储在redux/local storage中
     */
    this.service.interceptors.request.use(
      (config: CustomAxiosRequestConfig) => {
        const { httpUrl, token } = useChatConnectionStore.getState();

        if (httpUrl) {
          config.baseURL = httpUrl;
        }

        if (config.headers && typeof config.headers.set === "function") {
          if (token) {
            config.headers.set("Authorization", `Bearer ${token}`);
          }
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    /**
     * @description 响应拦截器
     * 服务器返回信息 -> [统一拦截处理] -> 客户端JS获取到信息
     */
    this.service.interceptors.response.use(
      (response: AxiosResponse) => {
        const { data } = response;
        // const config = response.config as CustomAxiosRequestConfig;
        // config.loading && tryHideFullScreenLoading();

        // 全局错误信息拦截（为防止下载文件时返回数据流，直接报错无code）
        if (data.error) {
          Toast.error(data.error)
          return Promise.reject(data);
        }
        // 请求成功（除非有特殊情况，否则页面无需处理失败逻辑）
        return data;
      },
      async (error: AxiosError) => {
        const { response } = error;
        const data: any = response?.data;
        console.log(response);
        if (data?.error) {
          Toast.error(data.error)
          return Promise.reject(data)
        }
        // 请求超时 && 网络错误单独判断，没有response
        if (error.message.indexOf("timeout") !== -1)
          Toast.error('Request timed out. Please try again later.')
        if (error.message.indexOf("Network Error") !== -1)
          Toast.error('Network error. Please try again later.')
        // 根据服务器响应的错误状态码做不同处理
        if (response) checkStatus(response.status);
        return Promise.reject(error);
      }
    );
  }

  /**
   * @description 通用请求方法封装
   */
  get<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
    return this.service.get(url, { params, ..._object });
  }
  post<T>(
    url: string,
    params?: object | string,
    _object = {}
  ): Promise<ResultData<T>> {
    return this.service.post(url, params, _object);
  }
  patch<T>(
    url: string,
    params?: object | string,
    _object = {}
  ): Promise<ResultData<T>> {
    return this.service.patch(url, params, _object);
  }
  put<T>(url: string, params?: object, _object = {}): Promise<ResultData<T>> {
    return this.service.put(url, params, _object);
  }
  delete<T>(
    url: string,
    params?: unknown,
    _object = {}
  ): Promise<ResultData<T>> {
    return this.service.delete(url, { params, ..._object });
  }
  download(url: string, params?: object, _object = {}): Promise<BlobPart> {
    return this.service.post(url, params, { ..._object, responseType: "blob" });
  }
}

export default new RequestHttp(config);
