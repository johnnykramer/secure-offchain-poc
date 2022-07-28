require('dotenv').config()
require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')

const config = {
  solidity: {
    version: '0.8.15',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    rinkeby: {
      url: process.env.WEB3_PROVIDER,
      accounts: [process.env.BACKEND_SIGNER_PRIVATEKEY || ''],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
}

module.exports = config
