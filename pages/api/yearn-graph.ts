import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

const APIURL =
  "https://api.thegraph.com/subgraphs/name/salazarguille/yearn-vaults-v2-subgraph-mainnet";

const vaultQuery = (address: string, block: number | null) => {
  const blockQuery = block == null ? '' : `block: { number: ${block} },`;

  return `
query {
  accounts(${blockQuery} where: { id: "${address}" }) {
    id
    vaultPositions {
      vault {
        id
        latestUpdate {
          pricePerShare
        }
        shareToken {
          symbol
        }
        token {
          symbol
        }
      }
      balanceShares
      balanceTokens
      balancePosition
    }
  }
}
`;
}

const client = new ApolloClient({
  uri: APIURL,
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    }
  }
});

export const queryVault = async (address: string, block: number | null) => {
  // console.log('Q', vaultQuery(address, block));

  return client.query({
    query: gql(vaultQuery(address, block)),
  });
};
