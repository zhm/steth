import axios from 'axios';
import table from 'text-table';

import { queryVault } from './yearn-graph';
import { queryPool } from './curve-graph';

export const YEARN_STETH_ADDRESS = '0xdcd90c7f6324cfa40d7169ef80b12031770b4325';

export default async (req, res) => {
  res.statusCode = 200;

  const days = req.query.days ? +req.query.days : 3;
  const previous = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000);

  const block = (await axios.get(`https://api.blockbydate.com/api/block_by_date?date=${ previous }&network=ETHEREUM`)).data

  const currentAccount = (await queryVault(req.query.address, null)).data;
  const previousAccount = (await queryVault(req.query.address, block)).data;

  const currentPosition = currentAccount.accounts[0].vaultPositions.find(position => {
    return position.vault.id === YEARN_STETH_ADDRESS;
  });

  const previousPosition = previousAccount.accounts[0].vaultPositions.find(position => {
    return position.vault.id === YEARN_STETH_ADDRESS;
  });

  const currentPool = (await queryPool('steth', null)).data.pools[0];
  const previousPool = (await queryPool('steth', block)).data.pools[0];

  const ethPrice = (await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')).data.ethereum.usd;

  const toNumber = value => +value / 10e17;

  const totalBalance = toNumber(currentPosition.balanceShares) * toNumber(currentPosition.vault.latestUpdate.pricePerShare) * +currentPool.virtualPrice;
  const totalBalanceYesterday = toNumber(previousPosition.balanceShares) * toNumber(previousPosition.vault.latestUpdate.pricePerShare) * +previousPool.virtualPrice;
  
  const ethProfitPerDay = (totalBalance - totalBalanceYesterday) / days;

  const compoundingPeriodsPerDay = 1;
  const compoundingPeriods = 365 * compoundingPeriodsPerDay;

  const apr2apy = (apr) => Math.pow(1 + (apr / compoundingPeriods), compoundingPeriods) - 1;

  const apr = ((ethProfitPerDay / totalBalance) / compoundingPeriodsPerDay) * compoundingPeriods;
  const apy = apr2apy(apr);

  const results = {
    eth: totalBalance,
    ethPrice: ethPrice,
    value: totalBalance * ethPrice,
    curveVirtualPrice: +currentPool.virtualPrice,
    curveBalance: toNumber(previousPosition.balancePosition),
    yearnSharePrice: toNumber(currentPosition.vault.latestUpdate.pricePerShare),
    yearnBalance: toNumber(currentPosition.balanceShares),
    apr: (apr * 100).toFixed(2) + '%',
    apy: (apy * 100).toFixed(2) + '%',
    ethProfitPerWeekUSD: '$' + (ethProfitPerDay * ethPrice * 7).toFixed(2),
    ethProfitPerDayUSD: '$' + (ethProfitPerDay * ethPrice).toFixed(2),
    ethProfitPerHourUSD: '$' + (ethProfitPerDay * ethPrice / 24).toFixed(2),
    ethProfitPerWeek: ethProfitPerDay * 7,
    ethProfitPerDay: ethProfitPerDay,
    ethProfitPerHour: ethProfitPerDay / 24
  };

  const LABELS = {
    eth: 'Total ETH',
    value: 'Total USD',
    ethPrice: 'ETH Price',
    curveVirtualPrice: 'Curve Virtual Price',
    curveBalance: 'Curve Balance',
    yearnSharePrice: 'Yearn Share Price',
    yearnBalance: 'Yearn Balance',
    apr: 'APR',
    apy: 'APY',
    ethProfitPerWeekUSD: 'Profit/Week (USD)',
    ethProfitPerDayUSD: 'Profit/Day (USD)',
    ethProfitPerHourUSD: 'Profit/Hour (USD)',
    ethProfitPerWeek: 'Profit/Week (ETH)',
    ethProfitPerDay: 'Profit/Day (ETH)',
    ethProfitPerHour: 'Profit/Hour (ETH)'
  };

  const rows = [];

  for (const key of Object.keys(results)) {
    rows.push([ LABELS[key], results[key] || '' ]);
  }

  res.end(table(rows));
}