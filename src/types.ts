export type ChatMessageDirection = 'incoming' | 'outgoing'
export type ChatMessagePosition = 'single' | 'first' | 'normal' | 'last'
export type ChatAttachmentKind = 'IMAGE' | 'FILE' | 'AUDIO'
/** 用户 ID 允许保留接口原始类型；内部比较/索引时统一转字符串处理。 */
export type ChatUserId = string | number
export type ChatConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export type ChannelRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface ChatChannelMemberDetail {
  channelId: string
  userId: ChatUserId
  role: ChannelRole
  status: string
}

export interface ChatMessageEncryption {
  id?: string
  scheme?: string
  text?: string
}

export interface ChatAttachmentItem {
  fileId: string
  objectKey?: string
  url: string
  thumbnailUrl?: string
  name: string
  mime: string
  size: number
  kind: ChatAttachmentKind
  width?: number
  height?: number
  duration?: number
}

export interface ChatMessageItem {
  _id?: string
  roomId?: string
  roomType?: 'CONVERSATION' | 'CHANNEL'
  senderId?: ChatUserId
  type?: string
  status?: string
  encryption?: ChatMessageEncryption
  attachment?: ChatAttachmentItem
  sentAt?: string
}

export interface ChatConversationItem {
  _id: string
  participants: ChatUserId[]
  createdAt: string
  updatedAt: string
  // 会话类型：`CONVERSATION` 为单聊，`CHANNEL` 为群聊。
  roomType: 'CONVERSATION' | 'CHANNEL'
  msg: ChatMessageItem[]
  hasReq?: boolean
  hasJoin?: boolean
  unreadCount?: number
  historyHasMore?: boolean
}

export interface ChatChannelItem {
  _id: string
  members: ChatUserId[]
  membersDetail: ChatChannelMemberDetail[]
  membersDetailLoaded?: boolean
  name: string
  description?: string
  type: string
  createdBy: ChatUserId
  e2eeEnabled: boolean
  senderKeyVersion: number
  // 会话类型：`CONVERSATION` 为单聊，`CHANNEL` 为群聊。
  roomType: 'CHANNEL'
  msg: ChatMessageItem[]
  hasReq?: boolean
  hasJoin?: boolean
  unreadCount?: number
  historyHasMore?: boolean
  createdAt: string
  updatedAt: string
}

export interface ChatUserProfile {
  /** 保留接口返回的原始 userId 类型，不在 API 层强制转字符串。 */
  userId: ChatUserId
  userName?: string
  avatarUrl?: string
  token?: string
}

export interface ChatConnectionContext {
  userId?: ChatUserId
  userName?: string
  userAvatar?: string
  token?: string
  connectionParams?: Record<string, string | number | boolean | undefined>
}

export interface NexusChatUIProps {
  /** WebSocket 长连接地址，用于聊天消息收发。 */
  wsUrl: string
  /** HTTP 接口地址，供包内 axios 请求作为 baseURL 使用。 */
  httpUrl: string
  /** HTTP 接口地址，供包内搜索用户请求使用。 */
  searchUrl: string
  /** HTTP 接口地址，供包内获取用户信息请求使用。 */
  getUserUrl: string
  /** 鉴权 token，包内请求会自动携带 `Authorization: Bearer <token>`。 */
  token: string
  /** 连接参数，会自动拼接到 ws URL 查询参数中。 */
  connectionParams?: Record<string, string | number | boolean | undefined>
  /** 当前登录用户 ID，会用于消息上下文与默认协议出参。 */
  userId: ChatUserId
  /** 输入框占位文案。 */
  placeholder?: string
  /** 根节点自定义 className，便于业务侧覆盖样式。 */
  className?: string
  /** 是否禁用输入区域。 */
  disabled?: boolean
  /** 是否在组件挂载后自动建立 WebSocket 连接。 */
  autoConnect?: boolean
  /** 当前会话无消息时显示的占位文案。 */
  emptyMessageText?: string
  /** 收到服务端消息后的回调。 */
  onMessageReceive?: (message: ChatMessageItem) => void
  /** 连接状态变化回调。 */
  onConnectionStatusChange?: (status: ChatConnectionStatus) => void
  /** 连接或消息处理异常回调。 */
  onError?: (error: Event | Error | unknown) => void
}
