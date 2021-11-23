import React, {useMemo, useCallback} from 'react';
import {WalletNotConnectedError} from '@solana/wallet-adapter-base';
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {SystemProgram, Transaction} from '@solana/web3.js';
import {ConnectionProvider, WalletProvider} from '@solana/wallet-adapter-react';
import {WalletAdapterNetwork} from '@solana/wallet-adapter-base';
import bs58 from 'bs58';
import {sign} from 'tweetnacl';
import Typewriter from 'typewriter-effect';
import {PublicKey, TransactionInstruction} from '@solana/web3.js';
import {
  getLedgerWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletExtensionWallet,
  getSolletWallet,
  getTorusWallet,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import {clusterApiUrl, Connection, LAMPORTS_PER_SOL} from '@solana/web3.js';
import * as borsh from 'borsh';
import {Button} from '@solana/wallet-adapter-react-ui/lib/Button';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

const PROGRAM_ID = 'DW6HET1JQjkMsszJK1pXdJWhs6enSYBgyMXq9zz4qtzP';
const RANDOM_MAX = 1000;

class GreetingAccount {
  random = 0;
  counter = 0;
  constructor(counter, random) {
    this.counter = counter;
    this.random = random;
  }
}
const GreetingSchema = new Map([
  [
    GreetingAccount,
    {
      kind: 'struct',
      fields: [
        ['counter', 'u32'],
        ['random', 'u32'],
      ],
    },
  ],
]);
class HelloAccount {
  counter = 0;
  constructor(counter) {
    this.counter = counter;
  }
}
const HelloSchema = new Map([
  [HelloAccount, {kind: 'struct', fields: [['counter', 'u32']]}],
]);

const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount(),
).length;

let connection = null;

const establishConnection = async () => {
  const rpcUrl = 'https://api.devnet.solana.com';
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
};

const establishPayer = async publicKey => {
  let fees = 0;
  // if (!payer) {
  //   const {feeCalculator} = await connection.getRecentBlockhash();

  //   // Calculate the cost to fund the greeter account
  //   fees += await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);

  //   // Calculate the cost of sending transactions
  //   fees += feeCalculator.lamportsPerSignature * 100; // wag
  //   payer = utils.getPayer();
  // }

  let lamports = await connection.getBalance(publicKey);
  if (lamports < fees) {
    // If current balance is not enough to pay for fees, request an airdrop
    const sig = await connection.requestAirdrop(publicKey, fees - lamports);
    await connection.confirmTransaction(sig);
    lamports = await connection.getBalance(publicKey);
  }

  console.log(
    'Using account',
    publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
};

const checkProgram = async (payerPublicKey, sendTransaction) => {
  // Check if the program has been deployed
  console.log(`get payer public key ${payerPublicKey}`);

  const programId = new PublicKey(PROGRAM_ID);

  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    throw new Error('Program get fail');
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);

  // Derive the address (public key) of a greeting account from the program so that it's easy to find later.
  const GREETING_SEED = 'hello';
  const greetedPubkey = await PublicKey.createWithSeed(
    payerPublicKey,
    GREETING_SEED,
    programId,
  );

  // Check if the greeting account has already been created
  const greetedAccount = await connection.getAccountInfo(greetedPubkey);
  if (greetedAccount === null) {
    console.log('Creating account', greetedPubkey.toBase58());
    const lamports = await connection.getMinimumBalanceForRentExemption(
      GREETING_SIZE,
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payerPublicKey,
        basePubkey: payerPublicKey,
        seed: GREETING_SEED,
        newAccountPubkey: greetedPubkey,
        lamports,
        space: GREETING_SIZE,
        programId,
      }),
    );

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, 'processed');
  }
};

// function TestWallet() {
//   const {publicKey, sendTransaction} = useWallet();

//   const requestTestWallet = useCallback(() => {
//     if (publicKey) {
//       window.alert(`以連接上Wallet!${publicKey.toBase58()}`);
//     } else {
//       window.alert(`請先連接Wallet`);
//     }
//   });

//   return <button onClick={requestTestWallet}>測試Wallet連接</button>;
// }

// function SignMessageButton() {
//   const {publicKey, signMessage} = useWallet();

//   const onClick = useCallback(async () => {
//     try {
//       // `publicKey` will be null if the wallet isn't connected
//       if (!publicKey) throw new Error('Wallet not connected!');
//       // `signMessage` will be undefined if the wallet doesn't support it
//       if (!signMessage)
//         throw new Error('Wallet does not support message signing!');

//       // Encode anything as bytes
//       const message = new TextEncoder().encode('Hello, world!');
//       // Sign the bytes using the wallet
//       const signature = await signMessage(message);
//       // Verify that the bytes were signed using the private key that matches the known public key
//       if (!sign.detached.verify(message, signature, publicKey.toBytes()))
//         throw new Error('Invalid signature!');

