const Web3 = require('web3');
const axios = require('axios');
const table = require('text-table');

const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/7ef3a3fcd9fc4aec88df4e79f758a3e4'));

export default (req, res) => {
  res.statusCode = 200;

  const curveContract = new web3.eth.Contract(CURVE_STETH_ABI, CURVE_STETH_ADDRESS);
  const yearnContract = new web3.eth.Contract(YEARN_STETH_ABI, YEARN_STETH_ADDRESS);

  curveContract.methods.get_virtual_price().call((err, curveResult) => {
    if (err) {
      console.log("An error occured", err)
      return
    }

    yearnContract.methods.pricePerShare().call((err, pricePerShareResult) => {
      if (err) {
        console.log("An error occured", err)
        return
      }

      yearnContract.methods.balanceOf(req.query.address).call((err, balanceOfResult) => {
        if (err) {
          console.log("An error occured", err)
          return
        }
  
        const virtualPrice = web3.utils.fromWei(curveResult, 'ether');
        const pricePerShare = web3.utils.fromWei(pricePerShareResult, 'ether');
        const balance = +web3.utils.fromWei(balanceOfResult, 'ether');

        let performance = {
          deposit: null,
          depositDate: null,
          ethProfitPercent: null,
          ethProfit: null,
          ethProfitUSD: null,
          ethProfitPerWeek: null,
          ethProfitPerWeekUSD: null,
          ethProfitPerDay: null,
          ethProfitPerDayUSD: null,
          ethProfitPerHour: null,
          ethProfitPerHourUSD: null
        };

        const deposit = req.query.deposit != null ? +req.query.deposit : null;
        const depositDate = req.query.since != null ? new Date(req.query.since) : null;

        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
          .then(response => {
            const totalBalance = balance * pricePerShare * virtualPrice;

            let results = {
              eth: totalBalance,
              ethPrice: response.data.ethereum.usd,
              value: totalBalance * response.data.ethereum.usd,
              curveVirtualPrice: virtualPrice,
              curveBalance: balance * pricePerShare,
              yearnSharePrice: pricePerShare,
              yearnBalance: balance
            };

            if (deposit && depositDate) {
              performance.deposit = deposit;
              performance.depositDate = depositDate.toISOString();
              performance.ethProfit = results.eth - performance.deposit;
              performance.ethProfitUSD = '$' + (performance.ethProfit * results.ethPrice).toFixed(2);
              performance.ethProfitPercent = (((results.eth - performance.deposit) / results.eth) * 100).toFixed(2) + '%';
    
              const duration = (Date.now() - depositDate.getTime()) / 1000.0;
              const weeks = duration / (24 * 60 * 60 * 7);
              const days = duration / (24 * 60 * 60);
              const hours = duration / (24 * 60);
    
              performance.ethProfitPerWeek = performance.ethProfit / weeks;
              performance.ethProfitPerWeekUSD = '$' + (performance.ethProfitPerWeek * results.ethPrice).toFixed(2);

              performance.ethProfitPerDay = performance.ethProfit / days;
              performance.ethProfitPerDayUSD = '$' + (performance.ethProfitPerDay * results.ethPrice).toFixed(2);
              
              performance.ethProfitPerHour = performance.ethProfit / hours;
              performance.ethProfitPerHourUSD = '$' + (performance.ethProfitPerHour * results.ethPrice).toFixed(2)
            }
    
            if (req.query.output !== 'json') {
              const LABELS = {
                eth: 'Total ETH',
                value: 'Total USD',
                ethPrice: 'ETH Price',
                curveVirtualPrice: 'Curve Virtual Price',
                curveBalance: 'Curve Balance',
                yearnSharePrice: 'Yearn Share Price',
                yearnBalance: 'Yearn Balance',
                deposit: 'Deposit',
                depositDate: 'Deposit Date',
                ethProfitPercent: 'Profit %',
                ethProfit: 'Profit (ETH)',
                ethProfitUSD: 'Profit (USD)',
                ethProfitPerWeek: 'Profit/Week (ETH)',
                ethProfitPerWeekUSD: 'Profit/Week (USD)',
                ethProfitPerDay: 'Profit/Day (ETH)',
                ethProfitPerDayUSD: 'Profit/Day (USD)',
                ethProfitPerHour: 'Profit/Hour (ETH)',
                ethProfitPerHourUSD: 'Profit/Hour (USD)',
              };

              const rows = [];

              for (const key of Object.keys(results)) {
                rows.push([ LABELS[key], results[key] || '' ]);
              }

              for (const key of Object.keys(performance)) {
                rows.push([ LABELS[key], performance[key] || '' ]);
              }

              res.end(table(rows));
            } else {
              res.json({ ...performance, ...results });
            }
          })
          .catch(error => {
            console.log(error);
          });
      });
    });
  });
}

