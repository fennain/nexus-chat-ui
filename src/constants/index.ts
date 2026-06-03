import type { ChannelRole, ChatConnectionStatus } from '@/types'
import type { TagColor } from '@douyinfe/semi-ui/lib/es/tag/interface'

export const DEFAULT_AVATAR =
  'https://chatscope.io/storybook/react/assets/emily-xzL8sDL2.svg'

export const statusLabelMap: Record<ChatConnectionStatus, string> = {
  idle: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Connection error',
}

export const statusToneMap: Record<ChatConnectionStatus, string> = {
  idle: 'bg-slate-200 text-slate-600',
  connecting: 'bg-orange-100 text-orange-700',
  connected: 'bg-emerald-100 text-emerald-700',
  disconnected: 'bg-rose-100 text-rose-700',
  error: 'bg-rose-100 text-rose-700',
}

export const CHANNEL_TAG_COLOR: Record<ChannelRole, TagColor> = {
  OWNER: 'amber',
  ADMIN: 'green',
  MEMBER: 'grey',
}
