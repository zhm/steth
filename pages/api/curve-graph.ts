import { ApolloClient, InMemoryCache, gql } from "@apollo/client";

const APIURL =
  "https://api.thegraph.com/subgraphs/name/protofire/curve";

const poolQuery = (name: string, block: number | null) => {
  const blockQuery = block == null ? '' : `block: { number: ${block} },`;

  return `
query {
  pools(${blockQuery} where: { name: "${ name }" }) {
    name
    address: swapAddress
    A
    fee
    adminFee
    virtualPrice
    coins {
      token {
        address
        name
        symbol
        decimals
      }
      balance
      rate
    }
    underlyingCoins {
      token {
        address
        name
        symbol
        decimals
      }
      balance
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

export const queryPool = async (address: string, block: number | null) => {
  return client.query({
    query: gql(poolQuery(address, block)),
  });
};
