import { Button, TextArea } from '@douyinfe/semi-ui'
import { useCallback, type KeyboardEvent } from 'react'

interface MessageInputProps {
  value: string
  placeholder?: string
  disabled?: boolean
  sendDisabled?: boolean
  onChange: (innerHtml: string, textContent: string, innerText: string) => void
  onSend: (innerHtml: string, textContent: string, innerText: string) => void
}

export function MessageInput({
  value,
  placeholder,
  disabled = false,
  sendDisabled = false,
  onChange,
  onSend,
}: MessageInputProps) {
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

  return (
    <div className="flex items-end gap-[12px] border-t border-solid border-t-slate-200 bg-white px-[16px] py-[12px]">
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
  )
}

export default MessageInput
