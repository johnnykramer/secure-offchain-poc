const main = async () => {
  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS

  const OffchainMath = await hre.ethers.getContractFactory('OffchainMath')
  const offchainMath = await OffchainMath.deploy(backendSignerAddress)
  await offchainMath.deployed()

  console.log('Contract is deployed to:', offchainMath.address)
}

const runMain = async () => {
  try {
    await main()
  } catch (error) {
    console.log(error)
  }
}

runMain()
