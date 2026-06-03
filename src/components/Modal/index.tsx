import { Modal } from '@douyinfe/semi-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ModalBaseProps = Omit<ComponentProps<typeof Modal>, 'title' | 'visible'>

export interface CommonModalProps extends ModalBaseProps {
  open?: boolean
  title?: ReactNode
  description?: ReactNode
  headerClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  bodyClassName?: string
  destroyOnHidden?: boolean
}

const CommonModal: React.FC<CommonModalProps> = ({
  open,
  title,
  description,
  headerClassName,
  titleClassName,
  descriptionClassName,
  children,
  centered = true,
  destroyOnHidden = true,
  footer = null,
  width = 520,
  ...rest
}) => {
  const modalTitle =
    title || description ? (
      <div className={cn('pr-[32px]', headerClassName)}>
        {title ? (
          <div
            className={cn(
              'text-[20px] font-semibold leading-[28px] text-primary',
              titleClassName,
            )}
          >
            {title}
          </div>
        ) : null}
        {description ? (
          <div
            className={cn(
              title ? 'mt-[8px]' : '',
              'text-[14px] leading-[22px] text-[#909090]',
              descriptionClassName,
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
    ) : null

  return (
    <Modal
      centered={centered}
      visible={open}
      keepDOM={!destroyOnHidden}
      footer={footer}
      maskClosable={true}
      title={modalTitle}
      width={width}
      {...rest}
    >
      {children}
    </Modal>
  )
}

export default CommonModal
