import fs from 'fs';
import path from 'path';
import canvas from 'canvas';
import { ProgressBar } from '../../../helpers/ProgressBar';
import {
  Keypair,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';

let spl_token: any;

const DNA_DELIMITER = '+';

interface CollectionAttributes {
  name: string;
  dir: fs.PathLike;
  description: string;
  programId: PublicKey;
  account: PublicKey;
}

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
  connection: Connection;
  payer: Keypair;
}

interface LayerInput {
  name: string;
  dir?: fs.PathLike;
}

interface LayerElement {
  id: number;
  name: string;
  filename: string;
  path: string;
  weight: number;
}

interface Layer {
  id: number;
  name: string;
  elements: LayerElement[];
  totalWeight: number;
}

interface MetadataAttribute {
  trait_type: string;
  value: string;
}

interface Metadata {
  name: string;
  description: string;
  image: string;
  attributes: MetadataAttribute[];
}

export class Collection {
  name: string;
  dir: fs.PathLike;
  description: string;
  programId: PublicKey;
  account: PublicKey;

  splTokenMint: PublicKey | undefined;

  baseURL = '';
  assetsDirCID = '';
  metadataDirCID = '';

  extraMetadata: object = {};
  schema?: LayerSchema;
  layers?: Layer[];

  constructor(attributes: CollectionAttributes) {
    this.name = attributes.name;
    this.description = attributes.description;
    this.dir = attributes.dir;
    this.programId = attributes.programId;
    this.account = attributes.account;
  }

  private static async initSplToken() {
    if (!spl_token) {
      spl_token = await import('@solana/spl-token');
    }
  }

  initializeDir() {
    if (!this.schema || !this.layers) {
      throw new Error('Schema required for generating NFTs');
    }
    if (fs.existsSync(this.dir)) {
      fs.rmSync(this.dir, { recursive: true });
    }
    fs.mkdirSync(this.dir);
    fs.mkdirSync(path.join(this.dir.toString(), 'assets'));
    fs.mkdirSync(path.join(this.dir.toString(), 'metadata'));
  }

  readDirElements(dir: fs.PathLike) {
    if (fs.existsSync(dir)) {
      return fs.readdirSync(dir);
    } else {
      console.warn(`Directory not found: ${dir}`);
      return [];
    }
  }

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

  saveImage(_index: number, canvasInstance: canvas.Canvas) {
    fs.writeFileSync(
      path.join(this.dir.toString(), 'assets', `${_index}.png`),
      canvasInstance.toBuffer('image/png')
    );
  }

  saveMetadata(metadata: Metadata, _index: number) {
    fs.writeFileSync(
      path.join(this.dir.toString(), 'metadata', `${_index}.json`),
      JSON.stringify(metadata, null, 2)
    );
  }

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
              `File name can not contain "${DNA_DELIMITER}", please fix: ${i}`
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

    const layers: Layer[] = schema.layersOrder.map((layerObj, index) => {
      const dir = layerObj.dir
        ? layerObj.dir
        : path.join(schema.dir.toString(), layerObj.name);
      const elements = getElements(dir, schema.rarityDelimiter);
      let totalWeight = 0;
      elements.forEach((element) => {
        totalWeight += element.weight;
      });
      return {
        id: index,
        name: layerObj.name,
        elements: elements,
        totalWeight: totalWeight,
      };
    });

