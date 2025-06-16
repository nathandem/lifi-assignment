import { BigNumber } from "ethers";

import config from "../src/config.js";

const feesCollectedEventsFixtures = [
  {
    blockNumber: config.startBlock,
    blockHash:
      "0xc39e7b15bdfea6f21e68ed9e666e403e34d47b61dfc017e68dc8ca1c89bf99c9",
    transactionHash:
      "0x3730c9d72eac383f47564eba88074d6a11077c0fa7f22de271d1cbac169f9cac",
    logIndex: 1,
    args: {
      _token: "0x1D1498166DDCEeE616a6d99868e1E0677300056f",
      _integrator: "0x60bFaC7318e576A535cE8EA3Bfe0a45A803Bfa0B",
      _integratorFee: BigNumber.from(22112500000000000000n),
      _lifiFee: BigNumber.from(737500000000000000n),
    },
  },
  {
    blockNumber: config.startBlock + 6,
    blockHash:
      "0xcf9c357376f621c50240d148805386b5c870a87e3084d84e0188f9e007cc05d6",
    transactionHash:
      "0x7430388ac4f15d7a224fef0b8d8c61e6b09915ebbaeeff540c136dc44e5072c1",
    logIndex: 1,
    args: {
      _token: "0x0000000000000000000000000000000000000000",
      _integrator: "0x1Bcc58D165e5374D7B492B21c0a572Fd61C0C2a0",
      _integratorFee: BigNumber.from(12112500000000000000n),
      _lifiFee: BigNumber.from(637500000000000000n),
    },
  },
  {
    blockNumber: config.startBlock + 50,
    blockHash:
      "0x7765a21875ae09b7b6edb9a87159afed341757a519a2f508fc8d3132745ed5aa",
    transactionHash:
      "0xd6e322e94039e97218301d9a3791c1ae08efea283439bc69e5beb3d930f5cda6",
    logIndex: 1,
    args: {
      _token: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      _integrator: "0x1Bcc58D165e5374D7B492B21c0a572Fd61C0C2a0",
      _integratorFee: BigNumber.from(4512500000000000000n),
      _lifiFee: BigNumber.from(58750000432000000n),
    },
  },
  {
    blockNumber: config.startBlock + 51,
    blockHash:
      "0x5806571f6c0fa6707a8f380c5ff476a120a8308ef8d6f50502f83cc9ea4de2a7",
    transactionHash:
      "0xbaf32896c38c633c1141e159823c2fe69254b3c1076a818756f9f150421307c2",
    logIndex: 1,
    args: {
      _token: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      _integrator: "0x7E83AA92E04De879eEe1E0b6509C84d0Db4d533A",
      _integratorFee: BigNumber.from(43252115231n),
      _lifiFee: BigNumber.from(4324111327n),
    },
  },
  {
    blockNumber: config.startBlock + 70,
    blockHash:
      "0x9b9875e34598e9c746058a9f4272f57dc8c5e67e6af0583fc51f7c4647b9a251",
    transactionHash:
      "0xd22b3ae46fa260d4adb0b32681951444d2a86f6fb4631ee3c62ece37efa0c79a",
    logIndex: 1,
    args: {
      _token: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      _integrator: "0x1Bcc58D165e5374D7B492B21c0a572Fd61C0C2a0",
      _integratorFee: BigNumber.from(2115231n),
      _lifiFee: BigNumber.from(111327n),
    },
  },
];

export { feesCollectedEventsFixtures };
