import { Button, TextArea, Toast } from '@douyinfe/semi-ui'
import {
  ImageAddIcon,
  MicrophoneIcon,
  VoiceWaveIcon,
} from 'tdesign-icons-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ChatAttachmentKind } from '@/types'

interface MessageInputProps {
  value: string
  placeholder?: string
  disabled?: boolean
  sendDisabled?: boolean
  uploadDisabled?: boolean
  uploading?: boolean
  onChange: (innerHtml: string, textContent: string, innerText: string) => void
  onSend: (innerHtml: string, textContent: string, innerText: string) => void
  onUpload?: (
    file: File,
    kind: Lowercase<ChatAttachmentKind>,
    metadata?: { duration?: number },
  ) => Promise<void> | void
}

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined') {
    return undefined
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
}

const audioExtensionByMimeType = (mimeType?: string) => {
  if (mimeType?.includes('mp4')) {
    return 'm4a'
  }

  return 'webm'
}

const CANCEL_RECORDING_DISTANCE_PX = 56
const MIN_RECORDING_DURATION_MS = 800

const formatRecordingTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60

  return `${minutes}:${String(restSeconds).padStart(2, '0')}`
}

export function MessageInput({
  value,
  placeholder,
  disabled = false,
  sendDisabled = false,
  uploadDisabled = false,
  uploading = false,
  onChange,
  onSend,
  onUpload,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef(0)
  const recordingTimerRef = useRef<number | null>(null)
  const recordingPointerIdRef = useRef<number | null>(null)
  const recordingStartYRef = useRef(0)
  const shouldCancelRecordingRef = useRef(false)
  const shouldUploadRecordingRef = useRef(true)
  const pendingStopAfterStartRef = useRef(false)
  const pendingStopShouldUploadRef = useRef(true)
  const isRecordingStartingRef = useRef(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingStarting, setIsRecordingStarting] = useState(false)
  const [isRecordingCancelling, setIsRecordingCancelling] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const handleChange = useCallback(
    (nextValue: string) => {
      onChange(nextValue, nextValue, nextValue)
    },
    [onChange],
  )

  const handleSend = useCallback(() => {
    if (disabled || sendDisabled || !value.trim()) {
      return
    }

    onSend(value, value, value)
  }, [disabled, onSend, sendDisabled, value])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.nativeEvent.isComposing
      ) {
        return
      }

      event.preventDefault()
      handleSend()
    },
    [handleSend],
  )

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }, [])

  const stopAudioTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  const resetRecordingInteraction = useCallback(() => {
    recordingPointerIdRef.current = null
    shouldCancelRecordingRef.current = false
    pendingStopAfterStartRef.current = false
    pendingStopShouldUploadRef.current = true
    setIsRecordingCancelling(false)
  }, [])

  const handleUploadFile = useCallback(
    async (
      file: File | undefined,
      kind: Lowercase<ChatAttachmentKind>,
      metadata?: { duration?: number },
    ) => {
      if (!file || uploadDisabled || !onUpload) {
        return
      }

      await onUpload(file, kind, metadata)
    },
    [onUpload, uploadDisabled],
  )

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0]
      event.currentTarget.value = ''

      if (!file) {
        return
      }

      const kind: Lowercase<ChatAttachmentKind> = file.type.startsWith('image/')
        ? 'image'
        : 'file'
      void handleUploadFile(file, kind)
    },
    [handleUploadFile],
  )

  const stopRecording = useCallback(
    (shouldUpload: boolean) => {
      shouldUploadRecordingRef.current = shouldUpload

      const recorder = mediaRecorderRef.current
      if (!recorder) {
        if (isRecordingStartingRef.current) {
          pendingStopAfterStartRef.current = true
          pendingStopShouldUploadRef.current = shouldUpload
        }
        return
      }

      if (recorder.state === 'inactive') {
        return
      }

      try {
        if (recorder.state === 'recording') {
          recorder.requestData()
        }
      } catch {
        // Some browsers throw if requestData races with stop; stop still flushes data.
      }

      recorder.stop()
    },
    [],
  )

  const handleStartRecording = useCallback(async () => {
    if (
      uploadDisabled ||
      !onUpload ||
      isRecordingStartingRef.current ||
      mediaRecorderRef.current?.state === 'recording'
    ) {
      return
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      Toast.error('当前浏览器或访问地址不支持录音')
      return
    }

    let stream: MediaStream

    isRecordingStartingRef.current = true
    shouldUploadRecordingRef.current = true
    pendingStopAfterStartRef.current = false
    pendingStopShouldUploadRef.current = true
    audioChunksRef.current = []
    setIsRecordingStarting(true)
    setRecordingSeconds(0)

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      console.error('Failed to start voice recording:', error)
      Toast.error('无法使用麦克风')
      isRecordingStartingRef.current = false
      setIsRecordingStarting(false)
      resetRecordingInteraction()
      return
    }

    const mimeType = getSupportedAudioMimeType()
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    )

    mediaStreamRef.current = stream
    mediaRecorderRef.current = recorder
    recordingStartedAtRef.current = Date.now()

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    })

    recorder.addEventListener('stop', () => {
      clearRecordingTimer()
      setIsRecording(false)
      setIsRecordingStarting(false)
      stopAudioTracks()
      mediaRecorderRef.current = null
      isRecordingStartingRef.current = false

      const recorderMimeType = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(audioChunksRef.current, {
        type: recorderMimeType,
      })
      const durationMs = Date.now() - recordingStartedAtRef.current
      const shouldUpload = shouldUploadRecordingRef.current
      audioChunksRef.current = []
      resetRecordingInteraction()

      if (!shouldUpload) {
        return
      }

      if (durationMs < MIN_RECORDING_DURATION_MS || blob.size === 0) {
        Toast.warning('录音时间太短')
        return
      }

      const duration = Math.max(1, Number((durationMs / 1000).toFixed(2)))
      const file = new File(
        [blob],
        `voice-${Date.now()}.${audioExtensionByMimeType(recorderMimeType)}`,
        { type: recorderMimeType },
      )

      if (file.size === 0) {
        Toast.warning('录音为空，请重新录制')
        return
      }

      void handleUploadFile(file, 'audio', { duration })
    })

    recorder.start(250)
    setIsRecording(true)
    setIsRecordingStarting(false)
    isRecordingStartingRef.current = false
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(
        Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
      )
    }, 500)

    if (pendingStopAfterStartRef.current) {
      stopRecording(pendingStopShouldUploadRef.current)
    }
  }, [
    clearRecordingTimer,
    handleUploadFile,
    onUpload,
    resetRecordingInteraction,
    stopAudioTracks,
    stopRecording,
    uploadDisabled,
  ])

  const handleVoicePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      if (uploadDisabled || uploading || !onUpload || isRecording || isRecordingStarting) {
        return
      }

      event.preventDefault()
      recordingPointerIdRef.current = event.pointerId
      recordingStartYRef.current = event.clientY
      shouldCancelRecordingRef.current = false
      setIsRecordingCancelling(false)

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture is best-effort and is not available in every browser.
      }

      void handleStartRecording()
    },
    [
      handleStartRecording,
      isRecording,
      isRecordingStarting,
      onUpload,
      uploadDisabled,
      uploading,
    ],
  )

  const handleVoicePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        recordingPointerIdRef.current !== event.pointerId ||
        (!isRecording && !isRecordingStarting)
      ) {
        return
      }

      const shouldCancel =
        recordingStartYRef.current - event.clientY > CANCEL_RECORDING_DISTANCE_PX
      shouldCancelRecordingRef.current = shouldCancel
      setIsRecordingCancelling(shouldCancel)
    },
    [isRecording, isRecordingStarting],
  )

  const handleVoicePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (recordingPointerIdRef.current !== event.pointerId) {
        return
      }

      event.preventDefault()

      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Pointer capture may already be released by the browser.
      }

      stopRecording(!shouldCancelRecordingRef.current)
    },
    [stopRecording],
  )

  const handleVoicePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (recordingPointerIdRef.current !== event.pointerId) {
        return
      }

      stopRecording(false)
    },
    [stopRecording],
  )

  useEffect(
    () => () => {
      clearRecordingTimer()
      shouldUploadRecordingRef.current = false
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop()
      }
      stopAudioTracks()
    },
    [clearRecordingTimer, stopAudioTracks],
  )

  const controlsDisabled = uploadDisabled || !onUpload
  const isVoiceActive = isRecording || isRecordingStarting
  const VoiceIcon = isVoiceActive ? VoiceWaveIcon : MicrophoneIcon
  const voiceButtonLabel = isVoiceActive
    ? `${isRecordingCancelling ? '松开取消' : '松开发送'} ${formatRecordingTime(recordingSeconds)}`
    : '按住说话'
  const imageButtonClassName = [
    'group flex h-[36px] min-w-[112px] items-center justify-center gap-[7px] rounded-[18px] border px-[14px]',
    'bg-white text-[13px] font-medium text-slate-700 shadow-sm transition-all',
    'border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400',
    controlsDisabled || isRecording || uploading
      ? 'cursor-not-allowed opacity-50'
      : 'cursor-pointer active:scale-[0.98]',
  ].join(' ')
  const voiceButtonClassName = [
    'relative flex h-[36px] min-w-[156px] flex-1 select-none items-center justify-center gap-[8px] overflow-hidden rounded-[18px] border px-[16px]',
    'text-[13px] font-semibold shadow-sm transition-all touch-none outline-none sm:flex-none',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    isRecordingCancelling
      ? 'border-red-400 bg-red-50 text-red-600 shadow-red-100 focus-visible:outline-red-300'
      : isVoiceActive
        ? 'border-blue-500 bg-blue-600 text-white shadow-blue-200 focus-visible:outline-blue-300'
        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-blue-300',
    controlsDisabled || uploading
      ? 'cursor-not-allowed opacity-50'
      : 'cursor-pointer active:scale-[0.98]',
  ].join(' ')

  return (
    <div className="flex flex-col gap-[8px] border-t border-solid border-t-slate-200 bg-white px-[16px] py-[12px]">
      <input
        ref={fileInputRef}
        hidden
        type="file"
        onChange={handleFileInputChange}
      />
      <div className="flex items-center gap-[8px]">
        <button
          aria-label="发送图片或文件"
          className={imageButtonClassName}
          disabled={controlsDisabled || isRecording || uploading}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageAddIcon
            className="shrink-0 transition-transform group-hover:scale-105"
            size={18}
          />
          <span>{uploading ? '上传中' : '图片/文件'}</span>
        </button>
        <button
          aria-label={voiceButtonLabel}
          className={voiceButtonClassName}
          disabled={controlsDisabled || uploading}
          type="button"
          onClick={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
          onPointerCancel={handleVoicePointerCancel}
          onPointerDown={handleVoicePointerDown}
          onPointerMove={handleVoicePointerMove}
          onPointerUp={handleVoicePointerEnd}
        >
          <VoiceIcon className="shrink-0" size={18} />
          <span className="tabular-nums">{voiceButtonLabel}</span>
        </button>
      </div>
      <div className="flex items-end gap-[12px]">
        <TextArea
          autosize={{ minRows: 1, maxRows: 3 }}
          className="flex-1"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <Button
          disabled={sendDisabled || !value.trim()}
          theme="solid"
          type="primary"
          onClick={handleSend}
        >
          Send
        </Button>
      </div>
    </div>
  )
}

export default MessageInput
