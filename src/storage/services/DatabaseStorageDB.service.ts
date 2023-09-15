import { Bytes, Node, ITreeStorage, Hash, ZERO_HASH, NODE_TYPE_EMPTY, NODE_TYPE_LEAF, NODE_TYPE_MIDDLE, NodeEmpty, NodeLeaf, NodeMiddle, bytes2Hex } from '@iden3/js-merkletree';
import { InjectRepository } from '@nestjs/typeorm';
import { StorageEntity } from '../entities/storage.entity';
import { Repository } from 'typeorm';

export class DatabaseStorageDB {
  #currentRoot: Hash;

  constructor(
    private readonly _prefix: Bytes,
    @InjectRepository(StorageEntity)
    private readonly storageRepository: Repository<StorageEntity>,
    
  ) {
    (async () => {
      try {

        // await this.setRootFromBytes(_prefix);

      } catch (error) {
        console.error("Error during initialization:", error);
      }
    })();
    
  }
  /** Returns the current root of the merkle tree  **/
  async getRoot(): Promise<Hash> {
    return this.#currentRoot;
  }

  /** Sets the root of the merkle tree from a prefix input value used when initializing the class  
   * @param {Bytes} _prefix - initial root value
   * **/
  async setRootFromBytes(_prefix: Bytes) {

    const rootStr: StorageEntity = await this.storageRepository.findOne({
      where: {
        key: bytes2Hex(_prefix)
      }
    })

    if (rootStr) {
      const bytes: number[] = JSON.parse(rootStr.value);

      this.#currentRoot = new Hash(Uint8Array.from(bytes));
    } else {
      this.#currentRoot = ZERO_HASH;
    }
  }

    /** Returns a Promise which resolves to a Node when requested (A certin node of the merkle tree)
      * @param {Bytes} k - key value
 **/
  async get(k: Bytes): Promise<Node | undefined> {
    const kBytes = new Uint8Array([...this._prefix, ...k]);
    const key = bytes2Hex(kBytes);
    const val = (await this.storageRepository.findOne({
      where: {
        key
      }
    })).value;

    if (val === null) {
      return undefined;
    }

    const obj = JSON.parse(val);
    switch (obj.type) {
      case NODE_TYPE_EMPTY:
        return new NodeEmpty();
      case NODE_TYPE_MIDDLE:
        const cL = new Hash(Uint8Array.from(obj.childL));
        const cR = new Hash(Uint8Array.from(obj.childR));

        return new NodeMiddle(cL, cR);
      case NODE_TYPE_LEAF:
        const k = new Hash(Uint8Array.from(obj.entry[0]));
        const v = new Hash(Uint8Array.from(obj.entry[1]));

        return new NodeLeaf(k, v);
    }

    throw `error: value found for key ${bytes2Hex(kBytes)} is not of type Node`;
  }

      /** Sets the root of the merkle tree to a new Hash passed
      * @param {Hash} r - root hash
 **/
  async setRoot(r: Hash): Promise<void> {
    this.#currentRoot = r;
    const root = await this.storageRepository.findOne({where : {
      key : bytes2Hex(this._prefix)
    }})
    if(root){

      await this.storageRepository.update({
        key: bytes2Hex(this._prefix)
      }, {
        value: JSON.stringify(Array.from(r.bytes))
      })
    }
    else {
      await this.storageRepository.save({
        key: bytes2Hex(this._prefix),
        value: JSON.stringify(Array.from(r.bytes))
      })
    }
  }

        /** Puts a new node into the merkle tree
      * @param {Bytes} k - key value
      * @param {Node} n - node to be inserted
 **/
  async put(k: Bytes, n: Node): Promise<void> {
    const kBytes = new Uint8Array([...this._prefix, ...k]);
    const key = bytes2Hex(kBytes);
    const toSerialize: Record<string, unknown> = {
      type: n.type
    };
    if (n instanceof NodeMiddle) {
      toSerialize.childL = Array.from(n.childL.bytes);
      toSerialize.childR = Array.from(n.childR.bytes);
    } else if (n instanceof NodeLeaf) {
      toSerialize.entry = [Array.from(n.entry[0].bytes), Array.from(n.entry[1].bytes)];
    }
    const val = JSON.stringify(toSerialize);
    await this.storageRepository.save({
      key,
      value: val
    })
  }
}
