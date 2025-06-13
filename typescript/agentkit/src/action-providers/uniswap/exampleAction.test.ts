/**
 * Swap Action Tests
 */

import { UniswapActionProvider } from "./uniswapActionProvider";
import { SwapActionSchema } from "./schemas";
import { EvmWalletProvider } from "../../wallet-providers";

describe("Swap Action", () => {
  // default setup: instantiate the provider
  const provider = new UniswapActionProvider();

  // mock wallet provider setup
  let mockWalletProvider: jest.Mocked<EvmWalletProvider>;

  beforeEach(() => {
    mockWalletProvider = {
      getAddress: jest.fn(),
      getBalance: jest.fn(),
      getName: jest.fn(),
      getNetwork: jest.fn().mockReturnValue({
        protocolFamily: "evm",
        networkId: "test-network",
      }),
      nativeTransfer: jest.fn(),
      readContract: jest.fn().mockResolvedValue(18),
    } as unknown as jest.Mocked<EvmWalletProvider>;
  });

  describe("schema validation", () => {
    it("should validate swap action schema", () => {
      const validInput = {
        tokenIn: "0x4200000000000000000000000000000000000006",
        amountIn: "1.0",
        tokenOut: "0x4200000000000000000000000000000000000006",
      };
      const parseResult = SwapActionSchema.safeParse(validInput);
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.tokenIn).toBe("0x4200000000000000000000000000000000000006");
        expect(parseResult.data.amountIn).toBe("1.0");
        expect(parseResult.data.tokenOut).toBe("0x4200000000000000000000000000000000000006");
      }
    });

    it("should reject invalid swap action input", () => {
      const invalidInput = {
        tokenIn: "",
        amountIn: "invalid",
        tokenOut: "",
      };
      const parseResult = SwapActionSchema.safeParse(invalidInput);
      expect(parseResult.success).toBe(false);
    });
  });

  describe("swap action execution", () => {
    it("should execute swap action with wallet provider", async () => {
      const args = {
        tokenIn: "0x4200000000000000000000000000000000000006",
        amountIn: "1.0",
        tokenOut: "0x4200000000000000000000000000000000000006",
      };
      const result = await provider.swap(mockWalletProvider, args);
      expect(result).toContain(args.tokenIn);
      expect(mockWalletProvider.getNetwork).toHaveBeenCalled();
    });
  });

  it("should return true for Base Mainnet", () => {
    const result = provider.supportsNetwork({
      protocolFamily: "evm",
      networkId: "base-mainnet",
    });
    expect(result).toBe(true);
  });

  it("should return true for Base Sepolia", () => {
    const result = provider.supportsNetwork({
      protocolFamily: "evm",
      networkId: "base-sepolia",
    });
    expect(result).toBe(true);
  });

  it("should return false for other EVM networks", () => {
    const result = provider.supportsNetwork({
      protocolFamily: "evm",
      networkId: "ethereum",
    });
    expect(result).toBe(false);
  });

  it("should return false for non-EVM networks", () => {
    const result = provider.supportsNetwork({
      protocolFamily: "bitcoin",
      networkId: "base-mainnet",
    });
    expect(result).toBe(false);
  });
});
