'use client'

import { useEffect, useState } from 'react'

/**
 * Formats a date in the viewer's own locale and timezone. Rendered after mount so the
 * server (often UTC) and the browser (e.g. IST) never disagree during hydration.
 */
export function LocalDate({ value, options }: { value: string | number | Date; options?: Intl.DateTimeFormatOptions }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => setText(new Date(value).toLocaleString(undefined, options)), [value, options])
  return <span suppressHydrationWarning>{text ?? ' '}</span>
}
