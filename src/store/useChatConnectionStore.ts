import { create } from 'zustand'
import type { ChatConnectionStatus } from '@/types'

interface ChatConnectionStore {
  wsAddress?: string
  httpUrl?: string
  searchUrl?: string
  getUserUrl?: string
  token: string
  connectionStatus: ChatConnectionStatus
  setWsAddress: (wsAddress?: string) => void
  setHttpUrl: (httpUrl?: string) => void
  setSearchUrl: (searchUrl?: string) => void
  setGetUserUrl: (getUserUrl?: string) => void
  setToken: (token: string) => void
  setConnectionStatus: (status: ChatConnectionStatus) => void
}

export const useChatConnectionStore = create<ChatConnectionStore>((set) => ({
  wsAddress: undefined,
  httpUrl: undefined,
  searchUrl: undefined,
  getUserUrl: undefined,
  token: '',
  connectionStatus: 'idle',
  setWsAddress: (wsAddress) => set({ wsAddress }),
  setHttpUrl: (httpUrl) => set({ httpUrl }),
  setSearchUrl: (searchUrl) => set({ searchUrl }),
  setGetUserUrl: (getUserUrl) => set({ getUserUrl }),
  setToken: (token) => set({ token }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}))

export const getChatConnectionState = () => useChatConnectionStore.getState()

export const setChatConnectionAuth = (payload: {
  httpUrl?: string
  searchUrl?: string
  getUserUrl?: string
  wsAddress?: string
  token?: string
}) => {
  useChatConnectionStore.setState((state) => ({
    ...state,
    ...(payload.httpUrl !== undefined ? { httpUrl: payload.httpUrl } : {}),
    ...(payload.searchUrl !== undefined ? { searchUrl: payload.searchUrl } : {}),
    ...(payload.getUserUrl !== undefined ? { getUserUrl: payload.getUserUrl } : {}),
    ...(payload.wsAddress !== undefined ? { wsAddress: payload.wsAddress } : {}),
    ...(payload.token !== undefined ? { token: payload.token } : {}),
  }))
}
