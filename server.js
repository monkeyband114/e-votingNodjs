const { error } = require("console");
const express = require("express");
const { Web3 } = require("web3");
require("dotenv").config();

const app = express();
const port = 5000;
const contractABI = [
  {
    inputs: [
      {
        internalType: "string[]",
        name: "candidateNames",
        type: "string[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "voter",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "candidateId",
        type: "uint256",
      },
    ],
    name: "Voted",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "candidates",
    outputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "voteCount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCandidates",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "name",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "voteCount",
            type: "uint256",
          },
        ],
        internalType: "struct EVoting.Candidate[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hasVoted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "candidateId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "voter",
        type: "address",
      },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const contractAddress = "0xE52c1631f7b9723703364Dd391823465586a61E2";
const infuraUrl =
  "https://sepolia.infura.io/v3/b38cf753021449a584d8a9ea94fce34c";

const privateKey =
  "60444ea849ffe5bf49df336d551f99f524d0a1abdd0f8eaef316d79fff6201a3";

const senderAddress = "0x901eA551362293BE64825239fd95984825da2AbD";
var web3provider = new Web3.providers.HttpProvider(infuraUrl);
const web3 = new Web3(web3provider);
const contract = new web3.eth.Contract(contractABI, contractAddress);
app.use(express.json());
app.use(express.static("public"));

app.get("/candidates", async (req, res) => {
  try {
    const candidates = await contract.methods.getCandidates().call();
    const formattedCandidates = candidates.map((candidate) => ({
      name: candidate.name,
      voteCount: candidate.voteCount.toString(), // Convert BigInt to string
    }));
    res.json(formattedCandidates);
  } catch (error) {
    res.status(500).send("Error fetching candidates.");
  }
});

app.post("/vote", async (req, res) => {
  // Log req.body to debug
  console.log(req.body);

  const { candidateId, voterAddress } = req.body;

  if (!voterAddress) {
    return res.status(400).send("Missing candidateId or voterAddress");
  }

  try {
    // Get the current balance of the voterAddress
    const balance = await web3.eth.getBalance(voterAddress);
    const balanceInEther = web3.utils.fromWei(balance, "ether");
    console.log(`Balance of voter: ${balanceInEther} ETH`);

    // Estimate gas for the transaction
    const estimatedGas = await contract.methods
      .vote(candidateId, voterAddress)
      .estimateGas({ from: senderAddress });
    console.log(`Estimated gas: ${estimatedGas}`);

    // Get the current gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log(
      `Current gas price: ${web3.utils.fromWei(gasPrice, "gwei")} Gwei`,
    );

    // Calculate the total cost of the transaction
    const totalCost = estimatedGas * gasPrice;
    const totalCostInEther = web3.utils.fromWei(totalCost.toString(), "ether");
    console.log(`Total transaction cost: ${totalCostInEther} ETH`);

    // Check if the balance is sufficient
    if (parseFloat(balanceInEther) < parseFloat(totalCostInEther)) {
      return res.status(400).send("Insufficient funds to cover gas costs.");
    }
    // Get the current nonce for the voterAddress
    const accountNonce = await web3.eth.getTransactionCount(
      senderAddress,
      "latest",
    );

    console.log(`Current nonce for ${voterAddress}: ${accountNonce}`);
    // Create the transaction object
    const tx = {
      from: voterAddress,
      to: contractAddress,
      gas: estimatedGas, // estimated gas
      gasPrice: gasPrice, // current gas price for type 0 transaction
      nonce: accountNonce, // current nonce
      data: contract.methods.vote(candidateId, voterAddress).encodeABI(),
    };

    // Sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    // Send the signed transaction
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    res.status(200).send("Vote cast successfully!");
    console.log("sucessful");
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).send("Error casting vote.");
  } finally {
    console.log("value", error);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
