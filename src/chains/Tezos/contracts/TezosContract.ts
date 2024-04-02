// Sample contract code for Tezos. 
// Note: this contract is not complete and is just a template for the contract to be implemented
import fs from "fs";
import path from "path";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { Contract as TezosContract, tzip16 } from "@taquito/taquito";

// Define the supported network types
type networks = "mainnet" | "delphinet" | "edonet" | "florencenet" | "granadanet";

// Define the options for drafting a contract
export interface DraftOptions {
  // Common options
  burnable?: boolean;
  pausable?: boolean;
  mintable?: boolean;

  // Tezos-specific options
  storage: {
    owner?: string;
    ledger?: Record<string, number>;
    operators?: Record<string, Record<string, boolean>>;
    metadata?: Record<string, string>;
  };

  // FA1.2 options
  transferable?: boolean;

  // FA2 options
  supportsNonFungibleTokens?: boolean;
  supportsMultipleTokenTypes?: boolean;
}

// Define the deployment configuration
export interface DeployConfigs {
  rpc: string;
  network: networks;
  signer: InMemorySigner;
}

// Define the contract attributes
export interface ContractAttributes {
  dir: fs.PathLike;
  standard: string;
  name: string;
  connection: DeployConfigs;
  deployed?: {
    address: string;
    storage: object;
  };
}

// Define the Contract class
export class Contract {
  // Contract properties
  dir: fs.PathLike;
  standard: string;
  name: string;
  connection: DeployConfigs;
  deployedInstance: TezosContract | undefined = undefined;

  // Constructor
  constructor(attr: ContractAttributes) {
    this.dir = attr.dir;
    this.standard = attr.standard;
    this.name = attr.name;
    this.connection = attr.connection;
    if (attr.deployed) {
      this.deployedInstance = new TezosContract(attr.deployed.address);
    }
  }

  // Print the contract code to a file
  print(contractCode: string): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    fs.writeFileSync(
      path.join(this.dir.toString(), `${this.name}.tz`),
      contractCode,
      { flag: "w" }
    );
  }

  // Draft a contract with the specified options
  draft(options: DraftOptions): void {
    const contractCode = `
      parameter (or (int %increment) (int %decrement));
      storage int;
      code {
        DUP;
        CDR;
        SWAP;
        CAR;
        IF_LEFT {
          ADD
        } {
          SWAP;
          SUB;
          SWAP
        };
        NIL operation;
        PAIR
      }
    `;
    this.print(contractCode);
    console.log(`Contract created: ${this.dir}`);
  }

  // Deploy the contract
  async deploy(): Promise<void> {
    const tezos = new TezosToolkit(this.connection.rpc);
    tezos.setProvider({ signer: this.connection.signer });
    const { script, storage } = await tezos.contract.originate({
      code: fs.readFileSync(path.join(this.dir.toString(), `${this.name}.tz`), "utf8"),
      init: `${JSON.stringify(0)}`,
    });
    await script.new(storage).send();
    console.log(`Contract originated at ${script.address}`);
    this.deployedInstance = await tezos.contract.at(script.address);
  }

  // Write to the contract
  async write(
    method: string,
    args: object,
    amount: number = 0,
    mutez: boolean = false
  ): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }
    const operation = await this.deployedInstance.methods[method](args).send({
      amount: mutez ? amount : amount * 1000000,
      mutez: mutez,
    });
    await operation.confirmation();
    return operation;
  }

  // Read from the contract
  async read(propertyName: string): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }
    const storage = await this.deployedInstance.storage();
    return storage[propertyName];
  }
}