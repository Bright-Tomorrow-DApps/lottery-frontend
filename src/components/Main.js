import React, { useMemo, useCallback, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { default as MButton } from "@mui/material/Button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Grid from "@mui/material/Grid";
import { SystemProgram, Transaction } from "@solana/web3.js";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import Typewriter from "typewriter-effect";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  getLedgerWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletExtensionWallet,
  getSolletWallet,
  getTorusWallet,
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as borsh from "borsh";
import { Button } from "@solana/wallet-adapter-react-ui/lib/Button";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

// devnet production
const PROGRAM_ID = "JA6TgMfnxhRFuDuAfsinkgMuxWk7Kmy6EQrwZ3Psb1in";
const RPC_URL = "https://api.devnet.solana.com";

// devnet test
// const PROGRMA_ID = "3dAAsmoJKWzvuaWhjcUXKmE3V2eAicokxYDQdtc5pNpa";
// const RPC_URL = "https://api.devnet.solana.com";

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
      kind: "struct",
      fields: [
        ["counter", "u32"],
        ["random", "u32"],
      ],
    },
  ],
]);
class InstructionData {
  constructor(counter, lottery_content) {
    if (!lottery_content) {
      lottery_content = "";
    }
    this.counter = counter;
    this.lottery_content = lottery_content;
  }
}
const instructionDataSchema = new Map([
  [
    InstructionData,
    {
      kind: "struct",
      fields: [
        ["counter", "u32"],
        ["lottery_content", "string"],
      ],
    },
  ],
]);

const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount()
).length;

const INSTRUCTION_SIZE = borsh.serialize(
  instructionDataSchema,
  new InstructionData()
).length;

let connection = null;

const establishConnection = async () => {
  const rpcUrl = RPC_URL;
  connection = new Connection(rpcUrl, "confirmed");
  const version = await connection.getVersion();
  console.log("Connection to cluster established:", rpcUrl, version);
};

const establishPayer = async (publicKey) => {
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
    "Using account",
    publicKey.toBase58(),
    "containing",
    lamports / LAMPORTS_PER_SOL,
    "SOL to pay for fees"
  );
};

const checkProgram = async (payerPublicKey, sendTransaction) => {
  // Check if the program has been deployed
  console.log(`get payer public key ${payerPublicKey}`);

  const programId = new PublicKey(PROGRAM_ID);

  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    throw new Error("Program get fail");
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);

  // Derive the address (public key) of a greeting account from the program so that it's easy to find later.
  const GREETING_SEED = "hello";
  const greetedPubkey = await PublicKey.createWithSeed(
    payerPublicKey,
    GREETING_SEED,
    programId
  );

  // Check if the greeting account has already been created
  const greetedAccount = await connection.getAccountInfo(greetedPubkey);
  if (greetedAccount === null) {
    console.log("Creating account", greetedPubkey.toBase58());
    const lamports = await connection.getMinimumBalanceForRentExemption(
      GREETING_SIZE
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
      })
    );

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, "processed");
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

