import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildConnectionUrl,
  createOutgoingPayload,
} from '@/lib/chatProtocol'
import { useChatConnectionStore } from '@/store/useChatConnectionStore'
import type {
  ChatConnectionContext,
  ChatConnectionStatus,
  ChatMessageItem,
} from '@/types'

interface UseChatConnectionOptions {
  autoConnect?: boolean
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  wsUrl?: string
  context: ChatConnectionContext
  onConnectionStatusChange?: (status: ChatConnectionStatus) => void
  onError?: (error: Event | Error | unknown) => void
  onEvent?: (eventName: string, data?: unknown) => void
}

interface UseChatConnectionResult {
  status: ChatConnectionStatus
  resolvedWsUrl?: string
  sendMessage: (message: ChatMessageItem) => void
  sendPayload: (payload: string | Blob | BufferSource) => void
  reconnect: () => void
  hasReconnectExhausted: boolean
}

export function useChatConnection({
  autoConnect = true,
  reconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 3,
  wsUrl,
  context,
  onConnectionStatusChange,
  onError,
  onEvent,
}: UseChatConnectionOptions): UseChatConnectionResult {
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const connectRef = useRef<() => void>(() => {})
  const manualCloseRef = useRef(false)
  const queueRef = useRef<Array<string | Blob | BufferSource>>([])
  const contextRef = useRef(context)
  const onConnectionStatusChangeRef = useRef(onConnectionStatusChange)
  const onErrorRef = useRef(onError)
  const onEventRef = useRef(onEvent)
  const [hasReconnectExhausted, setHasReconnectExhausted] = useState(false)
  const status = useChatConnectionStore((state) => state.connectionStatus)
  const setWsAddress = useChatConnectionStore((state) => state.setWsAddress)
  const setConnectionStatus = useChatConnectionStore((state) => state.setConnectionStatus)

  useEffect(() => {
    contextRef.current = context
  }, [context])

  useEffect(() => {
    onConnectionStatusChangeRef.current = onConnectionStatusChange
  }, [onConnectionStatusChange])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const updateStatus = useCallback(
    (nextStatus: ChatConnectionStatus) => {
      setConnectionStatus(nextStatus)
      onConnectionStatusChangeRef.current?.(nextStatus)
    },
    [setConnectionStatus],
  )

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const flushQueue = useCallback(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return
    }

    queueRef.current.forEach((queuedPayload) => {
      socketRef.current?.send(queuedPayload)
    })

    queueRef.current = []
  }, [])

  const connect = useCallback(() => {
    if (!wsUrl || !autoConnect) {
      return
    }

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    clearReconnectTimer()
    manualCloseRef.current = false
    setHasReconnectExhausted(false)
    updateStatus('connecting')
    const resolvedUrl = buildConnectionUrl(wsUrl, contextRef.current)

    let socket: WebSocket

    try {
      socket = new WebSocket(resolvedUrl)
    } catch (error) {
      console.error('WebSocket connection failed:', {
        wsUrl,
        resolvedUrl,
        error,
      })
      updateStatus('error')
      onErrorRef.current?.(error)
      return
    }

    socketRef.current = socket

    socket.addEventListener('open', () => {
      if (socketRef.current !== socket) {
        return
      }

      reconnectAttemptsRef.current = 0
      updateStatus('connected')
      flushQueue()
    })

    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        return
      }

      try {
        const parsed = JSON.parse(event.data) as {
          event?: string
          data?: unknown
        }

        if (parsed.event) {
          onEventRef.current?.(parsed.event, parsed.data)
        }
      } catch {
        // Ignore malformed socket payloads.
      }
    })

    socket.addEventListener('close', (event) => {
      if (socketRef.current !== socket) {
        return
      }

      console.error('WebSocket close event:', {
        wsUrl,
        resolvedUrl,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        readyState: socket.readyState,
      })

      socketRef.current = null

      if (manualCloseRef.current) {
        updateStatus('disconnected')
        return
      }

      updateStatus('disconnected')

      if (reconnect) {
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setHasReconnectExhausted(true)
          return
        }

        reconnectAttemptsRef.current += 1
        clearReconnectTimer()
        reconnectTimerRef.current = window.setTimeout(() => {
          connectRef.current()
        }, reconnectInterval)
      }
    })

    socket.addEventListener('error', (event) => {
      if (socketRef.current !== socket) {
        return
      }

      console.error('WebSocket error event:', {
        wsUrl,
        resolvedUrl,
        readyState: socket.readyState,
        event,
      })
      updateStatus('error')
      onErrorRef.current?.(event)
    })
  }, [
    autoConnect,
    clearReconnectTimer,
    flushQueue,
    reconnect,
    reconnectInterval,
    maxReconnectAttempts,
    wsUrl,
    updateStatus,
  ])

  const disconnect = useCallback(() => {
    manualCloseRef.current = true
    clearReconnectTimer()
    socketRef.current?.close()
    socketRef.current = null
    reconnectAttemptsRef.current = 0
    setHasReconnectExhausted(false)
    updateStatus('disconnected')
  }, [clearReconnectTimer, updateStatus])

  const reconnectNow = useCallback(() => {
    if (!wsUrl) {
      return
    }

    manualCloseRef.current = false
    reconnectAttemptsRef.current = 0
    setHasReconnectExhausted(false)
    clearReconnectTimer()

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      socketRef.current.close()
    }

    connectRef.current()
  }, [clearReconnectTimer, wsUrl])

  const sendPayload = useCallback(
    (payload: string | Blob | BufferSource) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(payload)
        return
      }

      queueRef.current.push(payload)

      if (autoConnect) {
        connect()
      }
    },
    [autoConnect, connect],
  )

  const sendMessage = useCallback(
    (message: ChatMessageItem) => {
      sendPayload(
        createOutgoingPayload(
          message,
        ),
      )
    },
    [sendPayload],
  )

  useEffect(() => {
    setWsAddress(wsUrl)
  }, [setWsAddress, wsUrl])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    if (!wsUrl) {
      reconnectAttemptsRef.current = 0
      setHasReconnectExhausted(false)
      window.setTimeout(() => updateStatus('idle'), 0)

      return () => {
        clearReconnectTimer()
      }
    }

    connect()

    return () => {
      disconnect()
    }
  }, [clearReconnectTimer, connect, disconnect, updateStatus, wsUrl])

  return useMemo(
    () => ({
      status,
      resolvedWsUrl: wsUrl,
      sendMessage,
      sendPayload,
      reconnect: reconnectNow,
      hasReconnectExhausted,
    }),
    [hasReconnectExhausted, reconnectNow, sendMessage, sendPayload, status, wsUrl],
  )
}