const YEARN_STETH_ADDRESS = '0xdcd90c7f6324cfa40d7169ef80b12031770b4325';
const CURVE_STETH_ADDRESS = '0xdc24316b9ae028f1497c275eb9192a3ea0f67022';

const CURVE_STETH_ABI = [
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "buyer",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "sold_id",
              "type": "int128"
          },
          {
              "indexed": false,
              "name": "tokens_sold",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "bought_id",
              "type": "int128"
          },
          {
              "indexed": false,
              "name": "tokens_bought",
              "type": "uint256"
          }
      ],
      "name": "TokenExchange",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "buyer",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "sold_id",
              "type": "int128"
          },
          {
              "indexed": false,
              "name": "tokens_sold",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "bought_id",
              "type": "int128"
          },
          {
              "indexed": false,
              "name": "tokens_bought",
              "type": "uint256"
          }
      ],
      "name": "TokenExchangeUnderlying",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "provider",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "token_amounts",
              "type": "uint256[2]"
          },
          {
              "indexed": false,
              "name": "fees",
              "type": "uint256[2]"
          },
          {
              "indexed": false,
              "name": "invariant",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "token_supply",
              "type": "uint256"
          }
      ],
      "name": "AddLiquidity",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "provider",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "token_amounts",
              "type": "uint256[2]"
          },
          {
              "indexed": false,
              "name": "fees",
              "type": "uint256[2]"
          },
          {
              "indexed": false,
              "name": "token_supply",
              "type": "uint256"
          }
      ],
      "name": "RemoveLiquidity",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "provider",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "token_amount",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "coin_amount",
              "type": "uint256"
          }
      ],
      "name": "RemoveLiquidityOne",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "provider",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "token_amounts",
              "type": "uint256[2]"
          },
          {
              "indexed": false,
              "name": "fees",
              "type": "uint256[2]"
          },
          {
              "indexed": false,
              "name": "invariant",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "token_supply",
              "type": "uint256"
          }
      ],
      "name": "RemoveLiquidityImbalance",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "deadline",
              "type": "uint256"
          },
          {
              "indexed": true,
              "name": "admin",
              "type": "address"
          }
      ],
      "name": "CommitNewAdmin",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "admin",
              "type": "address"
          }
      ],
      "name": "NewAdmin",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "deadline",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "fee",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "admin_fee",
              "type": "uint256"
          }
      ],
      "name": "CommitNewFee",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": false,
              "name": "fee",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "admin_fee",
              "type": "uint256"
          }
      ],
      "name": "NewFee",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": false,
              "name": "old_A",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "new_A",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "initial_time",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "future_time",
              "type": "uint256"
          }
      ],
      "name": "RampA",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": false,
              "name": "A",
              "type": "uint256"
          },
          {
              "indexed": false,
              "name": "t",
              "type": "uint256"
          }
      ],
      "name": "StopRampA",
      "type": "event"
  },
  {
      "inputs": [
          {
              "name": "_owner",
              "type": "address"
          },
          {
              "name": "_coins",
              "type": "address[2]"
          },
          {
              "name": "_pool_token",
              "type": "address"
          },
          {
              "name": "_A",
              "type": "uint256"
          },
          {
              "name": "_fee",
              "type": "uint256"
          },
          {
              "name": "_admin_fee",
              "type": "uint256"
          }
      ],
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
  },
  {
      "gas": 5289,
      "inputs": [],
      "name": "A",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 5251,
      "inputs": [],
      "name": "A_precise",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 5076,
      "inputs": [
          {
              "name": "i",
              "type": "uint256"
          }
      ],
      "name": "balances",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 1114301,
      "inputs": [],
      "name": "get_virtual_price",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2218181,
      "inputs": [
          {
              "name": "amounts",
              "type": "uint256[2]"
          },
          {
              "name": "is_deposit",
              "type": "bool"
          }
      ],
      "name": "calc_token_amount",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 3484118,
      "inputs": [
          {
              "name": "amounts",
              "type": "uint256[2]"
          },
          {
              "name": "min_mint_amount",
              "type": "uint256"
          }
      ],
      "name": "add_liquidity",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "payable",
      "type": "function"
  },
  {
      "gas": 2654541,
      "inputs": [
          {
              "name": "i",
              "type": "int128"
          },
          {
              "name": "j",
              "type": "int128"
          },
          {
              "name": "dx",
              "type": "uint256"
          }
      ],
      "name": "get_dy",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2810134,
      "inputs": [
          {
              "name": "i",
              "type": "int128"
          },
          {
              "name": "j",
              "type": "int128"
          },
          {
              "name": "dx",
              "type": "uint256"
          },
          {
              "name": "min_dy",
              "type": "uint256"
          }
      ],
      "name": "exchange",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "payable",
      "type": "function"
  },
  {
      "gas": 160545,
      "inputs": [
          {
              "name": "_amount",
              "type": "uint256"
          },
          {
              "name": "_min_amounts",
              "type": "uint256[2]"
          }
      ],
      "name": "remove_liquidity",
      "outputs": [
          {
              "name": "",
              "type": "uint256[2]"
          }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 3519382,
      "inputs": [
          {
              "name": "_amounts",
              "type": "uint256[2]"
          },
          {
              "name": "_max_burn_amount",
              "type": "uint256"
          }
      ],
      "name": "remove_liquidity_imbalance",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 1435,
      "inputs": [
          {
              "name": "_token_amount",
              "type": "uint256"
          },
          {
              "name": "i",
              "type": "int128"
          }
      ],
      "name": "calc_withdraw_one_coin",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 4113806,
      "inputs": [
          {
              "name": "_token_amount",
              "type": "uint256"
          },
          {
              "name": "i",
              "type": "int128"
          },
          {
              "name": "_min_amount",
              "type": "uint256"
          }
      ],
      "name": "remove_liquidity_one_coin",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 151834,
      "inputs": [
          {
              "name": "_future_A",
              "type": "uint256"
          },
          {
              "name": "_future_time",
              "type": "uint256"
          }
      ],
      "name": "ramp_A",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 148595,
      "inputs": [],
      "name": "stop_ramp_A",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 110431,
      "inputs": [
          {
              "name": "new_fee",
              "type": "uint256"
          },
          {
              "name": "new_admin_fee",
              "type": "uint256"
          }
      ],
      "name": "commit_new_fee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 153115,
      "inputs": [],
      "name": "apply_new_fee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 21865,
      "inputs": [],
      "name": "revert_new_parameters",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 74603,
      "inputs": [
          {
              "name": "_owner",
              "type": "address"
          }
      ],
      "name": "commit_transfer_ownership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 116583,
      "inputs": [],
      "name": "apply_transfer_ownership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 21955,
      "inputs": [],
      "name": "revert_transfer_ownership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 137597,
      "inputs": [],
      "name": "withdraw_admin_fees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 42144,
      "inputs": [],
      "name": "donate_admin_fees",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 37938,
      "inputs": [],
      "name": "kill_me",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 22075,
      "inputs": [],
      "name": "unkill_me",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "gas": 2160,
      "inputs": [
          {
              "name": "arg0",
              "type": "uint256"
          }
      ],
      "name": "coins",
      "outputs": [
          {
              "name": "",
              "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2190,
      "inputs": [
          {
              "name": "arg0",
              "type": "uint256"
          }
      ],
      "name": "admin_balances",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2111,
      "inputs": [],
      "name": "fee",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2141,
      "inputs": [],
      "name": "admin_fee",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2171,
      "inputs": [],
      "name": "owner",
      "outputs": [
          {
              "name": "",
              "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2201,
      "inputs": [],
      "name": "lp_token",
      "outputs": [
          {
              "name": "",
              "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2231,
      "inputs": [],
      "name": "initial_A",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2261,
      "inputs": [],
      "name": "future_A",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2291,
      "inputs": [],
      "name": "initial_A_time",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2321,
      "inputs": [],
      "name": "future_A_time",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2351,
      "inputs": [],
      "name": "admin_actions_deadline",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2381,
      "inputs": [],
      "name": "transfer_ownership_deadline",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2411,
      "inputs": [],
      "name": "future_fee",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2441,
      "inputs": [],
      "name": "future_admin_fee",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "gas": 2471,
      "inputs": [],
      "name": "future_owner",
      "outputs": [
          {
              "name": "",
              "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  }
];

const YEARN_STETH_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "receiver",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "debtRatio",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "rateLimit",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "performanceFee",
                "type": "uint256"
            }
        ],
        "name": "StrategyAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "gain",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "loss",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "totalGain",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "totalLoss",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "totalDebt",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "debtAdded",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "debtRatio",
                "type": "uint256"
            }
        ],
        "name": "StrategyReported",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "governance",
                "type": "address"
            }
        ],
        "name": "UpdateGovernance",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "management",
                "type": "address"
            }
        ],
        "name": "UpdateManagement",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "guestList",
                "type": "address"
            }
        ],
        "name": "UpdateGuestList",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "rewards",
                "type": "address"
            }
        ],
        "name": "UpdateRewards",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "depositLimit",
                "type": "uint256"
            }
        ],
        "name": "UpdateDepositLimit",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "performanceFee",
                "type": "uint256"
            }
        ],
        "name": "UpdatePerformanceFee",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "managementFee",
                "type": "uint256"
            }
        ],
        "name": "UpdateManagementFee",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "guardian",
                "type": "address"
            }
        ],
        "name": "UpdateGuardian",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "active",
                "type": "bool"
            }
        ],
        "name": "EmergencyShutdown",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "name": "queue",
                "type": "address[20]"
            }
        ],
        "name": "UpdateWithdrawalQueue",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "debtRatio",
                "type": "uint256"
            }
        ],
        "name": "StrategyUpdateDebtRatio",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "rateLimit",
                "type": "uint256"
            }
        ],
        "name": "StrategyUpdateRateLimit",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "performanceFee",
                "type": "uint256"
            }
        ],
        "name": "StrategyUpdatePerformanceFee",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "oldVersion",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "newVersion",
                "type": "address"
            }
        ],
        "name": "StrategyMigrated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "StrategyRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "StrategyRemovedFromQueue",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "StrategyAddedToQueue",
        "type": "event"
    },
    {
        "inputs": [
            {
                "name": "token",
                "type": "address"
            },
            {
                "name": "governance",
                "type": "address"
            },
            {
                "name": "rewards",
                "type": "address"
            },
            {
                "name": "nameOverride",
                "type": "string"
            },
            {
                "name": "symbolOverride",
                "type": "string"
            }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "token",
                "type": "address"
            },
            {
                "name": "governance",
                "type": "address"
            },
            {
                "name": "rewards",
                "type": "address"
            },
            {
                "name": "nameOverride",
                "type": "string"
            },
            {
                "name": "symbolOverride",
                "type": "string"
            },
            {
                "name": "guardian",
                "type": "address"
            }
        ],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 4519,
        "inputs": [],
        "name": "apiVersion",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "gas": 107017,
        "inputs": [
            {
                "name": "name",
                "type": "string"
            }
        ],
        "name": "setName",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 71867,
        "inputs": [
            {
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "setSymbol",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 36338,
        "inputs": [
            {
                "name": "governance",
                "type": "address"
            }
        ],
        "name": "setGovernance",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37610,
        "inputs": [],
        "name": "acceptGovernance",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37748,
        "inputs": [
            {
                "name": "management",
                "type": "address"
            }
        ],
        "name": "setManagement",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37778,
        "inputs": [
            {
                "name": "guestList",
                "type": "address"
            }
        ],
        "name": "setGuestList",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37808,
        "inputs": [
            {
                "name": "rewards",
                "type": "address"
            }
        ],
        "name": "setRewards",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37738,
        "inputs": [
            {
                "name": "limit",
                "type": "uint256"
            }
        ],
        "name": "setDepositLimit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37872,
        "inputs": [
            {
                "name": "fee",
                "type": "uint256"
            }
        ],
        "name": "setPerformanceFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 37902,
        "inputs": [
            {
                "name": "fee",
                "type": "uint256"
            }
        ],
        "name": "setManagementFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 39146,
        "inputs": [
            {
                "name": "guardian",
                "type": "address"
            }
        ],
        "name": "setGuardian",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 39217,
        "inputs": [
            {
                "name": "active",
                "type": "bool"
            }
        ],
        "name": "setEmergencyShutdown",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 763893,
        "inputs": [
            {
                "name": "queue",
                "type": "address[20]"
            }
        ],
        "name": "setWithdrawalQueue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 76733,
        "inputs": [
            {
                "name": "receiver",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 116496,
        "inputs": [
            {
                "name": "sender",
                "type": "address"
            },
            {
                "name": "receiver",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 38244,
        "inputs": [
            {
                "name": "spender",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 40285,
        "inputs": [
            {
                "name": "spender",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "increaseAllowance",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 40309,
        "inputs": [
            {
                "name": "spender",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "decreaseAllowance",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 81237,
        "inputs": [
            {
                "name": "owner",
                "type": "address"
            },
            {
                "name": "spender",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            },
            {
                "name": "expiry",
                "type": "uint256"
            },
            {
                "name": "signature",
                "type": "bytes"
            }
        ],
        "name": "permit",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 4123,
        "inputs": [],
        "name": "totalAssets",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "deposit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "deposit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "_amount",
                "type": "uint256"
            },
            {
                "name": "recipient",
                "type": "address"
            }
        ],
        "name": "deposit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 364171,
        "inputs": [],
        "name": "maxAvailableShares",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "maxShares",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "maxShares",
                "type": "uint256"
            },
            {
                "name": "recipient",
                "type": "address"
            }
        ],
        "name": "withdraw",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "maxShares",
                "type": "uint256"
            },
            {
                "name": "recipient",
                "type": "address"
            },
            {
                "name": "maxLoss",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 12412,
        "inputs": [],
        "name": "pricePerShare",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 1450351,
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            },
            {
                "name": "debtRatio",
                "type": "uint256"
            },
            {
                "name": "rateLimit",
                "type": "uint256"
            },
            {
                "name": "performanceFee",
                "type": "uint256"
            }
        ],
        "name": "addStrategy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 115316,
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            },
            {
                "name": "debtRatio",
                "type": "uint256"
            }
        ],
        "name": "updateStrategyDebtRatio",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 41467,
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            },
            {
                "name": "rateLimit",
                "type": "uint256"
            }
        ],
        "name": "updateStrategyRateLimit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 41344,
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            },
            {
                "name": "performanceFee",
                "type": "uint256"
            }
        ],
        "name": "updateStrategyPerformanceFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 1105801,
        "inputs": [
            {
                "name": "oldVersion",
                "type": "address"
            },
            {
                "name": "newVersion",
                "type": "address"
            }
        ],
        "name": "migrateStrategy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "revokeStrategy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "revokeStrategy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 1196920,
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "addStrategyToQueue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 23091666,
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "removeStrategyFromQueue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "debtOutstanding",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "debtOutstanding",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "creditAvailable",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "creditAvailable",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 9808,
        "inputs": [],
        "name": "availableDepositLimit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "expectedReturn",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "strategy",
                "type": "address"
            }
        ],
        "name": "expectedReturn",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 937520,
        "inputs": [
            {
                "name": "gain",
                "type": "uint256"
            },
            {
                "name": "loss",
                "type": "uint256"
            },
            {
                "name": "_debtPayment",
                "type": "uint256"
            }
        ],
        "name": "report",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "token",
                "type": "address"
            }
        ],
        "name": "sweep",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "name": "token",
                "type": "address"
            },
            {
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "sweep",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "gas": 9053,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 8106,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2711,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2956,
        "inputs": [
            {
                "name": "arg0",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3201,
        "inputs": [
            {
                "name": "arg0",
                "type": "address"
            },
            {
                "name": "arg1",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2801,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2831,
        "inputs": [],
        "name": "token",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2861,
        "inputs": [],
        "name": "governance",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2891,
        "inputs": [],
        "name": "management",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2921,
        "inputs": [],
        "name": "guardian",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 2951,
        "inputs": [],
        "name": "guestList",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 10322,
        "inputs": [
            {
                "name": "arg0",
                "type": "address"
            }
        ],
        "name": "strategies",
        "outputs": [
            {
                "name": "performanceFee",
                "type": "uint256"
            },
            {
                "name": "activation",
                "type": "uint256"
            },
            {
                "name": "debtRatio",
                "type": "uint256"
            },
            {
                "name": "rateLimit",
                "type": "uint256"
            },
            {
                "name": "lastReport",
                "type": "uint256"
            },
            {
                "name": "totalDebt",
                "type": "uint256"
            },
            {
                "name": "totalGain",
                "type": "uint256"
            },
            {
                "name": "totalLoss",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3120,
        "inputs": [
            {
                "name": "arg0",
                "type": "uint256"
            }
        ],
        "name": "withdrawalQueue",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3041,
        "inputs": [],
        "name": "emergencyShutdown",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3071,
        "inputs": [],
        "name": "depositLimit",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3101,
        "inputs": [],
        "name": "debtRatio",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3131,
        "inputs": [],
        "name": "totalDebt",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3161,
        "inputs": [],
        "name": "lastReport",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3191,
        "inputs": [],
        "name": "activation",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3221,
        "inputs": [],
        "name": "rewards",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3251,
        "inputs": [],
        "name": "managementFee",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3281,
        "inputs": [],
        "name": "performanceFee",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3526,
        "inputs": [
            {
                "name": "arg0",
                "type": "address"
            }
        ],
        "name": "nonces",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "gas": 3341,
        "inputs": [],
        "name": "DOMAIN_SEPARATOR",
        "outputs": [
            {
                "name": "",
                "type": "bytes32"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];