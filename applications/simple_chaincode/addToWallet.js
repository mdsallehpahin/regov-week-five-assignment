'use strict';

const fs = require('fs');
const { Wallets } = require('fabric-network');
const path = require('path');


async function main() {
    try {
        const wallet = await Wallets.newFileSystemWallet('./identity/user/balaji/wallet');
        const credPath = '../../../test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com'
        const certificate = fs.readFileSync(path.join(credPath, '/msp/signcerts/User1@org1.example.com-cert.pem')).toString();
        const privateKey = fs.readFileSync(path.join(credPath, '/msp/keystore/priv_sk')).toString();

        const identityLabel = 'user01';
        const identity = {
            credentials: {
                certificate,
                privateKey
            },
            mspId: 'Org1MSP',
            type: 'X.509'
        }
        await wallet.put(identityLabel, identity);
    } catch (error) {
        console.log(`Error adding to wallet. ${error}`);
        console.log(error.stack);
    }
}

main();
