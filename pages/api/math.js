const ethers = require('ethers')
const OffchainMathAbi = require('../../abis/OffchainMath.json')

const privateKey = process.env.BACKEND_SIGNER_PRIVATEKEY
const web3Provider = process.env.WEB3_PROVIDER
const omAddress = process.env.NEXT_PUBLIC_OFFCHAIN_MATH_ADDRESS

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(500).send('GET only')
  }

  const { address } = req.query

  if (!address) {
    return res.status(200).json({ error: 'no address provided', result: null, signature: null })
  }

  // wallets/providers/contracts stuff
  const provider = new ethers.providers.JsonRpcProvider(web3Provider)
  const backendSigner = new ethers.Wallet(privateKey, provider)
  const om = new ethers.Contract(omAddress, OffchainMathAbi, backendSigner)

  // ensuring if PENDING status now
  const status = await om.getStatus(address)
  if (status === '1') {
    return res.status(200).json({ error: 'not pending', result: null, signature: null })
  }

  // getting params from blockchain
  const [param1, param2] = await om.getParams(address)

  // DOING COMPLEX ROCKET-SCIENCE MATH
  const result = param1.add(param2)

  // signing
  let messageHash = ethers.utils.solidityKeccak256(
    ['address', 'uint', 'uint', 'uint'],
    [address, param1, param2, result]
  )
  let messageHashBinary = ethers.utils.arrayify(messageHash)
  let signature = await backendSigner.signMessage(messageHashBinary)

  // returning
  return res.status(200).json({ result: result.toString(), signature })
}
