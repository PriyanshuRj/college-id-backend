import { Injectable } from '@nestjs/common';

import {
  IdentityStorage,
  CredentialStorage,
  W3CCredential,
  BjjProvider,
  KmsKeyType,
  IdentityWallet,
  CredentialWallet,
  KMS,
  EthStateStorage,
  defaultEthConnectionConfig,
  core,
  ProofService,
  CredentialStatusType,
  IssuerResolver,
  RHSResolver,
  CredentialStatusResolverRegistry,
  CircuitId,
  Profile,
  Identity,
  FSCircuitStorage,
  IIdentityWallet,
  IDataStorage,
  EthConnectionConfig,
  ICircuitStorage,

} from '@0xpolygonid/js-sdk';

import { DatabasePrivateKeyStore } from 'src/storage/services/DatabasePrivateKeyStore';
import { DatabaseDataSource } from 'src/storage/services/storage.service';
import { MerkleTreeDBStorage } from 'src/storage/services/merkletree.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DIDEntity } from 'src/storage/entities/storage.entity';
import { Repository } from 'typeorm';
import path from "path";
const rhsUrl = 'https://rhs-staging.polygonid.me';
const rpcUrl = 'https://polygon-mumbai.g.alchemy.com/v2/pxEHk9k18RSb0YW-Rjv5xafvPgU72mVs';
const contractAddress = '0x134B1BE34911E39A8397ec6289782989729807a4';

@Injectable()
export class PolygonService {
  constructor(
    @InjectRepository(DIDEntity)
    private readonly didRepository: Repository<DIDEntity>
  ) { }

  /**
 * Initializes data storage for credentials, identities, and Merkle trees.
 * @returns {Promise<IDataStorage>} A promise that resolves to the initialized data storage object.
 */
  async initDataStorage(): Promise<IDataStorage> {

    let conf: EthConnectionConfig = defaultEthConnectionConfig;
    conf.contractAddress = contractAddress;
    conf.url = rpcUrl;
    const credentailDataSource = new DatabaseDataSource<W3CCredential>(CredentialStorage.storageKey);
    await credentailDataSource.initialize(CredentialStorage.storageKey);

    const identityDataSource = new DatabaseDataSource<Identity>(IdentityStorage.identitiesStorageKey);
    await identityDataSource.initialize(IdentityStorage.identitiesStorageKey);

    const identityDataSourceProfiles = new DatabaseDataSource<Profile>(IdentityStorage.profilesStorageKey);
    await identityDataSourceProfiles.initialize(IdentityStorage.profilesStorageKey);

    const mtDataSource = new MerkleTreeDBStorage(40);
    await mtDataSource.initialize(40);

    let dataStorage = {
      credential: new CredentialStorage(
        credentailDataSource
      ),
      identity: new IdentityStorage(
        identityDataSource,
        identityDataSourceProfiles
      ),
      mt: mtDataSource,
      states: new EthStateStorage(defaultEthConnectionConfig),
    };
    return dataStorage;
  }

  /**
 * Initializes a credential wallet with credential status resolvers.
 * @param {IDataStorage} dataStorage - The data storage object.
 * @returns {Promise<CredentialWallet>} A promise that resolves to the initialized credential wallet.
 */
  async initCredentialWallet(dataStorage: IDataStorage) : Promise<CredentialWallet>{
    const resolvers = new CredentialStatusResolverRegistry();
    resolvers.register(
      CredentialStatusType.SparseMerkleTreeProof,
      new IssuerResolver()
    );
    resolvers.register(
      CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      new RHSResolver(dataStorage.states)
    );
    return new CredentialWallet(dataStorage, resolvers);
  }

  /**
 * Initializes an identity wallet with key management and data storage.
 * @param {IDataStorage} dataStorage - The data storage object.
 * @param {CredentialWallet} credentialWallet - The initialized credential wallet.
 * @returns {Promise<IIdentityWallet>} A promise that resolves to the initialized identity wallet.
 */
  async initIdentityWallet(dataStorage: IDataStorage, credentialWallet: CredentialWallet) : Promise<IIdentityWallet> {
    const memoryKeyStore = new DatabasePrivateKeyStore();
    await memoryKeyStore.initialize(process.env.MEMORY_STORAGE_KEY);
    const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, memoryKeyStore);
    const kms = new KMS();
    kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

