// Copyright 2019 OpenST Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// ----------------------------------------------------------------------------
//
// http://www.simpletoken.org/
//
// ----------------------------------------------------------------------------

'use strict';

const AbiBinProvider = require('../AbiBinProvider');

const UserWalletFactoryContractName = 'UserWalletFactory';

const ProxyFactoryContractName = 'ProxyFactory';

const THMasterCopyContractName = 'TokenHolder';

const TxSender = require('../../utils/TxSender');

/**
 * This is used to create wallet of an user and configure it.
 */
class User {
  /**
   * Constructor of User.
   *
   * @param gnosisSafeMasterCopy The address of a master copy of gnosis safe contract.
   * @param tokenHolderMasterCopy The address of a master copy of token holder contract.
   * @param eip20Token The address of an EIP20Token of an economy.
   * @param tokenRules The address of the token rules.
   * @param userWalletFactoryAddress Address of UserWalletFactory contract.
   * @param auxiliaryWeb3 Auxiliary chain web3 object.
   */
  constructor(
    gnosisSafeMasterCopy,
    tokenHolderMasterCopy,
    eip20Token,
    tokenRules,
    userWalletFactoryAddress,
    auxiliaryWeb3
  ) {
    const oThis = this;

    oThis.gnosisSafeMasterCopy = gnosisSafeMasterCopy;
    oThis.tokenHolderMasterCopy = tokenHolderMasterCopy;
    oThis.eip20Token = eip20Token;
    oThis.tokenRules = tokenRules;
    oThis.userWalletFactoryAddress = userWalletFactoryAddress;
    oThis.auxiliaryWeb3 = auxiliaryWeb3;

    oThis.abiBinProvider = new AbiBinProvider();
  }

  /**
   * Generate the executable data for setup method of GnosisSafe contract.
   *
   * @param owners List of owners of the multisig contract for a user.
   * @param threshold Number of required confirmations for a Safe transaction.
   * @param to Contract address for optional delegate call.
   * @param data Data payload for optional delegate call.
   *
   * @returns {String}
   */
  getGnosisSafeData(owners, threshold, to, data) {
    const oThis = this;

    return oThis.auxiliaryWeb3.eth.abi.encodeFunctionCall(
      {
        name: 'setup',
        type: 'function',
        inputs: [
          {
            type: 'address[]',
            name: '_owners'
          },
          {
            type: 'uint256',
            name: '_threshold'
          },
          {
            type: 'address',
            name: 'to'
          },
          {
            type: 'bytes',
            name: 'data'
          }
        ]
      },
      [owners, threshold, to, data]
    );
  }

  /**
   * Returns TokenHolder setup executable data.
   *
   * @param owner Owner address. Owner could be hardware wallet.
   * @param sessionKeys Array of session keys.
   * @param sessionKeysSpendingLimits Array of spending limits.
   * @param sessionKeysExpirationHeights Array of expiration heights.
   *
   * @returns {*}
   */
  getTokenHolderSetupExecutableData(owner, sessionKeys, sessionKeysSpendingLimits, sessionKeysExpirationHeights) {
    const oThis = this;
    const thMasterCopyAbi = oThis.abiBinProvider.getABI(THMasterCopyContractName);
    const tokenRuleContract = new oThis.auxiliaryWeb3.eth.Contract(thMasterCopyAbi, oThis.tokenHolderMasterCopy);
    return tokenRuleContract.methods
      .setup(
        oThis.eip20Token,
        oThis.tokenRules,
        owner,
        sessionKeys,
        sessionKeysSpendingLimits,
        sessionKeysExpirationHeights
      )
      .encodeABI();
  }

  /**
   * It is used for creation and configuration of gnosis safe and token holder proxy contract for user.
   *
   * @param owners List of owners of the multisig.
   * @param threshold Number of required confirmations for a Safe transaction.
   * @param to Contract address for optional delegate call.
   * @param data Data payload for optional delegate call.
   * @param sessionKeys Session key addresses to authorize.
   * @param sessionKeysSpendingLimits Session key's spending limits.
   * @param sessionKeysExpirationHeights Session key's expiration heights.
   * @param txOptions Tx options.
   *
   * @returns Promise object.
   */
  async createUserWallet(
    owners,
    threshold,
    to,
    data,
    sessionKeys,
    sessionKeysSpendingLimits,
    sessionKeysExpirationHeights,
    txOptions
  ) {
    const oThis = this;

    const txObject = oThis._createUserWalletRawTx(
      owners,
      threshold,
      to,
      data,
      sessionKeys,
      sessionKeysSpendingLimits,
      sessionKeysExpirationHeights
    );

    const txReceipt = await new TxSender(txObject, oThis.auxiliaryWeb3, txOptions).execute();

    return txReceipt;
  }

