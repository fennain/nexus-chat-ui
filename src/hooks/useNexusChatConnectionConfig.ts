import { useEffect } from 'react'
import { useChatConnectionStore } from '@/store/useChatConnectionStore'

interface UseNexusChatConnectionConfigOptions {
  httpUrl?: string
  searchUrl?: string
  getUserUrl?: string
  token?: string
}

/**
 * 同步外部传入的连接配置到 zustand，避免 useNexusChat 内重复维护多段 effect。
 */
export function useNexusChatConnectionConfig({
  httpUrl,
  searchUrl,
  getUserUrl,
  token,
}: UseNexusChatConnectionConfigOptions) {
  const setHttpUrl = useChatConnectionStore((state) => state.setHttpUrl)
  const setSearchUrl = useChatConnectionStore((state) => state.setSearchUrl)
  const setGetUserUrl = useChatConnectionStore((state) => state.setGetUserUrl)
  const setToken = useChatConnectionStore((state) => state.setToken)

  useEffect(() => {
    setHttpUrl(httpUrl)
  }, [httpUrl, setHttpUrl])

  useEffect(() => {
    setSearchUrl(searchUrl)
  }, [searchUrl, setSearchUrl])

  useEffect(() => {
    setGetUserUrl(getUserUrl)
  }, [getUserUrl, setGetUserUrl])

  useEffect(() => {
    if (token !== undefined) {
      setToken(token)
    }
  }, [setToken, token])
}
