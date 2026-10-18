'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { Button, Modal } from './ui'

export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Red button and warning icon for destructive actions */
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

/**
 * In-app replacement for window.confirm(): `if (!(await confirm({ title: 'Delete?' }))) return`.
 * One dialog for the whole app, styled like the rest of the UI.
 */
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false)
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)} title={opts?.title ?? ''}>
        {opts && (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${opts.danger ? 'bg-rose-hot/15 text-rose-hot' : 'bg-sky-live/15 text-sky-live'}`}>
                {opts.danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
              </div>
              {opts.message && <div className="pt-1 text-sm leading-relaxed text-ink-200">{opts.message}</div>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>{opts.cancelLabel ?? 'Cancel'}</Button>
              <Button variant={opts.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>{opts.confirmLabel ?? 'Confirm'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}
