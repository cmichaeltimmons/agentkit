/**
 * Uniswap Action Provider
 *
 * This file contains the implementation of the UniswapActionProvider
 * @module uniswap
 */

import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { Network, NETWORK_ID_TO_CHAIN_ID } from "../../network";
import { CreateAction } from "../actionDecorator";
import { EvmWalletProvider } from "../../wallet-providers";
import { SwapActionSchema } from "./schemas";
import { ROUTER_ADDRESS, SUPPORTED_NETWORKS } from "./constants";
import { AlphaRouter, CurrencyAmount, SwapType } from "@uniswap/smart-order-router";
import { Percent, Token, TradeType } from "@uniswap/sdk-core";
import { JsonRpcProvider, parseUnits } from "ethers";
import { abi } from "../erc20/constants";
import { approve } from "../../utils";
import { SwapRouter } from "@uniswap/router-sdk";

export class UniswapActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("uniswap", []);
  }

  @CreateAction({
    name: "swap",
    description: `
    This tool allows you to swap ERC20 tokens on Uniswap through the UniversalRouterV2 contract

    It takes:
    - tokenIn: The token address to swap from
    - amountIn: The amount of tokenIn to swap in whole units
      Examples for WETH:
      - 1 WETH
      - 0.1 WETH
      - 0.01 WETH
    - tokenOut: The token address to swap to

    Important notes:
    - Make sure to use the exact amount provided. Do not convert units for assets for this action.
    - Please use a token address (example 0x4200000000000000000000000000000000000006) for the tokenAddress field.
    `,
    schema: SwapActionSchema,
  })
  async swap(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapActionSchema>,
  ): Promise<string> {
    const network = walletProvider.getNetwork();
    const chainId = Number(NETWORK_ID_TO_CHAIN_ID[network.networkId!]);
    
    const provider = new JsonRpcProvider(`https://rpc.ankr.com/${network.networkId}`);
    const router = new AlphaRouter({
      chainId: chainId,
      provider: provider as any,
    });

    const tokenInDecimals = await walletProvider.readContract({
      address: args.tokenIn as `0x${string}`,
      abi: abi,
      functionName: "decimals",
    });
    
    const tokenOutDecimals = await walletProvider.readContract({
      address: args.tokenOut as `0x${string}`,
      abi: abi,
      functionName: "decimals",
    });

    const tokenIn = new Token(chainId, args.tokenIn, tokenInDecimals);
    const tokenOut = new Token(chainId, args.tokenOut, tokenOutDecimals);

    const amountInRaw = parseUnits(
      args.amountIn.toString(),
      tokenInDecimals,
    ).toString();

    const routeOptions = {
      recipient: walletProvider.getAddress(),
      slippageTolerance: new Percent(100, 10_000),
      deadline: Math.floor(Date.now() / 1000 + 1800),
      type: SwapType.SWAP_ROUTER_02 as const,
    };

    const route = await router.route(
      CurrencyAmount.fromRawAmount(tokenIn, amountInRaw),
      tokenOut,
      TradeType.EXACT_INPUT,
      routeOptions,
    );

    if (!route) {
      throw new Error("No routes found");
    }

    await approve(
      walletProvider,
      args.tokenIn,
      amountInRaw,
      ROUTER_ADDRESS[network.networkId!],
    );

    const { calldata, value } = SwapRouter.swapCallParameters(
      route.trade,
      routeOptions,
    );

    const txHash = await walletProvider.sendTransaction({
      to: ROUTER_ADDRESS[network.networkId!],
      data: calldata as `0x${string}`,
      value: BigInt(value),
    });

    return `Swap executed: ${args.amountIn} ${args.tokenIn} to ${args.tokenOut} on network ${network.networkId}. Tx: ${txHash}`;
  }

  supportsNetwork(network: Network): boolean {
    return SUPPORTED_NETWORKS.includes(network.networkId!);
  }
}

export const uniswapActionProvider = () => new UniswapActionProvider();