//       alert(`Message signature: ${bs58.encode(signature)}`);
//     } catch (error) {
//       alert(`Signing failed: ${error?.message}`);
//     }
//   }, [publicKey, signMessage]);

//   return signMessage ? (
//     <button onClick={onClick} disabled={!publicKey}>
//       Sign Message
//     </button>
//   ) : null;
// }

// function SignTransactionButton() {
//   const {publicKey, sendTransaction, connection} = useWallet();

//   const onClick = useCallback(async () => {
//     try {
//       // `publicKey` will be null if the wallet isn't connected
//       if (!publicKey) throw new Error('Wallet not connected!');
//       // `signMessage` will be undefined if the wallet doesn't support it
//       if (!sendTransaction)
//         throw new Error('Wallet does not support message signing!');

//       const programId = new PublicKey(PROGRAM_ID);
//       const GREETING_SEED = 'hello';
//       const greetedPubkey = await PublicKey.createWithSeed(
//         publicKey,
//         GREETING_SEED,
//         programId,
//       );

//       const helloAccount = new HelloAccount(RANDOM_MAX);
//       const hello = borsh.serialize(HelloSchema, helloAccount);
//       const instruction = new TransactionInstruction({
//         keys: [{pubkey: greetedPubkey, isSigner: false, isWritable: true}],
//         programId,
//         data: Buffer.from(hello),
//       });

//       await sendTransaction(new Transaction().add(instruction), connection);
//     } catch (error) {
//       alert(`Signing failed: ${error?.message}`);
//     }
//   }, [publicKey, sendTransaction, connection]);

//   return sendTransaction ? (
//     <button onClick={onClick} disabled={!publicKey}>
//       Sign Transaction
//     </button>
//   ) : null;
// }

const getGreeting = async (seed, publicKey, programId) => {
  return await PublicKey.createWithSeed(publicKey, seed, programId);
};

const SendRequestForLottery = () => {
  const {connection} = useConnection();
  const {publicKey, sendTransaction} = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) return;

    console.log(`- 取得payer public key: ${publicKey}`);

    console.log(`- 連接鏈中...`);
    await establishConnection();

    console.log(`- 取得支付手續費使用者資訊...`);
    await establishPayer(publicKey);

    console.log(`- 檢查program...`);
    await checkProgram(publicKey, sendTransaction);

    setTimeout(async () => {
      const programId = new PublicKey(PROGRAM_ID);
      const greetedPubkey = await getGreeting('hello', publicKey, programId);

      const helloAccount = new HelloAccount(RANDOM_MAX);
      const hello = borsh.serialize(HelloSchema, helloAccount);
      const instruction = new TransactionInstruction({
        keys: [{pubkey: greetedPubkey, isSigner: false, isWritable: true}],
        programId,
        data: Buffer.from(hello),
      });

      let transaction = new Transaction().add(instruction);

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, 'processed');

      await reportGreetings(publicKey);
    }, 2000);
  }, [publicKey, sendTransaction, connection]);

  return (
    <div>
      <Typewriter
        style={{'font-size': '100vw'}}
        onInit={typewriter => {
          typewriter
            .typeString('Solana Program 運行中...')
            .pauseFor(2500)
            .deleteAll()
            .typeString('下一位演講者是...')
            .pauseFor(2500)
            .deleteAll()
            .callFunction(() => {
              console.log('All strings were deleted');
            })
            .start();
        }}
      />
      <button onClick={onClick}>進行抽籤</button>
    </div>
  );
};

const reportGreetings = async publicKey => {
  const programId = new PublicKey(PROGRAM_ID);
  const greetedPubkey = await getGreeting('hello', publicKey, programId);
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (accountInfo === null) {
    throw new Error('Error: cannot find the greeted account');
  }
  const greeting = borsh.deserialize(
    GreetingSchema,
    GreetingAccount,
    accountInfo.data,
  );
  console.log(
    greetedPubkey.toBase58(),
    'time(s):',
    greeting.counter,
    'random:',
    greeting.random,
  );
  return greeting.random;
};

function Main() {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking --
  // Only the wallets you configure here will be compiled into your application
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSlopeWallet(),
      getSolflareWallet(),
      getTorusWallet({
        options: {clientId: 'Get a client ID @ https://developer.tor.us'},
      }),
      getLedgerWallet(),
      getSolletWallet({network}),
      getSolletExtensionWallet({network}),
    ],
    [network],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* <WalletDisconnectButton /> */}
          {/* <SignMessageButton /> */}
          {/* <SignTransactionButton /> */}
          <SendRequestForLottery />
          <WalletMultiButton />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default Main;
