import http from '@/api/index'
import type {
  ConversationListItem,
  ChannelListItem,
  MessageHistoryItem,
  ContactActionResult,
} from '@/api/interface'
import type { ChannelRole, ChatChannelMemberDetail, ChatUserId } from '@/types'
export * from './contact'

// 查询单聊会话列表
export const getConversationsApi = () => {
  return http.get<ConversationListItem[]>('/api/v1/conversations')
}
// 创建单聊会话
export const createConversationApi = (userId: ChatUserId) => {
  return http.post<ConversationListItem>('/api/v1/conversations', { userId: userId + '' })
}
// 加载会话历史消息
export const loadSingleMessagesApi = (roomId: string, roomType: 'CONVERSATION' | 'CHANNEL', before?: string) => {
  return http.get<MessageHistoryItem[]>('/api/v1/messages', {
    roomId,
    roomType,
    ...(before ? { before } : {}),
  })
}

// 群聊
// 查询群聊会话列表
export const getChannelsApi = () => {
  return http.get<ChannelListItem[]>('/api/v1/channels')
}
// 创建群聊
export const createChannelApi = (name: string, description: string) => {
  return http.post<ChannelListItem>('/api/v1/channels', {
    name, description, type: "PRIVATE",
    e2eeEnabled: false
  })
}
// 添加一个群成员
export const addUserToChannelApi = (roomId: string, userId: ChatUserId) => {
  return http.post<any>(`/api/v1/channels/${roomId}/members`, { userId: userId + '' })
}

export const getChannelMembersApi = (channelId: string) => {
  return http.get<ChatChannelMemberDetail[]>(`/api/v1/channels/${channelId}/members`)
}

export const deleteChannelApi = (channelId: string) => {
  return http.delete<ContactActionResult>(`/api/v1/channels/${channelId}`)
}

export const leaveChannelApi = (channelId: string) => {
  return http.post<ContactActionResult>(`/api/v1/channels/${channelId}/leave`)
}

export const removeChannelMemberApi = (channelId: string, userId: ChatUserId) => {
  const encodedUserId = encodeURIComponent(String(userId))

  return http.delete<ContactActionResult>(
    `/api/v1/channels/${channelId}/members/${encodedUserId}`,
  )
}

export const updateChannelMemberRoleApi = (
  channelId: string,
  userId: ChatUserId,
  role: ChannelRole,
) => {
  const encodedUserId = encodeURIComponent(String(userId))

  return http.patch<ChatChannelMemberDetail>(
    `/api/v1/channels/${channelId}/members/${encodedUserId}/role`,
    { role },
  )
}