  /**
   * Method for creation and configuration of token holder proxy contract for company
   * with hardware wallet as it's owner.
   *
   * @param proxyFactory proxyFactory contract address.
   * @param owner TokenHolder proxy owner address. It could be hardware wallet address.
   * @param sessionKeys Session key addresses to authorize.
   * @param sessionKeysSpendingLimits Session key's spending limits.
   * @param sessionKeysExpirationHeights Session key's expiration heights.
   *
   * @returns Promise object.
   */
  async createCompanyWallet(
    proxyFactory,
    owner,
    sessionKeys,
    sessionKeysSpendingLimits,
    sessionKeysExpirationHeights,
    txOptions
  ) {
    const oThis = this;

    const txObject = oThis._createCompanyWalletRawTx(
      proxyFactory,
      owner,
      sessionKeys,
      sessionKeysSpendingLimits,
      sessionKeysExpirationHeights
    );

    const txReceipt = await new TxSender(txObject, oThis.auxiliaryWeb3, txOptions).execute();

    return txReceipt;
  }

  /**
   * Private method used for creation and configuration of gnosis safe and tokenholder contract for an user.
   *
   * @param owners List of owners of the multisig.
   * @param threshold Number of required confirmations for a Safe transaction.
   * @param to Contract address for optional delegate call.
   * @param data Data payload for optional delegate call.
   * @param sessionKeys Session key addresses to authorize.
   * @param sessionKeysSpendingLimits Session key's spending limits.
   * @param sessionKeysExpirationHeights Session key's expiration heights.
   * @private
   */
  _createUserWalletRawTx(
    owners,
    threshold,
    to,
    data,
    sessionKeys,
    sessionKeysSpendingLimits,
    sessionKeysExpirationHeights
  ) {
    const oThis = this;

    const gnosisSafeData = oThis.getGnosisSafeData(owners, threshold, to, data);

    const jsonInterface = oThis.abiBinProvider.getABI(UserWalletFactoryContractName),
      contract = new oThis.auxiliaryWeb3.eth.Contract(jsonInterface, oThis.userWalletFactoryAddress);

    return contract.methods.createUserWallet(
      oThis.gnosisSafeMasterCopy,
      gnosisSafeData,
      oThis.tokenHolderMasterCopy,
      oThis.eip20Token,
      oThis.tokenRules,
      sessionKeys,
      sessionKeysSpendingLimits,
      sessionKeysExpirationHeights
    );
  }

  /**
   * Private method used for creation and configuration of token holder proxy contract for company
   * with hardware wallet as it's owner.
   *
   * @param proxyFactory proxyFactory contract address.
   * @param owner TokenHolder proxy owner address. It could be hardware wallet address.
   * @param sessionKeys Session key addresses to authorize.
   * @param sessionKeysSpendingLimits Session key's spending limits.
   * @param sessionKeysExpirationHeights Session key's expiration heights.
   *
   * @returns Promise object.
   */
  _createCompanyWalletRawTx(proxyFactory, owner, sessionKeys, sessionKeysSpendingLimits, sessionKeysExpirationHeights) {
    const oThis = this;

    const thSetupExecutableData = oThis.getTokenHolderSetupExecutableData(
      owner,
      sessionKeys,
      sessionKeysSpendingLimits,
      sessionKeysExpirationHeights
    );

    const jsonInterface = oThis.abiBinProvider.getABI(ProxyFactoryContractName),
      contract = new oThis.auxiliaryWeb3.eth.Contract(jsonInterface, proxyFactory);

    return contract.methods.createProxy(oThis.tokenHolderMasterCopy, thSetupExecutableData);
  }
}

module.exports = User;
