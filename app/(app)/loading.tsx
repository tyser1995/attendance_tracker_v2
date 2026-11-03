import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Renders inside the app layout, so the sidebar and top bar stay in place while a page loads.
export default function Loading() {
  return <LoadingSpinner />
}
