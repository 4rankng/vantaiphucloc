import * as React from 'react'
import { isOnline, onNetworkChange } from '@lib/network'

export function useNetwork(): {
  isOnline: boolean
  wasOffline: boolean
} {
  const [isOnlineState, setIsOnline] = React.useState(isOnline())
  const [wasOffline, setWasOffline] = React.useState(false)

  React.useEffect(() => {
    return onNetworkChange((online) => {
      if (!online) setWasOffline(true)
      setIsOnline(online)
    })
  }, [])

  return { isOnline: isOnlineState, wasOffline }
}
