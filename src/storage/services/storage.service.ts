import { StorageEntity } from '../entities/storage.entity';
import { IDataSource } from '@0xpolygonid/js-sdk';
import { DataSource } from 'typeorm';

/**
 * Storage in the backend, uses database
 *
 * @export
 * @beta
 * @class StorageService
 * @template Type
 */

export class DatabaseDataSource<Type> implements IDataSource<Type> {
  // private _localStorageKey: string;


  storageRepository = null;
  dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(<string>process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    synchronize: true,
    entities: [StorageEntity]
  });
  constructor(
    private _localStorageKey: string
  ) {
    // this.initialize(_localStorageKey);
  }

  async initialize(_localStorageKey: string) {
    if (!this.dataSource.isInitialized) await this.dataSource.initialize();

    this._localStorageKey = _localStorageKey;
    this.storageRepository = this.dataSource.getRepository(StorageEntity)
    const data = await this.storageRepository.findOne({
      where: {
        key: _localStorageKey
      }
    });

    
    if (!data) await this.storageRepository.save({
      key: _localStorageKey,
      value: JSON.stringify([])
    })
  }


  /**
 *
 * saves value to the database
 * @param {string} key - key value
 * @param {Type} value - value to store
 * @param {string} [keyName='id'] -  key name
 */
  async save(key: string, value: Type, keyName = 'id'): Promise<void> {
    if (this.storageRepository) {
      var data = (await this.storageRepository.findOne({
        where: {
          key: this._localStorageKey
        }
      })).value;
     
      const items = JSON.parse(data) as Type[];
      const itemIndex = items.findIndex((i) => i[keyName] === key);
      if (itemIndex === -1) {
        items.push(value);
      } else {
        items[itemIndex] = value;
      }
      await this.storageRepository.update({
        key: this._localStorageKey
      }, {
        key: this._localStorageKey,
        value: JSON.stringify(items)
      })
    }
  }

  /**
   * gets value from the database by given key
   * @param {string} key - key value
   * @param {string}  [keyName='id'] -  key name
   */

  async get(key: string, keyName = 'id'): Promise<Type | undefined> {
    const data = (await this.storageRepository.findOne({
      where: {
        key: this._localStorageKey
      }
    })).value;
    const parsedData = data && (JSON.parse(data) as Type[]);
    return parsedData.find((t) => t[keyName] === key);
  }

  /**
* loads all from the database
*/
  async load(): Promise<Type[]> {
    const data = (await this.storageRepository.findOne({
      where: {
        key: this._localStorageKey
      }
    })).value;
    return data && JSON.parse(data);
  }

  /**
 * deletes item from the database
 * @param {string} key - key value
 * @param {string}  [keyName='id'] -  key name
 */
  async delete(key: string, keyName = 'id'): Promise<void> {
    const dataStr = (await this.storageRepository.findOne({
      where: {
        key: this._localStorageKey
      }
    })).value;
    const data = JSON.parse(dataStr) as Type[];
    const items = data.filter((i) => i[keyName] !== key);
    if (data.length === items.length) {
      throw new Error(`'item not found to delete: ${key}`);
    }
    await this.storageRepository.update({
      key: this._localStorageKey
    }, {
      key: this._localStorageKey,
      value: JSON.stringify(items)
    })
  }

}
