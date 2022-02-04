'use strict'
const { Contract } = require('fabric-contract-api')

const lotObjType = 'Lot';
const bidObjType = 'Bid';
const LotStatus = {
  ForSale: 1,
};

class BlindAuction extends Contract {
  async offerForSale(ctx, lotID, lotDescription, minimalBid) {
    const lot = {
      id: lotID,
      desc: lotDescription,
      minimalBid,
      status: 1,
      seller: await ctx.clientIdentity.getMSPID(),
    }
    await this._putAsset(ctx, lotObjType, lot, '');
  }
  async placeBid(ctx, lotID, price) {
    const lot = await this._getAsset(ctx, lotObjType, lotID);
    if (lot.status !== LotStatus.ForSale) {
      throw new Error(`bid cannot be placed for a lot that is not offered for sale`);
    }

    if (lot.seller === ctx.clientIdentity.getMSPID()) {
      throw new Error(`bid cannot be placed for your own lot`);
    }
    const transient = ctx.stub.getTransient();
    price = parseFloat(transient.get('price').toString());
    if (price < lot.minimalBid) {
      throw new Error(`price cannot be less then the minimal bid`);
    }

    const bid = {
      id: lotID,
      bidder: ctx.clientIdentity.getMSPID(),
      price,
    };
    console.log(lot.seller);
    console.log(bid.bidder);

    const collection = await this._composeCollectionName(lot.seller, bid.bidder);
    console.log(collection);
    if (await this._assetExists(ctx, bidObjType, bid.id, collection)) {
      throw new Error(`the bid ${bid.id} already exists`);
    }
    await this._putAsset(ctx, bidObjType, bid, collection);
  }
  async closeBidding(ctx, lotID) {
    const lot = await this._getAsset(ctx, lotObjType, lotID);
    const bids = await this._getBidsForLot(ctx, lot);
    if (bids.length === 0) {
      lot.status = LotStatus.Withdrawn;
    } else {
      bids.sort((bid1, bid2) => bid2.price - bid1.price);
      const bestBid = bids[0];
      lot.status = LotStatus.Sold;
      lot.buyer = bestBid.bidder; lot.hammerPrice = bestBid.price;
    }
    await this._putAsset(ctx, lotObjType, lot);
  }
  async listBids(ctx, lotID) {
    const lot = await this._getAsset(ctx, lotObjType, lotID);
    return this._getBidsForLot(ctx, lot);
  }
  async listLotsForSale() {}
  async listSoldLots() {}
  async listWithdrawnLots() {}

  async _assetExists(ctx, assetObjType, id, collection = '') {
    const compositeKey = ctx.stub.createCompositeKey(assetObjType, [id]);
    let assetBytes;
    collection = collection || '';
    if (collection === '') {
      assetBytes = await ctx.stub.getState(compositeKey);
    } else {
      assetBytes = await ctx.stub.getPrivateData(collection, compositeKey);
    }
    return assetBytes && assetBytes.length > 0;
  }
  async _getAsset(ctx, assetObjType, id, collection = '') {
    const compositeKey = ctx.stub.createCompositeKey(assetObjType, [id]);
    let assetBytes;
    collection = collection || '';
    if (collection === '') {
      assetBytes = await ctx.stub.getState(compositeKey);
    } else {
      assetBytes = await ctx.stub.getPrivateData(collection, compositeKey);
    }
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`the asset ${assetObjType} with ID ${id} does not exists`);
    }
    return JSON.parse(assetBytes.toString());
  }
  async _putAsset(ctx, assetObjType, asset, collection = '') {
    const compositeKey = ctx.stub.createCompositeKey(assetObjType, [asset.id]);
    collection = collection || '';
    if (collection === '') {
      await ctx.stub.putState(compositeKey, Buffer.from(JSON.stringify(asset)));
    } else {
      await ctx.stub.putPrivateData(collection,
        compositeKey, Buffer.from(JSON.stringify(asset)));
    }
  }
  async _composeCollectionName(org1, org2) {
    return [org1, org2].sort().join('-');
  }
  async _getResultsForQueryString(ctx, queryString) {
    const iteratorPromise = ctx.stub.getQueryResult(queryString)
    const results = []
    for await (const res of iteratorPromise) {
      results.push(JSON.parse(res.value.toString()))
    } return JSON.stringify(results)
  }

  async _getBidsForLot(ctx, lot) {
    const id = JSON.stringify(lot.id);
    const queryString = `{"selector":{}}`;
    return this._getResultsForQueryString(ctx, queryString);
  }
}


module.exports = BlindAuction


