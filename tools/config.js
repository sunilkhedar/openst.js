module.exports = {
  chain: {
    chainId: 1000,
    networkId: 1000,
    gethFolder: '/origin-geth',
    allocAmount: '90000000000000000000000000000000000000000', // in base currency
    gas: 8000000,
    gasprice: '0x3B9ACA00',
    genesisFileTemplatePath: './genesis.json',
    genesisFilePath: '/genesis.json',
    geth: {
      host: '127.0.0.1',
      rpcport: 8545,
      wsport: 8546,
      port: 3010
    }
  }
};
