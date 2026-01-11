'use client'

import * as React from 'react'
import { MinusIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type InputOTPProps = React.ComponentProps<'input'> & {
  containerClassName?: string
  length?: number
}

/**
 * Dependency-free OTP input shim.
 * This project’s Vite build does not include `input-otp`; this keeps TS/build green.
 */
function InputOTP({ className, containerClassName, length = 6, ...props }: InputOTPProps) {
  return (
    <div
      data-slot="input-otp"
      className={cn('flex items-center gap-2 has-disabled:opacity-50', containerClassName)}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          inputMode="numeric"
          maxLength={1}
          className={cn(
            'h-9 w-9 rounded-md border border-input bg-background text-center text-sm shadow-xs',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            className,
          )}
          {...props}
        />
      ))}
    </div>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn('flex items-center', className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  index: number
}) {
  return (
    <div
      data-slot="input-otp-slot"
      data-active={false}
      className={cn(
        'data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]',
        className,
      )}
      {...props}
    >
      {index + 1}
    </div>
  )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
