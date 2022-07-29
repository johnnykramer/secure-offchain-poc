import React, { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { ethers } from 'ethers'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { toast } from 'react-toastify'
import OffchainMathAbi from '../abis/OffchainMath.json'
import usePoller from '../hooks/usePoller'
import axios from 'axios'

const omAddress = process.env.NEXT_PUBLIC_OFFCHAIN_MATH_ADDRESS
const rinkebyWeb3Provider = process.env.WEB3_PROVIDER
const scanBaseUrl = 'https://rinkeby.etherscan.io'
const statuses = ['IDLE', 'PENDING', 'DONE']

/**
 * HELPERS
 */

const uglifyAddress = (address, x = 10, y = 8) => {
  return `${address.substring(0, x)}...${address.substring(address.length - y, address.length)}`
}

const toastHash = (hash) => {
  return toast.success(`tx: ${uglifyAddress(hash)}`, {
    onClick: () => window.open(`${scanBaseUrl}/tx/${hash}`, '_blank'),
  })
}

/**
 * COMPONENT
 */
export default function Home() {
  const [web3Modal, setWeb3Modal] = useState(null)
  const [instance, setInstance] = useState(null)
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [isLoadingTx1, setIsLoadingTx1] = useState(false)
  const [isLoadingSign, setIsLoadingSign] = useState(false)
  const [isLoadingTx2, setIsLoadingTx2] = useState(false)
  const [status, setStatus] = useState(0)
  const [param1, setParam1] = useState('')
  const [param2, setParam2] = useState('')
  const [calcResult, setCalcResult] = useState('')

  useEffect(() => {
    const _web3Modal = new Web3Modal({
      network: 'rinkeby',
      cacheProvider: true,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            network: 'rinkeby',
            rpc: {
              4: rinkebyWeb3Provider,
            },
          },
        },
      },
    })
    setWeb3Modal(_web3Modal)
  }, [])

  useEffect(() => {
    if (web3Modal && web3Modal.cachedProvider) {
      connectWallet()
    }
  }, [web3Modal])

  useEffect(() => {
    if (!instance) return

    instance.on('accountsChanged', handleChangeAccounts)

    return () => {
      instance.removeListener('accountsChanged', handleChangeAccounts)
    }
  }, [instance])

  usePoller(async () => {
    if (!instance || !provider || !account) {
      return
    }

    await fetchData()
  }, [provider, account])

  const connectWallet = async () => {
    try {
      const _instance = await web3Modal.connect()
      const _provider = new ethers.providers.Web3Provider(_instance)
      const accounts = await _provider.listAccounts()
      if (accounts) setAccount(accounts[0])

      setInstance(_instance)
      setProvider(_provider)
    } catch (e) {
      console.error(e)
    }
  }

  const handleChangeAccounts = async (accounts) => {
    if (accounts) {
      setAccount(accounts[0])
      await fetchData()
    }
  }

  const disconnectWallet = async () => {
    await web3Modal.clearCachedProvider()
    setAccount(null)
  }

  const handleChangeParam1 = (e) => {
    if (e.target.value === '' || isNaN(+e.target.value)) {
      setParam1('')
    } else {
      setParam1(e.target.value)
    }
  }

  const handleChangeParam2 = (e) => {
    if (e.target.value === '' || isNaN(+e.target.value)) {
      setParam2('')
    } else {
      setParam2(e.target.value)
    }
  }

  const fetchData = async () => {
    const signer = provider.getSigner()
    const om = new ethers.Contract(omAddress, OffchainMathAbi, signer)

    const _status = await om.getStatus(account)
    setStatus(_status.toString())

    console.info('DATA RE-FETCHED')
  }

  const firstTx = async () => {
    try {
      const signer = provider.getSigner()
      const om = new ethers.Contract(omAddress, OffchainMathAbi, signer)

      setIsLoadingTx1(true)
      const tx1 = await om.first(ethers.utils.parseEther(param1), ethers.utils.parseEther(param2))
      toastHash(tx1.hash)
      await tx1.wait()
      setIsLoadingTx1(false)

      await fetchData()
    } catch (e) {
      console.error(e)
      toast.error(e.reason || e.message)
    }
    setIsLoadingTx1(false)
  }

  const secondTx = async () => {
    try {
      const signer = provider.getSigner()
      const om = new ethers.Contract(omAddress, OffchainMathAbi, signer)

      setIsLoadingSign(true)
      const [result, signature] = await sign()
      setIsLoadingSign(false)

      if (result && signature) {
        setIsLoadingTx2(true)
        const tx2 = await om.second(result, signature)
        toastHash(tx2.hash)
        await tx2.wait()

        const _calcResult = await om.getResult(account)
        setCalcResult(ethers.utils.formatEther(_calcResult))
        setIsLoadingTx2(false)
      }

      await fetchData()
    } catch (e) {
      console.error(e)
      toast.error(e.reason || e.message)
    }
    setIsLoadingTx2(false)
    setIsLoadingSign(false)
  }

  const sign = async () => {
    try {
      const { error, result, signature } = (
        await axios({
          method: 'GET',
          url: '/api/math',
          params: {
            address: account,
          },
        })
      ).data

      // console.log({ error, result, signature })

      if (error) {
        toast.error(`SIGNER ERROR: ${error}`)
        return [null, null]
      }

      return [result, signature]
    } catch (e) {
      toast.error(e.reason || e.message)
      return [null, null]
    }
  }

  return (
    <div className="w-full">
      <Head>
        <title>secure-offchain-poc</title>
      </Head>

      <div className="w-full max-w-3xl flex flex-col items-center mx-auto my-0 sm:my-10">
        <h1 className="font-bold text-4xl text-blue-900">secure-offchain-poc</h1>

        <div className="mt-5 flex flex-col items-center">
          {!account ? (
            <button
              className="border border-dotted w-max bg-white border-blue-700 text-blue-900 font-semibold rounded-md p-2"
              onClick={connectWallet}
            >
              CONNECT WALLET
            </button>
          ) : (
            <button
              className="border border-dotted w-max bg-white border-blue-700 text-blue-900 font-semibold rounded-md p-2 break-words"
              onClick={disconnectWallet}
            >
              {uglifyAddress(account)}
            </button>
          )}
        </div>

        {account && (
          <div className="w-full flex flex-col items-center justify-center gap-5">
            <div className="mt-10 max-w-xs w-full flex flex-col gap-2 items-center border border-dotted border-blue-700 p-3 rounded-md">
              <h2 className="text-2xl font-semibold underline decoration-dotted text-blue-900">Status</h2>
              <p className="text-blue-900">{statuses[status]}</p>
            </div>

            <div className="max-w-xs w-full flex flex-col gap-2 items-center border border-dotted border-blue-700 p-3 rounded-md">
              <h2 className="text-2xl font-semibold underline decoration-dotted text-blue-900">First tx</h2>

              <div className="flex flex-row">
                <input
                  className="m-1 w-1/2 p-2 border border-blue-700 border-dotted rounded-md"
                  placeholder="Param1"
                  value={param1}
                  onChange={handleChangeParam1}
                  disabled={isLoadingTx1 || status === '1'}
                />
                <input
                  className="m-1 w-1/2 p-2 border border-blue-700 border-dotted rounded-md"
                  placeholder="Param2"
                  value={param2}
                  onChange={handleChangeParam2}
                  disabled={isLoadingTx1 || status === '1'}
                />
              </div>
              <button
                className="w-full border bg-blue-500 text-white text-xl font-semibold rounded-md p-2 disabled:bg-gray-500 disabled:opacity-70"
                onClick={firstTx}
                disabled={isLoadingTx1 || status === '1'}
              >
                {isLoadingTx1 ? (
                  <div>
                    Pending first tx...<div className="inline-block animate-spin">↻</div>
                  </div>
                ) : (
                  <div>Set input data</div>
                )}
              </button>
            </div>

            <div className="max-w-xs w-full flex flex-col gap-2 items-center border border-dotted border-blue-700 p-3 rounded-md">
              <h2 className="text-2xl font-semibold underline decoration-dotted text-blue-900">Second tx</h2>
              <button
                className="w-full border bg-blue-500 text-white text-xl font-semibold rounded-md p-2 disabled:bg-gray-500 disabled:opacity-70"
                onClick={secondTx}
                disabled={isLoadingTx2 || isLoadingSign || status === '0'}
              >
                {isLoadingSign ? (
                  <div>
                    Calculating and signing...<div className="inline-block animate-spin">↻</div>
                  </div>
                ) : isLoadingTx2 ? (
                  <div>
                    Pending second tx...<div className="inline-block animate-spin">↻</div>
                  </div>
                ) : (
                  <div>Do off-chain math</div>
                )}
              </button>
            </div>

            {status === '0' && calcResult > 0 && (
              <div className="max-w-xs w-full flex flex-col gap-2 items-center border border-dotted border-blue-700 p-3 rounded-md">
                <h2 className="text-2xl font-semibold underline decoration-dotted text-blue-900">Result</h2>
                <p className="text-blue-900">{calcResult}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
