import { useState, useEffect } from 'react'

const BALANCES_POLLING_INTERVAL = 15000

const usePoller = (func = async () => {}, deps = [], options = {}) => {
  const [isFetching, setIsFetching] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [isInitiated, setIsInitiated] = useState(false)

  const pollingInterval = options.pollingInterval || BALANCES_POLLING_INTERVAL

  useEffect(() => {
    // console.log('[usePoller] polling started')
    // console.log({ ...deps })
    let poller = null
    if (deps[0] && deps[1]) {
      if (!isInitiated) {
        run()
      }
      poller = setInterval(run, pollingInterval)
      setIsPolling(true)
      setIsInitiated(true)
    }

    return () => {
      if (poller) {
        clearInterval(poller)
        setIsPolling(false)
        // console.log('[usePoller] polling ended')
      }
    }
  }, [...deps])

  const run = async () => {
    setIsFetching(true)
    // console.log('[usePoller] fetching started')
    try {
      await func()
    } catch (e) {
      console.info('[usePoller] Error:', e.message)
    }
    setIsFetching(false)
    // console.log('[usePoller] fetching ended')
  }

  return [isFetching, isPolling]
}

export default usePoller
