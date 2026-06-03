import '@douyinfe/semi-ui/react19-adapter'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import './library.css'

export { NexusChatUI } from '@/components/ChatUI'
export { useNexusChat } from '@/hooks/useNexusChat'
export { useChatConnection } from '@/hooks/useChatConnection'
export { useChatMessages } from '@/hooks/useChatMessages'
export type {
  ChannelRole,
  ChatChannelItem,
  ChatChannelMemberDetail,
  ChatConnectionContext,
  ChatConnectionStatus,
  ChatConversationItem,
  ChatMessageDirection,
  ChatMessageItem,
  ChatMessagePosition,
  ChatUserProfile,
  NexusChatUIProps,
} from '@/types'
