const Web3 = require('web3');
const axios = require('axios');
const table = require('text-table');

import { queryVault } from './yearn-graph';
import { queryPool } from './curve-graph';

export const YEARN_STETH_ADDRESS = "0xdcd90c7f6324cfa40d7169ef80b12031770b4325";

const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/7ef3a3fcd9fc4aec88df4e79f758a3e4'));

export default async (req, res) => {
  res.statusCode = 200;

  const yesterday = parseInt((Date.now() - (24 * 60 * 60 * 1000)) / 1000);

  const block = (await axios.get(`https://api.blockbydate.com/api/block_by_date?date=${ yesterday }&network=ETHEREUM`)).data

  const currentAccount = (await queryVault(req.query.address, null)).data;
  const yesterdayAccount = (await queryVault(req.query.address, block)).data;

  const currentPosition = currentAccount.accounts[0].vaultPositions.find(position => {
    return position.vault.id === YEARN_STETH_ADDRESS;
  });

  const yesterdayPosition = yesterdayAccount.accounts[0].vaultPositions.find(position => {
    return position.vault.id === YEARN_STETH_ADDRESS;
  });

  const currentPool = (await queryPool('steth', null)).data.pools[0];
  const yesterdayPool = (await queryPool('steth', block)).data.pools[0];

  const ethPrice = (await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')).data.ethereum.usd;

  const toNumber = value => +value / 10e17;

  const totalBalance = toNumber(currentPosition.balanceShares) * toNumber(currentPosition.vault.latestUpdate.pricePerShare) * +currentPool.virtualPrice;
  const totalBalanceYesterday = toNumber(yesterdayPosition.balanceShares) * toNumber(yesterdayPosition.vault.latestUpdate.pricePerShare) * +yesterdayPool.virtualPrice;
  
  const ethProfit = totalBalance - totalBalanceYesterday;

  const results = {
    eth: totalBalance,
    ethPrice: ethPrice,
    value: totalBalance * ethPrice,
    curveVirtualPrice: +currentPool.virtualPrice,
    curveBalance: toNumber(yesterdayPosition.balancePosition),
    yearnSharePrice: toNumber(currentPosition.vault.latestUpdate.pricePerShare),
    yearnBalance: toNumber(currentPosition.balanceShares),
    ethProfitPerWeek: ethProfit * 7,
    ethProfitPerWeekUSD: '$' + (ethProfit * ethPrice * 7).toFixed(2),
    ethProfitPerDay: ethProfit,
    ethProfitPerDayUSD: '$' + (ethProfit * ethPrice).toFixed(2),
    ethProfitPerHour: ethProfit / 24,
    ethProfitPerHourUSD: '$' + (ethProfit * ethPrice / 24).toFixed(2)
  };

  const LABELS = {
    eth: 'Total ETH',
    value: 'Total USD',
    ethPrice: 'ETH Price',
    curveVirtualPrice: 'Curve Virtual Price',
    curveBalance: 'Curve Balance',
    yearnSharePrice: 'Yearn Share Price',
    yearnBalance: 'Yearn Balance',
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
}