
// Sample collection code for Aptos. 
// Note: this code is not complete and is just a template for the collection script that is to be implemented

import fs from "fs";
import path from "path";
import canvas from "canvas";
import { ProgressBar } from "../../../helpers/ProgressBar";
import { AptosClient, AptosAccount, BCS, TxnBuilderTypes } from "aptos";

// Define the delimiter used in DNA strings
const DNA_DELIMITER = "+";

// Define the attributes of a collection
interface CollectionAttributes {
  name: string;
  dir: fs.PathLike;
  description: string;
  account: AptosAccount;
}

// Define the schema for layers
export interface LayerSchema {
  dir: fs.PathLike;
  size: number;
  layersOrder: LayerInput[];
  format: {
    width: number;
    height: number;
    smoothing: boolean;
  };
  background: {
    generate: boolean;
    static?: boolean;
    default?: string;
    brightness?: number;
  };
  dnaCollisionTolerance: number;
  rarityDelimiter: string;
  rarityDefault: string;
  shuffleIndexes: boolean;
  client: AptosClient;
}

// Define the input for a layer
interface LayerInput {
  name: string;
  dir?: fs.PathLike;
}

// Define the structure of a layer element
interface LayerElement {
  id: number;
  name: string;
  filename: string;
  path: string;
  weight: number;
}

// Define the structure of a layer
interface Layer {
  id: number;
  name: string;
  elements: LayerElement[];
  totalWeight: number;
}

// Define the structure of a metadata attribute
interface MetadataAttribute {
  trait_type: string;
  value: string;
}

// Define the structure of metadata
interface Metadata {
  name: string;
  description: string;
  image: string;
  attributes: MetadataAttribute[];
}

// Define the Collection class
export class Collection {
  name: string;
  dir: fs.PathLike;
  description = "";
  account: AptosAccount;

  baseURL = "";
  assetsDirCID = "";
  metadataDirCID = "";

  extraMetadata: object = {};
  schema?: LayerSchema = undefined;
  layers?: Layer[] = undefined;

  // Constructor
  constructor(attributes: CollectionAttributes) {
    this.name = attributes.name;
    this.description = attributes.description;
    this.dir = attributes.dir;
    this.account = attributes.account;
  }

  // Initialize the directory for the collection
  initializeDir() {
    if (!this.schema || !this.layers) {
      throw new Error("Schema required for generating NFTs");
    }
    if (fs.existsSync(this.dir)) {
      fs.rmSync(this.dir, { recursive: true });
    }
    fs.mkdirSync(this.dir);
    fs.mkdirSync(path.join(this.dir.toString(), "assets"));
    fs.mkdirSync(path.join(this.dir.toString(), "metadata"));
  }

  // Read the elements of a directory
  readDirElements(dir: fs.PathLike) {
    return fs.readdirSync(dir);
  }

  // Load an image from a layer element
  async loadImage(element: LayerElement) {
    try {
      return new Promise<canvas.Image>(async (resolve) => {
        const image = await canvas.loadImage(element.path);
        resolve(image);
      });
    } catch (error) {
      console.error(`Error loading image ${element.path}:`, error);
    }
  }

  // Save an image to the assets directory
  saveImage(_index: number, canvasInstance: canvas.Canvas) {
    fs.writeFileSync(
      path.join(this.dir.toString(), "assets", `${_index}.png`),
      canvasInstance.toBuffer("image/png")
    );
  }

  // Save metadata to the metadata directory
  saveMetadata(metadata: Metadata, _index: number) {
    fs.writeFileSync(
      path.join(this.dir.toString(), "metadata", `${_index}.json`),
      JSON.stringify(metadata, null, 2)
    );
  }

  // Setters
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  setAssetsDirCID(cid: string) {
    this.assetsDirCID = cid;
  }

  setMetadataDirCID(cid: string) {
    this.metadataDirCID = cid;
  }

  setExtraMetadata(data: object) {
    this.extraMetadata = data;
  }

  // Set the schema for the collection
  setSchema(schema: LayerSchema) {
    // Function to recursively read images in a layer directory and return an array of elements
    const getElements = (dir: fs.PathLike, rarityDelimiter: string) => {
      // Function to clean the name by removing the rarity delimiter and weight
      const cleanName = (str: string) =>
        path.parse(str).name.split(rarityDelimiter).shift();

      // Function to extract the rarity weight from the file name
      const rarityWeight = (str: string) =>
        path.parse(str).name.split(rarityDelimiter).pop();

      return this.readDirElements(dir)
        .filter((item) => !/(^|\/)\.[^/.]/g.test(item))
        .map((i, index) => {
          // Parsing file name
          if (i.includes(DNA_DELIMITER)) {
            throw new Error(
              `File name cannot contain "${DNA_DELIMITER}", please fix: ${i}`
            );
          }
          const eleName = cleanName(i);
          if (!eleName) {
            throw new Error(`Error in loading file ${i}`);
          }
          const eleWeight = i.includes(schema.rarityDelimiter)
            ? rarityWeight(i)
            : schema.rarityDefault;
          if (!eleWeight) {
            throw new Error(`Error in loading file ${i}`);
          }

          // Creating element
          const element: LayerElement = {
            id: index,
            name: eleName,
            filename: i,
            path: path.join(dir.toString(), i),
            weight: parseInt(eleWeight),
          };
          return element;
        });
    };
  }
}