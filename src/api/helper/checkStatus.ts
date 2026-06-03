import { Toast } from '@douyinfe/semi-ui'

/**
 * @description: Verify network request status code
 * @param {Number} status
 * @return void
 */
export const checkStatus = (status: number) => {
  switch (status) {
    case 400:
      Toast.error('Request failed. Please try again later.')
      break;
    case 401:
      Toast.error('Your session has expired. Please sign in again.')
      break;
    case 403:
      Toast.error('You do not have permission to access this resource.')
      break;
    case 404:
      Toast.error('The resource you requested does not exist.')
      break;
    case 405:
      Toast.error('Invalid request method. Please try again later.')
      break;
    case 408:
      Toast.error('Request timed out. Please try again later.')
      break;
    case 500:
      Toast.error('Server error.')
      break;
    case 502:
      Toast.error('Gateway error.')
      break;
    case 503:
      Toast.error('Service unavailable.')
      break;
    case 504:
      Toast.error('Gateway timeout.')
      break;
    default:
      Toast.error('Request failed.')
  }
}