    return new IdentityWallet(kms, dataStorage, credentialWallet);
  }

  /**
 * Initializes data storage and wallets for credentials and identities.
 * @returns {Promise<{ dataStorage: IDataStorage, identityWallet: IIdentityWallet, credentialWallet: CredentialWallet }>}
 * A promise that resolves to an object containing the initialized data storage and wallets.
 */
  async initDataStorageAndWallets() : Promise<{ dataStorage: IDataStorage, identityWallet: IIdentityWallet, credentialWallet: CredentialWallet }> {
    const dataStorage = await this.initDataStorage();
    const credentialWallet = await this.initCredentialWallet(dataStorage);
    const identityWallet = await this.initIdentityWallet(dataStorage, credentialWallet);
    return { dataStorage, identityWallet, credentialWallet };
  }

  /**
 * Initializes a circuit storage for zk-SNARK circuits.
 * @returns {Promise<ICircuitStorage>} A promise that resolves to the initialized circuit storage.
 */
  async initCircuitStorage() : Promise<ICircuitStorage>{

    console.log(__dirname, path.join(__dirname, "../../src/polygon"))
    return new FSCircuitStorage({ dirname: path.join(__dirname, process.env.CIRCUITS_FOLDER) });
  }

  /**
 * Creates an identity for the given email and stores it in the database.
 * @param {string} email - The email for which to create an identity.
 * @returns {Promise<{ did: any }>} A promise that resolves to the created identity (DID).
 */
  async createIdentity(email: string) : Promise<{did: any}> {

    const DIDInStorage = await this.didRepository.findOneBy({ email });
    if (DIDInStorage) {
      return { did: JSON.parse(DIDInStorage.did) };
    }
    const { dataStorage, identityWallet, credentialWallet } = await this.initDataStorageAndWallets();

    const { did, credential } = await identityWallet.createIdentity({
      method: core.DidMethod.Iden3,
      blockchain: core.Blockchain.Polygon,
      networkId: core.NetworkId.Mumbai,
      revocationOpts: {
        id: 'https://rhs-staging.polygonid.me',
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      },
    });

    await this.didRepository.save({
      email,
      did: JSON.stringify(did)
    })
    return { did };
  }

  /**
 * Saves a list of credentials to the data storage.
 * @param {any[]} credentials - The list of credentials to be saved.
 * @returns {Promise<boolean>} A promise that resolves to true when credentials are successfully saved.
 */
  async saveAllCredentialsToStorage(credentials: any[]) : Promise<boolean> {
    const { dataStorage, identityWallet, credentialWallet } =
    await this.initDataStorageAndWallets();
    await dataStorage.credential.saveAllCredentials(credentials);
    return true;
  }

  /**
 * Issues credentials based on requests and stores them in the data storage.
 * @param {any[]} req - An array of credential issuance requests.
 * @param {string} email - The email of the user for whom credentials are issued.
 * @returns {Promise<any[]>} A promise that resolves to an array of issued credentials.
 */
  async issueCredential(req: [any], email: string) : Promise<any[]> {
    const { dataStorage, identityWallet, credentialWallet } = await this.initDataStorageAndWallets();

    const DIDmain = await this.createIdentity(email);
    const allDIDs = await dataStorage.identity.getAllIdentities();
    const didFound = allDIDs.filter(did => core.DID.parse(did.did).id == DIDmain.did.id)
    var did = core.DID.parse(didFound[0].did);

    let credentials = [];
    for (let i = 0; i < req.length; i++) {
      req[i].cred.expiration = 12345678888;
      req[i].cred.revocationOpts = {
        id: 'https://rhs-staging.polygonid.me',
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        baseUrl: rhsUrl,
      };

      const credential = await identityWallet.issueCredential(did, req[i].cred);
      credentials.push(credential);
    }
    await this.saveAllCredentialsToStorage(credentials);
    console.log(credentials)
    return credentials;
  }

  /**
 * Generates a proof request signature for verification.
 * @param {any} req - The proof request data.
 * @returns {Promise<any>} A promise that resolves to the proof request signature.
 */
  async genrateProofRequest(req: any) : Promise<any> {
    console.log(req)
    const proofReqSig = {
      id: 1,
      circuitId: CircuitId.AtomicQuerySigV2,
      optional: false,
      query: {
        allowedIssuers: ['*'],
        credentialSubject: req,
      },
    };
    return proofReqSig;
  }

  /**
 * Initializes the proof service for verifying proofs.
 * @param {any} identityWallet - The initialized identity wallet.
 * @param {any} credentialWallet - The initialized credential wallet.
 * @param {any} circuitStorage - The initialized circuit storage.
 * @param {any} stateStorage - The initialized state storage.
 * @returns {Promise<any>} A promise that resolves to the initialized proof service.
 */
  async initProofService(
    identityWallet: any,
    credentialWallet: any,
    circuitStorage: any,
    stateStorage: any
  ) : Promise<any> {
    return new ProofService(
      identityWallet,
      credentialWallet,
      circuitStorage,
      stateStorage
    );
  }

  /**
 * Verifies a proof using the provided proof and public signals.
 * @param {any} proof - The proof data.
 * @param {any} pub_signals - The public signals.
 * @returns {Promise<boolean>} A promise that resolves to true if the proof is valid.
 */
  async verify(proof: any, pub_signals: any) : Promise<boolean> {

    const { dataStorage, identityWallet, credentialWallet } = await this.initDataStorageAndWallets();
    const circuitStorage = await this.initCircuitStorage();

    const proofService = await this.initProofService(
      identityWallet,
      credentialWallet,
      circuitStorage,
      dataStorage.states
    );

    proof = JSON.parse(proof);
    pub_signals = JSON.parse(pub_signals);

    const zkp = { proof, pub_signals };

    const mtpProofOk = await proofService.verifyProof(
      zkp,
      CircuitId.AtomicQuerySigV2
    );

    return (mtpProofOk);
  }

  /**
 * Generates a proof for a given proof request and stores it in the data storage.
 * @param {any} data - The proof request data.
 * @param {string} email - The email of the user generating the proof.
 * @returns {Promise<{proof : string, pub_signals : string}>} A promise that resolves to the generated proof and public signals.
 */
  async generateProof(data: { proofReq: any }, email: string) :Promise<{proof : string, pub_signals : string}> {


    const { dataStorage, identityWallet, credentialWallet } = await this.initDataStorageAndWallets();

    const circuitStorage = await this.initCircuitStorage();

    const proofService = await this.initProofService(
      identityWallet,
      credentialWallet,
      circuitStorage,
      dataStorage.states
    );
    const creds = await credentialWallet.findByQuery(data.proofReq.query);

    const DIDmain = await this.createIdentity(email);
    const allDIDs = await dataStorage.identity.getAllIdentities();
    const didFound = allDIDs.filter(did => core.DID.parse(did.did).id == DIDmain.did.id)
    var did = core.DID.parse(didFound[0].did);
    console.log("Found Cred")
    const { proof, pub_signals } = await proofService.generateProof(
      data.proofReq,
      did,
      {
        skipRevocation: true,
        credential: creds[0],
        challenge: BigInt(0)
      }
    )

    return {
      proof: JSON.stringify(proof),
      pub_signals: JSON.stringify(pub_signals),
    };

  }

  /**
 * Revokes an issued credential for a specific user.
 * @param {string} email - The email of the user revoking the credential.
 * @param {object} revokeReq - The revocation request containing the credential ID to revoke.
 * @returns {Promise<any>} A promise that resolves to the revocation nonce.
 */
  async revokeIssuedCredentials(email: string, revokeReq: { id: string }) : Promise<Number> {
    const { dataStorage, identityWallet, credentialWallet } = await this.initDataStorageAndWallets();
    const creds = await credentialWallet.list();
    const required = creds.filter((cred) => cred.id == revokeReq.id)[0];
    const DIDmain = await this.createIdentity(email);
    const allDIDs = await dataStorage.identity.getAllIdentities();
    const didFound = allDIDs.filter(did => core.DID.parse(did.did).id == DIDmain.did.id)
    var did = core.DID.parse(didFound[0].did);
    const nounce = await identityWallet.revokeCredential(did, required);
    return nounce;
  }

}
