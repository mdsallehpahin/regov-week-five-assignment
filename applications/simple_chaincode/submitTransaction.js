'use strict';

const fs = require('fs');
const yaml = require('js-yaml');
const { Wallets, Gateway } = require('fabric-network');
const util = require('util');

        
let main = async() =>{ 
const wallet = await Wallets.newFileSystemWallet('./identity/user/balaji/wallet');
const userName = 'user01';
let connectionProfile = yaml.safeLoad(fs.readFileSync('./gateway/connection-org1.yaml', 'utf8'));
let connectionOptions = {
    identity: userName,
    wallet: wallet,
    discovery: { enabled: true, asLocalhost: true }
};

const gateway = new Gateway();
try {
    await gateway.connect(connectionProfile, connectionOptions);
} catch (error) {
    console.log(error);
    return;
}
var args = process.argv;
if(args.length<5){
    throw new Error('Not enough argument.');
}
let functionName = args[3];
let chaincodeArgs = args.length===6 ? [args[4], args[5]]: [args[4], args[5], args[6]];

console.log('Use channel "mychannel".');
const network = await gateway.getNetwork('mychannel');
console.log('Add block listener.');
const blockListener = await network.addBlockListener(async (blockEvent) => {
    console.log();
    console.log('-----------------Block listener-----------------');
    console.log(`************************************************`);console.log(`Block header: ${util.inspect(blockEvent.blockData.header,{showHidden: false, depth: 5})}`);
    console.log(`************************************************`);
    console.log(`Block data: ${util.inspect(blockEvent.blockData.data,{showHidden: false, depth: 5})}`);
    console.log(`************************************************`);
    console.log(`Block metadata: ${util.inspect(blockEvent.blockData.metadata, {showHidden: false, depth:5})}`);
    console.log(`************************************************`);
    console.log('------------------------------------------------');
    console.log();
});

console.log('Use SimpleContract.');
const contract = network.getContract('simpleChaincode');
console.log('Add contract listener.');
const contractListener = await contract.addContractListener(async (contractEvent) => {
    console.log();
    console.log('---------------Contract listener----------------');
    console.log(`Event name: ${contractEvent.eventName}, payload: ${contractEvent.payload.toString()}`);
    console.log('------------------------------------------------');
    console.log();
}
);

console.log('Add commit listener.');
let tx = contract.createTransaction(functionName);

const commitListener = await network.addCommitListener((error, commitEvent) => {
    console.log();
    console.log('----------------Commit listener-----------------');
    if (error) {
        console.error(error);
        return;
    }
    console.log(`Transaction ${commitEvent.transactionId} status: ${commitEvent.status}`);
    console.log('------------------------------------------------');
    console.log();
    }, network.getChannel().getEndorsers(), tx.getTransactionId()
);

console.log('Submit ' + functionName + ' transaction.');
const response = await tx.submit(...chaincodeArgs);

setTimeout(() => {
    if (`${response}` !== '') {
        console.log(`Response from ${functionName}: ${response}`);
    }
}, 20000);
};

main();