const sendTransactionToProgram = async (
  publicKey,
  sendTransaction,
  connection,
  letteryContent
) => {
  // try {
  //   // `publicKey` will be null if the wallet isn't connected
  //   if (!publicKey) throw new Error("Wallet not connected!");
  //   // `signMessage` will be undefined if the wallet doesn't support it
  //   if (!sendTransaction)
  //     throw new Error("Wallet does not support message signing!");

  //   const programId = new PublicKey(PROGRAM_ID);
  //   const GREETING_SEED = "hello";
  //   const greetedPubkey = await PublicKey.createWithSeed(
  //     publicKey,
  //     GREETING_SEED,
  //     programId
  //   );

  //   const instructionData = new InstructionData(RANDOM_MAX);
  //   const hello = borsh.serialize(instructionDataSchema, instructionData);
  //   const instruction = new TransactionInstruction({
  //     keys: [{ pubkey: greetedPubkey, isSigner: false, isWritable: true }],
  //     programId,
  //     data: Buffer.from(hello),
  //   });

  //   await sendTransaction(new Transaction().add(instruction), connection);
  // } catch (error) {
  //   console.error(`Signing failed: ${error?.message}`);
  // }
  try {
    if (!publicKey) throw new Error("Wallet not connected");
    if (!sendTransaction)
      throw new Error("Wallet does not support message signing");

    const programId = new PublicKey(PROGRAM_ID);
    const greetedPubkey = await getGreeting("hello", publicKey, programId);

    const instructionData = new InstructionData(
      letteryContent.length,
      JSON.stringify(letteryContent)
    );
    const hello = borsh.serialize(instructionDataSchema, instructionData);

    const instruction = new TransactionInstruction({
      keys: [{ pubkey: greetedPubkey, isSigner: false, isWritable: true }],
      programId,
      data: Buffer.from(hello),
    });

    let transaction = new Transaction().add(instruction);
    const signature = await sendTransaction(transaction, connection);

    return signature;
  } catch (error) {
    console.error(`Signing failed: ${error?.message}`);
  }
};

const getGreeting = async (seed, publicKey, programId) => {
  return await PublicKey.createWithSeed(publicKey, seed, programId);
};

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRamdonContentNumber = (contents) => {
  return getRandom(1, contents.length);
};

const isSetRandomNumber = (randomNumber) => randomNumber !== -1;

const SendRequestForLottery = ({
  showLottery,
  lotteryContent,
  lotteryWay,
  setShowLottery,
  randomNumber,
  setRandomNumber,
}) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  useMemo(async () => {
    if (
      !publicKey ||
      !connection ||
      !isChainLotteryWay(lotteryWay) ||
      isSetRandomNumber(randomNumber)
    )
      return;

    console.log(`- 取得payer public key: ${publicKey}`);

    console.log(`- 連接鏈中...`);
    await establishConnection();

    console.log(`- 取得支付手續費使用者資訊...`);
    await establishPayer(publicKey);

    console.log(`- 檢查program...`);
    await checkProgram(publicKey, sendTransaction);

    const signature = await sendTransactionToProgram(
      publicKey,
      sendTransaction,
      connection,
      lotteryContent
    );

    await connection.confirmTransaction(signature, "processed");

    const { random } = await getRandomData(publicKey);

    console.log(`- random number: ${random}`);

    setRandomNumber(random);

    setShowLottery(true);
  }, [
    publicKey,
    sendTransaction,
    connection,
    lotteryWay,
    setRandomNumber,
    setShowLottery,
    randomNumber,
    lotteryContent,
  ]);

  return showLottery && isSetRandomNumber(randomNumber) ? (
    <div>
      <Typewriter
        onInit={(typewriter) => {
          typewriter
            .typeString(createTypewriterString("Solana Program 運行中..."))
            .pauseFor(1500)
            .deleteAll()
            .typeString(createTypewriterString("抽出的結果是..."))
            .pauseFor(1500)
            .deleteAll()
            .typeString(
              createTypewriterString(`${lotteryContent[randomNumber - 1]}!`)
            )
            .callFunction(() => {
              console.log("All strings were deleted");
            })
            .start();
        }}
      />
    </div>
  ) : (
    <div />
  );
};

const createTypewriterString = (text, color) => {
  const colors = ["#8ECAE6", "#219EBC", "#023047", "#FFB703", "#FB8500"];
  if (!color) {
    color = colors[getRandom(0, colors.length - 1)];
  }
  return `<span style="color: ${color}; font-size: 7vw">${text}</span>`;
};

