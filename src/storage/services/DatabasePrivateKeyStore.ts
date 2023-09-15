import { AbstractPrivateKeyStore } from '@0xpolygonid/js-sdk';
import { DataSource } from 'typeorm';
import { StorageEntity } from '../entities/storage.entity';
/**
 * Allows storing keys in the local storage of the browser
 * (NOT ENCRYPTED: DO NOT USE IN THE PRODUCTION)
 *
 * @export
 * @beta
 * @class DatabasePrivateKeyStore
 * @implements implements AbstractPrivateKeyStore interface
 */
export class DatabasePrivateKeyStore implements AbstractPrivateKeyStore {
  static readonly storageKey = 'keystore';

  dataSource = new DataSource({
    type:'postgres',
    host:process.env.POSTGRES_HOST,
    port: parseInt(<string> process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    synchronize: true,
    entities:[StorageEntity]
  });
  storageRepository = null;

  async initialize(_localStorageKey: string) {
    if (!this.dataSource.isInitialized) await this.dataSource.initialize();
    this.storageRepository = this.dataSource.getRepository(StorageEntity);
  }
  /**
   * Gets key from the local storage
   *
   * @param {{ alias: string }} args
   * @returns hex string
   */
  async get(args: { alias: string }): Promise<string> {
    
    const dataStr = (await this.storageRepository.findOneBy({key : DatabasePrivateKeyStore.storageKey})).value;
    if (!dataStr) {
      throw new Error('no key under given alias');
    }
    const data = JSON.parse(dataStr);
    const privateKey = data.find((d) => d.id === args.alias);
    if (!privateKey) {
      throw new Error('no key under given alias');
    }

    return privateKey.value;
  }

  /**
   * Import key to the local storage
   *
   * @param {{ alias: string; key: string }} args - alias and private key in the hex
   * @returns void
   */
  async importKey(args: { alias: string; key: string }): Promise<void> {
    var dataStr = (await this.storageRepository.findOneBy({key : DatabasePrivateKeyStore.storageKey}));
    if(dataStr) dataStr = dataStr.value;
    let data = [];
    if (dataStr) {
      data = JSON.parse(dataStr);
    }

    const index = data.findIndex((d) => d.id === args.alias);
    if (index > -1) {
      data[index].value = args.key;
    } else {
      data.push({ id: args.alias, value: args.key });
    }
    if(dataStr)
        await this.storageRepository.update({key : DatabasePrivateKeyStore.storageKey},{
            value : JSON.stringify(data)
        })
    else 
        await this.storageRepository.save({
            key : DatabasePrivateKeyStore.storageKey,
            value : JSON.stringify(data)
    })
  }
}
