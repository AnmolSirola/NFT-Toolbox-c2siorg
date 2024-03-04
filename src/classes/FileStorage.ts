import { PathLike } from "fs";
import path from "path";
import fs from "fs";
import { filesFromPath } from "files-from-path";
import { Collection } from "./Collection";
import { Web3Stash } from "web3stash";
import { StorageService } from "web3stash/dist/mjs/services/base-storage";
import { Web3StashServices, Web3StashConfig } from "web3stash/dist/mjs/types";

export class FileStorage {
  serviceBaseURL: string;
  storageService: StorageService;

  constructor(storageServiceName: Web3StashServices, key: Web3StashConfig, serviceBaseUrl: string) {
    this.serviceBaseURL = serviceBaseUrl;
    this.storageService = Web3Stash(storageServiceName, key);
  }

  async uploadDirToService(dir: PathLike): Promise<string> {
    const files = await filesFromPath(dir, { pathPrefix: path.resolve(dir.toString()) });
    const cid = await this.storageService.uploadFiles(files);
    return cid.id;
  }

  async uploadFileToService(file: PathLike): Promise<string> {
    const filePath = path.resolve(file.toString());
    const cid = await this.storageService.uploadFile(filePath);
    return cid.id;
  }

  async uploadJSONToService(json: any): Promise<string> {
    const jsonString = JSON.stringify(json);
    const cid = await this.storageService.uploadJson(jsonString);
    return cid.id;
  }

  async uploadCollection(collection: Collection): Promise<{ metadataCID: string; assetCID: string }> {
    console.log("Uploading Assets...");
    const assetsFolderPath = path.join(collection.dir.toString(), "assets");
    const assetCID = await this.uploadDirToService(assetsFolderPath);
    collection.setBaseURL(this.serviceBaseURL);
    collection.setAssetsDirCID(assetCID);
    collection.updateMetadataWithCID();

    console.log("Uploading Metadata...");
    const metadataFolderPath = path.join(collection.dir.toString(), "metadata");
    const metadataCID = await this.uploadDirToService(metadataFolderPath);
    collection.setMetadataDirCID(metadataCID);

    console.log("Upload Complete");
    return { 
      metadataCID: metadataCID, 
      assetCID: assetCID 
    };
  }

  async uploadSingle(asset: PathLike, metadata: any): Promise<{ metadataCID: string; assetCID: string }> {
    console.log("Uploading Asset...");
    const assetCID = await this.uploadFileToService(asset);
    metadata.image = `${this.serviceBaseURL}/${assetCID}`;

    console.log("Uploading Metadata...");
    const metadataCID = await this.uploadJSONToService(
      JSON.stringify(metadata)
    );

    console.log("Upload Complete");
    return { 
      metadataCID: metadataCID, 
      assetCID: assetCID 
    };
  }
}