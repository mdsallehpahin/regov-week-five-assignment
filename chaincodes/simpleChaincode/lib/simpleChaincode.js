'use strict'
const { Contract } = require('fabric-contract-api')

class SimpleChaincode extends Contract {
  async emitEvent(ctx, name, payload) {
    ctx.stub.setEvent(name, Buffer.from(payload));
  }
  async put(ctx, recordObjType, id, val) {
    const record = {
      id,
      value: val,
    };
    const compositeKey = ctx.stub.createCompositeKey(recordObjType, [id])
    const recordBytes = ctx.stub.getState(compositeKey)
    if (recordBytes && recordBytes.length > 0) {
      throw new Error(`The record ${record.id} already exists`)
    }
    await ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(record)))
  }
}
module.exports = SimpleChaincode


