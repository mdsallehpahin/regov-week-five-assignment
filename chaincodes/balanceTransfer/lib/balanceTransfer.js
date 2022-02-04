'use strict'
const { Contract } = require('fabric-contract-api');
const accountObjType = 'Account';
class BalanceTransfer extends Contract {
  async initAccount(ctx, identity, balance) {
    const accountBalance = parseFloat(balance)
    if (accountBalance < 0) {
      throw new Error(`account balance cannot be negative`);
    }
    const account = {
      id: identity,
      owner: JSON.parse(await this._getTxCreatorUID(ctx)),
      balance: accountBalance,
    }
    if (await this._accountExists(ctx, account.id)) {
      throw new Error(`the account ${account.id} already exists`);
    }
    await this._putAccount(ctx, account);
    return account;
  }

  async setBalance(ctx, id, newBalance) {
        const exists = await this._accountExists(ctx, id);
        if (!exists) {
            throw new Error('Account not found.');
        }
        let account = await this._getAccount(ctx, id);
        account.balance = parseFloat(newBalance);
        if (account.balance < 0) {
          throw new Error(`account balance cannot be negative`);
        }
        const compositeKey = ctx.stub.createCompositeKey(accountObjType, [id]);
        return ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(account)));
  }
  async transfer(ctx, idFrom, idTo, amount) {
        const idFromExist = await this._accountExists(ctx, idFrom);
        const idToExist = await this._accountExists(ctx, idTo);
        if (!idFromExist || !idToExist) {
            throw new Error('Transfer require two end to exist.');
        }
        const owner = JSON.parse((await this._getTxCreatorUID(ctx)));
        const regex = /(?<=CN=)(.*)(?=::)/gi;
        let currentUser = JSON.stringify(owner.id.match(regex)[0]);

        let account1 = await this._getAccount(ctx, idFrom);
        let fromUser = JSON.stringify(account1.owner.id.match(regex)[0]);

        if(fromUser !== currentUser){
          throw new Error('Unauthorized access.');
        }
        amount = parseFloat(amount);
        account1.balance = account1.balance-amount;
        const compositeKey1 = ctx.stub.createCompositeKey(accountObjType, [idFrom]);
        ctx.stub.putState(compositeKey1, Buffer.from(JSON.stringify(account1)));

        let account2 = await this._getAccount(ctx, idTo);
        const compositeKey2 = ctx.stub.createCompositeKey(accountObjType, [idTo]);
        account2.balance = account2.balance+amount;
        ctx.stub.putState(compositeKey2, Buffer.from(JSON.stringify(account2)));
  }

  async listAccounts(ctx) {
    const owner = JSON.parse((await this._getTxCreatorUID(ctx)).toString());
    if(!owner){            
      throw new Error('Unable to obtain current user.');
    };
    let regex = /(?<=CN=)(.*)(?=::)/gi;
    let resultMatchGroup = JSON.stringify(owner.id.match(regex)[0]);
    owner.mspid = JSON.stringify(owner.mspid);
    if(resultMatchGroup){
      const queryString = `{"selector":{"$and":[{"owner": {"id":{"$regex": ${resultMatchGroup}}}}, {"owner": {"mspid":{"$regex": ${owner.mspid}}}}]}}`;
      return this._getResultsForQueryString(ctx, queryString);
    }
    return [];
  }

  async customQuery(ctx, queryString) {
    return this._getResultsForQueryString(ctx, queryString)
  }

  async getAccount(ctx, id) {
    return this._getAccount(ctx, id);
  };

  async _accountExists(ctx, id) {
    const compositeKey = ctx.stub.createCompositeKey(accountObjType, [id]);
    const accountBytes = await ctx.stub.getState(compositeKey);
    return accountBytes && accountBytes.length > 0;
  }
  async _getAccount(ctx, id) {
    const compositeKey = ctx.stub.createCompositeKey(accountObjType, [id]);
    const accountBytes = await ctx.stub.getState(compositeKey);
    return JSON.parse(accountBytes.toString());
  }
  async _putAccount(ctx, account) {
    const compositeKey = ctx.stub.createCompositeKey(accountObjType, [account.id]);
    console.log(Buffer.from(JSON.stringify(account)));
    await ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(account)));
  }

  async _getTxCreatorUID(ctx) {
    return JSON.stringify({
      mspid: ctx.clientIdentity.getMSPID(),
      id: ctx.clientIdentity.getID(),
    });
  }
  async _getResultsForQueryString(ctx, queryString) {
    const iteratorPromise = ctx.stub.getQueryResult(queryString)
    const results = []
    for await (const res of iteratorPromise) {
      results.push(JSON.parse(res.value.toString()))
    } return JSON.stringify(results)
  }
}
module.exports = BalanceTransfer