    this.schema = schema;
    this.layers = layers;
  }

  async createSPLTokenMint(connection: Connection, payer: Keypair): Promise<void> {
    await Collection.initSplToken();

    const mintKeypair = Keypair.generate();
    this.splTokenMint = mintKeypair.publicKey;

    const lamports = await connection.getMinimumBalanceForRentExemption(spl_token.MINT_SIZE);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: spl_token.MINT_SIZE,
        lamports,
        programId: spl_token.TOKEN_PROGRAM_ID,
      }),
      spl_token.createInitializeMintInstruction(
        mintKeypair.publicKey,
        0,
        payer.publicKey,
        payer.publicKey
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
  }

  async mintSPLToken(connection: Connection, payer: Keypair, recipient: PublicKey): Promise<void> {
    await Collection.initSplToken();

    if (!this.splTokenMint) {
      throw new Error('SPL Token mint not created yet');
    }

    const associatedTokenAccount = await spl_token.getAssociatedTokenAddress(
      this.splTokenMint,
      recipient
    );

    const transaction = new Transaction().add(
      spl_token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAccount,
        recipient,
        this.splTokenMint
      ),
      spl_token.createMintToInstruction(
        this.splTokenMint,
        associatedTokenAccount,
        payer.publicKey,
        1
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }

  async generate() {
    if (!this.schema || !this.layers) {
      throw new Error('Schema required for generating NFTs');
    }

    const createDna = (layers: Layer[]) => {
      const randomElementIds: number[] = [];
      layers.forEach((layer) => {
        const random = Math.random() * layer.totalWeight;
        for (let i = 0, sum = 0; i < layer.elements.length; i++) {
          sum += layer.elements[i].weight;
          if (sum >= random) {
            randomElementIds.push(layer.elements[i].id);
            break;
          }
        }
      });
      return randomElementIds.join(DNA_DELIMITER);
    };

    const isDnaUnique = (_dnaList: Set<string>, _dna: string) => {
      return !_dnaList.has(_dna);
    };

    const selectElements = (_dna: string, _layers: Layer[]) => {
      const mappedDnaToLayers = _layers.map((layer, index) => {
        const selectedElement: LayerElement | undefined = layer.elements.find(
          (e) => e.id.toString() === _dna.split(DNA_DELIMITER)[index]
        );
        if (selectedElement === undefined) {
          throw new Error('Something went wrong');
        }
        return selectedElement;
      });
      return mappedDnaToLayers;
    };

    const getMetadata = (_index: number, attributesList: MetadataAttribute[]) => {
      const tempMetadata: Metadata = {
        name: `${this.name} #${_index}`,
        description: this.description,
        image: `${this.baseURL}/${this.assetsDirCID}/${_index}.png`,
        attributes: attributesList,
        ...this.extraMetadata,
      };
      return tempMetadata;
    };

    const shuffle = (array: number[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };

    this.initializeDir();

    let indexCount = 1;
    let failedCount = 0;
    const abstractedIndexes: number[] = [];

    for (let i = 1; i <= this.schema.size; i++) {
      abstractedIndexes.push(i);
    }
    if (this.schema.shuffleIndexes) {
      shuffle(abstractedIndexes);
    }

    const progressBar = new ProgressBar('Generating NFTs', this.schema.size);
    progressBar.init();

    const canvasInstance = canvas.createCanvas(
      this.schema.format.width,
      this.schema.format.height
    );
    const ctx = canvasInstance.getContext('2d');
    ctx.imageSmoothingEnabled = this.schema.format.smoothing;

    const dnaList = new Set<string>();

    while (indexCount <= this.schema.size) {
      const newDna = createDna(this.layers);

      if (isDnaUnique(dnaList, newDna)) {
        const selectedElements: LayerElement[] = selectElements(newDna, this.layers);
        const loadedImages: Promise<canvas.Image | undefined>[] = [];
        selectedElements.forEach((element) => {
          loadedImages.push(this.loadImage(element));
        });

        await Promise.all(loadedImages).then((renderImageArray) => {
          ctx.clearRect(0, 0, this.schema!.format.width, this.schema!.format.height);

          if (this.schema!.background.generate) {
            if (this.schema!.background.static) {
              if (!this.schema!.background.default) {
                throw new Error('Default color is required for static background');
              }
              ctx.fillStyle = this.schema!.background.default;
            } else {
              ctx.fillStyle = `hsl(${Math.floor(Math.random() * 360)}, 100%, ${
                this.schema!.background.brightness
                  ? this.schema!.background.brightness
                  : '30%'
              })`;
            }
            ctx.fillRect(
              0,
              0,
              this.schema!.format.width,
              this.schema!.format.height
            );
          }

          const attributesList: MetadataAttribute[] = [];
          renderImageArray.forEach((img, index) => {
            if (img) {
              ctx.drawImage(
                img,
                0,
                0,
                this.schema!.format.width,
                this.schema!.format.height
              );
              attributesList.push({
                trait_type: this.layers![index].name,
                value: selectedElements[index].name,
              });
            }
          });

          this.saveImage(abstractedIndexes[0], canvasInstance);
          const meta = getMetadata(abstractedIndexes[0], attributesList);
          this.saveMetadata(meta, abstractedIndexes[0]);
        });

        progressBar.update(indexCount);
        indexCount++;
        dnaList.add(newDna);
        abstractedIndexes.shift();
      } else {
        failedCount++;
        if (failedCount >= this.schema.dnaCollisionTolerance) {
          throw new Error(
            `DNA Tolerance exceeded. More layers or elements are required to generate ${this.schema.size} images`
          );
        }
      }
    }
    console.log(
      `\n${this.schema.size} NFTs generated for ${this.name} in ${this.dir}`
    );
  }

  updateMetadataWithCID() {
    const metadataDir = path.join(this.dir.toString(), "metadata");
    const files = fs.readdirSync(metadataDir);
    if ((files && files.length) <= 0) {
      console.log(
        `No Metadata files were found in folder '${metadataDir}'`
      );
      return;
    }

    files.forEach((fileName) => {
      const filePath = path.join(metadataDir, fileName);
      const file_content = fs.readFileSync(filePath);
      const content = JSON.parse(file_content.toString());
      content.image = `${this.baseURL}/${this.assetsDirCID}/${
        path.parse(fileName).name
      }.png`;
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    });
  }
}