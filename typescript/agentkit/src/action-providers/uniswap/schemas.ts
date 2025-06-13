import { z } from "zod";

/**
 * SwapActionSchema is the input schema for the swap action.
 */
export const SwapActionSchema = z.object({
  tokenIn: z.string().min(1).max(100).describe("The token to swap from"),
  amountIn: z.string().regex(/^\d*\.?\d+$/, "Amount must be a valid decimal number").describe("The amount of tokenIn to swap"),
  tokenOut: z.string().min(1).max(100).describe("The token to swap to"),
});
