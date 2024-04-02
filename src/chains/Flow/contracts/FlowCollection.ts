
// Sample collection code for Flow. 
// Note: this code is not complete and is just a template for the collection script that is to be implemented

import fs from "fs";
import path from "path";
import canvas from "canvas";
import { ProgressBar } from "../../../helpers/ProgressBar";
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Delimiter for DNA sequences
const DNA_DELIMITER = "+";

// Interface defining attributes for a collection
interface CollectionAttributes {
  name: string;
  dir: fs.PathLike;
  description: string;
  account: string;
  privateKey: string;
}

// Interface defining the schema for layers
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
}

// Interface for layer input
interface LayerInput {
  name: string;
  dir?: fs.PathLike;
}

// Interface for a layer element
interface LayerElement {
  id: number;
  name: string;
  filename: string;
  path: string;
  weight: number;
}

// Interface for a layer
interface Layer {
  id: number;
  name: string;
  elements: LayerElement[];
  totalWeight: number;
}

// Interface for metadata attribute
interface MetadataAttribute {
  trait_type: string;
  value: string;
}

// Interface for metadata
interface Metadata {
  name: string;
  description: string;
  image: string;
  attributes: MetadataAttribute[];
}

// Class representing a collection
export class Collection {
  name: string;
  dir: fs.PathLike;
  description = "";
  account: string;
  privateKey: string;

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
    this.privateKey = attributes.privateKey;
  }

  // Function to initialize directory structure
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

  // Function to read directory elements
  readDirElements(dir: fs.PathLike) {
    return fs.readdirSync(dir);
  }

  // Function to asynchronously load an image
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

  // Function to save an image
  saveImage(_index: number, canvasInstance: canvas.Canvas) {
    fs.writeFileSync(
      path.join(this.dir.toString(), "assets", `${_index}.png`),
      canvasInstance.toBuffer("image/png")
    );
  }

  // Function to save metadata
  saveMetadata(metadata: Metadata, _index: number) {
    fs.writeFileSync(
      path.join(this.dir.toString(), "metadata", `${_index}.json`),
      JSON.stringify(metadata, null, 2)
    );
  }

  // Setters

  // Set base URL
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  // Set assets directory CID
  setAssetsDirCID(cid: string) {
    this.assetsDirCID = cid;
  }

  // Set metadata directory CID
  setMetadataDirCID(cid: string) {
    this.metadataDirCID = cid;
  }

  // Set extra metadata
  setExtraMetadata(data: object) {
    this.extraMetadata = data;
  }

  // Set schema
  setSchema(schema: LayerSchema) {
    const getElements = (dir: fs.PathLike, rarityDelimiter: string) => {
      const cleanName = (str: string) =>
        path.parse(str).name.split(rarityDelimiter).shift();
      const rarityWeight = (str: string) =>
        path.parse(str).name.split(rarityDelimiter).pop();

      return this.readDirElements(dir)
        .filter((item) => !/(^|\/)\.[^/.]/g.test(item))
        .map((i, index) => {
          if (i.includes(DNA_DELIMITER)) {
            throw new Error(
              `File name cannot contain "${DNA_DELIMITER}", please fix: ${i}`
            );
          }
          const eleName = cleanName(i);
          if (!eleName) {
            throw new Error(`Error in loading File ${i}`);
          }
          const eleWeight = i.includes(schema.rarityDelimiter)
            ? rarityWeight(i)
            : schema.rarityDefault;
          if (!eleWeight) {
            throw new Error(`Error in loading File ${i}`);
          }

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
