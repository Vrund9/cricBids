import { redirect } from 'next/navigation'

/** The theme moved to Settings → Theme; old links land there with this tournament selected. */
export default async function ThemeRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/account/theme?t=${id}`)
}
