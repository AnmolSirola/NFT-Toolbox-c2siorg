// Sample contract code for Flow.
// Note: this code is not complete and is just a template for the collection script that is to be implemented

// Import necessary modules
import fs from "fs";
import path from "path";
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Define the type for network options
type networks = "mainnet" | "testnet";

// Interface defining draft options for a contract
export interface DraftOptions {
  // Common options
  burnable?: boolean;
  pausable?: boolean;
  mintable?: boolean;
  // Flow-specific options
  storagePath: string;
  publicPath: string;
  initializerArgs: any[];
}

// Interface defining deployment configurations
export interface DeployConfigs {
  accessNode: string;
  network: networks;
  account: string;
  privateKey: string;
}

// Interface defining attributes for a contract
export interface ContractAttributes {
  dir: fs.PathLike;
  name: string;
  connection: DeployConfigs;
  deployed?: {
    address: string;
    contractName: string;
  };
}

// Class representing a contract
export class Contract {
  dir: fs.PathLike;
  name: string;
  connection: DeployConfigs;
  deployedInstance: { address: string; contractName: string } | undefined = undefined;

  constructor(attr: ContractAttributes) {
    this.dir = attr.dir;
    this.name = attr.name;
    this.connection = attr.connection;

    if (attr.deployed) {
      this.deployedInstance = attr.deployed;
    }
  }

  // Function to print contract code to file
  print(contractCode: string): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
    fs.writeFileSync(
      path.join(this.dir.toString(), `${this.name}.cdc`),
      contractCode,
      { flag: "w" }
    );
  }

  // Function to draft a contract
  draft(options: DraftOptions): void {
    const contractCode = `
      pub contract ${this.name} {
        ${options.storagePath}: ${options.publicPath}

        init(${options.initializerArgs.map((arg, index) => `arg${index}: ${typeof arg}`).join(", ")}) {
          self.${options.storagePath} = ${options.publicPath}(${options.initializerArgs.map((_, index) => `arg${index}`).join(", ")})
        }
      }
    `;
    this.print(contractCode);
    console.log(`Contract created : ${this.dir}`);
  }

  // Function to deploy a contract
  async deploy(): Promise<void> {
    const authorization = fcl.authorize(this.connection.privateKey);
    const tx = fcl.transaction`
      transaction {
        prepare(acct: AuthAccount) {
          let code = ${fs.readFileSync(path.join(this.dir.toString(), `${this.name}.cdc`), "utf8")}
          acct.contracts.add(name: "${this.name}", code: code.utf8)
        }
      }
    `;

    const response = await fcl.send([
      fcl.args([]),
      fcl.payer(authorization),
      fcl.proposer(authorization),
      fcl.authorizations([authorization]),
      fcl.limit(100),
      tx,
    ]);

    const txId = await fcl.decode(response);
    console.log(`Contract deployed with transaction ID: ${txId}`);

    this.deployedInstance = {
      address: this.connection.account,
      contractName: this.name,
    };
  }

  // Function to write to the contract
  async write(
    functionName: string,
    args: any[]
  ): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    const authorization = fcl.authorize(this.connection.privateKey);
    const tx = fcl.transaction`
      import ${this.deployedInstance.contractName} from ${this.deployedInstance.address}

      transaction {
        prepare(acct: AuthAccount) {
          let instance <- ${this.deployedInstance.contractName}.${functionName}(${args.map((arg) => JSON.stringify(arg)).join(", ")})
          acct.save(<-instance, to: /storage/${this.deployedInstance.contractName})
        }
      }
    `;

    const response = await fcl.send([
      fcl.args([]),
      fcl.payer(authorization),
      fcl.proposer(authorization),
      fcl.authorizations([authorization]),
      fcl.limit(100),
      tx,
    ]);

    const txId = await fcl.decode(response);
    return txId;
  }

  // Function to read from the contract
  async read(
    fieldName: string,
    args: any[] = []
  ): Promise<any> {
    if (!this.deployedInstance) {
      throw new Error("Contract has not been deployed");
    }

    const script = fcl.script`
      import ${this.deployedInstance.contractName} from ${this.deployedInstance.address}

      pub fun main(): ${typeof args[0] || "AnyStruct"} {
        return ${this.deployedInstance.contractName}.${fieldName}(${args.map((arg) => JSON.stringify(arg)).join(", ")})
      }
    `;

    const response = await fcl.send([
      fcl.args([]),
      fcl.script(script),
    ]);

    const value = await fcl.decode(response);
    return value;
  }
}
