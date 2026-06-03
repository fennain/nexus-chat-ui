import { useCallback } from 'react'
import type { RefObject } from 'react'

interface ScrollReturn {
  scrollToBottom: () => Promise<void>;
  scrollToTop: () => Promise<void>;
  scrollToBottomIfAtBottom: () => Promise<void>;
}

type UseScrollOptions = {
  containerRef?: RefObject<HTMLElement | null>
  elementId?: string
  threshold?: number
  behavior?: ScrollBehavior
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

const waitForReadyScrollElement = async (
  getScrollElement: () => HTMLElement | null,
) => {
  let scrollRef = getScrollElement()

  if (scrollRef?.scrollHeight) {
    return scrollRef
  }

  for (let index = 0; index < 8; index += 1) {
    await nextFrame()
    scrollRef = getScrollElement()

    if (!scrollRef || scrollRef.scrollHeight) {
      return scrollRef
    }
  }

  return scrollRef
}

export function useScroll(options: UseScrollOptions = {}): ScrollReturn {
  const { containerRef, elementId = 'scrollRef', threshold = 80, behavior = 'auto' } =
    options

  const getScrollElement = useCallback(() => {
    return containerRef?.current ?? document.getElementById(elementId)
  }, [containerRef, elementId])

  const scrollToBottom = useCallback(async () => {
    const scrollRef = await waitForReadyScrollElement(getScrollElement)
    if (scrollRef) {
      scrollRef.scrollTo({ top: scrollRef.scrollHeight, behavior })
    }
  }, [behavior, getScrollElement])

  const scrollToTop = useCallback(async () => {
    await nextFrame()
    const scrollRef = getScrollElement()
    if (scrollRef) {
      scrollRef.scrollTo({ top: 0, behavior })
    }
  }, [behavior, getScrollElement])

  const scrollToBottomIfAtBottom = useCallback(async () => {
    const scrollRef = await waitForReadyScrollElement(getScrollElement)
    if (scrollRef) {
      const distanceToBottom =
        scrollRef.scrollHeight - scrollRef.scrollTop - scrollRef.clientHeight
      if (distanceToBottom <= threshold) {
        scrollRef.scrollTo({ top: scrollRef.scrollHeight, behavior })
      }
    }
  }, [behavior, getScrollElement, threshold])

  return {
    scrollToBottom,
    scrollToTop,
    scrollToBottomIfAtBottom,
  };
}
