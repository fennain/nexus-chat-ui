import axios from 'axios'
import http from '@/api/index'
import type {
  ContactActionResult,
  ContactListItem,
  ContactRequestActionResult,
  ContactRequestItem,
  UpdateContactPayload,
  UserSearchItem,
} from '@/api/interface'
import { hasUserId } from '@/lib/chatUser'
import { getChatConnectionState } from '@/store/useChatConnectionStore'
import type { ChatUserId, ChatUserProfile } from '@/types'

// 查询好友列表
export const getContactsApi = () => {
  return http.get<ContactListItem[]>('/api/v1/contacts')
}

// 修改好友信息
export const updateContactApi = (userId: ChatUserId, payload: UpdateContactPayload) => {
  return http.patch<ContactListItem>(`/api/v1/contacts/${userId}`, payload)
}

// 删除好友
export const deleteContactApi = (userId: ChatUserId) => {
  return http.delete<ContactActionResult>(`/api/v1/contacts/${userId}`)
}

// 拉黑用户
export const blockContactApi = (userId: ChatUserId) => {
  return http.post<ContactActionResult>(`/api/v1/contacts/${userId}/block`)
}

// 取消拉黑
export const unblockContactApi = (userId: ChatUserId) => {
  return http.post<ContactActionResult>(`/api/v1/contacts/${userId}/unblock`)
}

interface UserSearchResponseItem {
  id: string | number
  email?: string
  nickname?: string
  avatar?: string
}

interface UserProfileResponseItem {
  id?: ChatUserId
  nickname?: string
  avatar?: string
  userId?: ChatUserId
  userName?: string
  avatarUrl?: string
  token?: string
}

type UserProfileResponse =
  | UserProfileResponseItem[]
  | { data?: { list?: UserProfileResponseItem[] } | UserProfileResponseItem[] }

const trimOptionalText = (value?: string) => {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

const normalizeUserProfile = (
  item: UserProfileResponseItem,
): ChatUserProfile | undefined => {
  if (!hasUserId(item.userId)) {
    if (!hasUserId(item.id)) {
      return undefined
    }

    return {
      userId: item.id,
      ...(trimOptionalText(item.nickname) !== undefined
        ? { userName: trimOptionalText(item.nickname) }
        : { userName: String(item.id) }),
      ...(trimOptionalText(item.avatar) !== undefined
        ? { avatarUrl: trimOptionalText(item.avatar) }
        : {}),
      ...(trimOptionalText(item.token) !== undefined
        ? { token: trimOptionalText(item.token) }
        : {}),
    }
  }

  return {
    userId: item.userId,
    ...(trimOptionalText(item.userName) !== undefined
      ? { userName: trimOptionalText(item.userName) }
      : {}),
    ...(trimOptionalText(item.avatarUrl) !== undefined
      ? { avatarUrl: trimOptionalText(item.avatarUrl) }
      : {}),
    ...(trimOptionalText(item.token) !== undefined
      ? { token: trimOptionalText(item.token) }
      : {}),
  }
}

// 搜索用户
// 约定：保留接口原始 userId 类型，仅归一化展示字段。
export const searchUsersApi = async (search_content: string) => {
  const { searchUrl, token } = getChatConnectionState()

  if (!searchUrl) {
    throw new Error('Missing searchUrl configuration')
  }

  const response = await axios.post<
    UserSearchResponseItem[] | { data?: { list?: UserSearchResponseItem[] } | UserSearchResponseItem[] }
  >(searchUrl, {
    search_content
  }, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  const payload = response.data
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : payload.data?.list ?? []

  return rawList.map((item) => ({
    userId: item.id,
    userName: item.nickname?.trim() || item.email?.trim() || String(item.id),
    avatarUrl: item.avatar ?? '',
  })) satisfies UserSearchItem[]
}

// 批量查询用户资料
// 约定：保留接口原始 userId 类型，仅清洗空白文本和非法项。
export const getUsersByIdsApi = async (userIds: ChatUserId[]) => {
  const { getUserUrl, token } = getChatConnectionState()

  if (!getUserUrl) {
    throw new Error('Missing getUserUrl configuration')
  }

  const response = await axios.post<UserProfileResponse>(getUserUrl, { user_id_list: userIds }, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  const payload = response.data
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : payload.data?.list ?? []

  return rawList
    .map(normalizeUserProfile)
    .filter((item): item is ChatUserProfile => Boolean(item))
}

// 查询待处理好友申请列表
export const getContactRequestsApi = () => {
  return http.get<ContactRequestItem[]>('/api/v1/contact-requests')
}

// 发送好友申请
export const createContactRequestApi = (toUserId: ChatUserId, message?: string) => {
  return http.post<ContactRequestItem>('/api/v1/contact-requests', {
    toUserId: toUserId + '',
    message,
  })
}

// 接受好友申请
export const acceptContactRequestApi = (id: string) => {
  return http.post<ContactRequestActionResult>(`/api/v1/contact-requests/${id}/accept`)
}

// 拒绝好友申请
export const rejectContactRequestApi = (id: string) => {
  return http.post<ContactRequestActionResult>(`/api/v1/contact-requests/${id}/reject`)
}