const getRandomData = async (publicKey) => {
  const programId = new PublicKey(PROGRAM_ID);
  const greetedPubkey = await getGreeting("hello", publicKey, programId);
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (accountInfo === null) {
    throw new Error("Error: cannot find the greeted account");
  }
  const greeting = borsh.deserialize(
    GreetingSchema,
    GreetingAccount,
    accountInfo.data
  );

  return greeting.counter;
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
        options: { clientId: "Get a client ID @ https://developer.tor.us" },
      }),
      getLedgerWallet(),
      getSolletWallet({ network }),
      getSolletExtensionWallet({ network }),
    ],
    [network]
  );

  let queryFromURL = getQueryFromURL();
  const lotteryContentFromQuery = queryFromURL.get("lotteryContent");

  const [showLottery, setShowLottery] = React.useState(false);
  // -1: default
  const [randomNumber, setRandomNumber] = React.useState(-1);
  const [lotteryContent, setLotteryContent] = React.useState(
    JSON.parse(lotteryContentFromQuery)
  );
  // "": default, "frontend": frontend, "chain": chain
  const [lotteryWay, setLotteryWay] = React.useState("");

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* <SignMessageButton /> */}
          {/* <SignTransactionButton /> */}
          <SendRequestForLottery
            showLottery={showLottery}
            lotteryContent={lotteryContent}
            lotteryWay={lotteryWay}
            setShowLottery={setShowLottery}
            randomNumber={randomNumber}
            setRandomNumber={setRandomNumber}
          />
          {!isSetLotteryWay(lotteryWay) ? (
            <StartLottery
              setShowLottery={setShowLottery}
              lotteryContent={lotteryContent}
              showLottery={showLottery}
              setLotteryContent={setLotteryContent}
              setLotteryWay={setLotteryWay}
              setRandomNumber={setRandomNumber}
              defaultInput={lotteryContentFromQuery}
            />
          ) : null}
          {isChainLotteryWay(lotteryWay) ? (
            <Grid container justifyContent="center" spacing={2}>
              <WalletMultiButton />
              <WalletDisconnectButton />
            </Grid>
          ) : null}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const InputText = ({ setValue, defaultInput }) => {
  return (
    <Box
      component="form"
      sx={{
        "& .MuiTextField-root": { m: 1, width: "70ch" },
      }}
      noValidate
      autoComplete="off"
    >
      <div>
        <TextField
          id="filled-multiline-static"
          multiline
          rows={6}
          variant="filled"
          defaultValue={defaultInput}
          onChange={(e) => {
            setValue(JSON.parse(e.target.value));
          }}
        />
      </div>
    </Box>
  );
};

const setChainLotteryWay = (setLotteryWay) => {
  setLotteryWay("chain");
};

const setFrontendLotteryWay = (setLotteryWay) => {
  setLotteryWay("frontend");
};

const isChainLotteryWay = (lotteryWay) => {
  return lotteryWay === "chain";
};

const isSetLotteryWay = (lotteryWay) => {
  return lotteryWay !== "";
};

const isFrontendLotteryWay = (lotteryWay) => {
  return lotteryWay === "frontend";
};

const StartLottery = ({
  lotteryContent,
  showLottery,
  setLotteryContent,
  setLotteryWay,
  setRandomNumber,
  setShowLottery,
  defaultInput,
}) => {
  const onClickForFrontendLottery = useCallback(() => {
    setFrontendLotteryWay(setLotteryWay);
    setRandomNumber(getRamdonContentNumber(lotteryContent));
    setShowLottery(true);
  });

  const onClickForChainLottery = useCallback(() => {
    setChainLotteryWay(setLotteryWay);
  });

  return showLottery ? null : (
    <div>
      <InputText setValue={setLotteryContent} defaultInput={defaultInput} />
      <MButton variant="contained" onClick={onClickForChainLottery}>
        基於鏈上抽
      </MButton>{" "}
      <MButton variant="contained" onClick={onClickForFrontendLottery}>
        基於前端抽
      </MButton>
    </div>
  );
};

const getQueryFromURL = () => {
  let urlParams = new URLSearchParams(window.location.search);
  return urlParams;
};

export default Main;
