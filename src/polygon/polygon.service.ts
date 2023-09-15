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

  async initIdentityWallet(dataStorage: IDataStorage, credentialWallet: CredentialWallet) : Promise<IIdentityWallet> {
    const memoryKeyStore = new DatabasePrivateKeyStore();
    await memoryKeyStore.initialize(process.env.MEMORY_STORAGE_KEY);
    const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, memoryKeyStore);
    const kms = new KMS();
    kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

    return new IdentityWallet(kms, dataStorage, credentialWallet);
  }

  async initDataStorageAndWallets() {
    const dataStorage = await this.initDataStorage();
    const credentialWallet = await this.initCredentialWallet(dataStorage);
    const identityWallet = await this.initIdentityWallet(dataStorage, credentialWallet);
    return { dataStorage, identityWallet, credentialWallet };
  }
  async initCircuitStorage() : Promise<ICircuitStorage>{

    console.log(__dirname, path.join(__dirname, "../../src/polygon"))
    return new FSCircuitStorage({ dirname: path.join(__dirname, process.env.CIRCUITS_FOLDER) });
  }

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

  async issueCredential(req: any, email: string) {
    const { dataStorage, identityWallet, credentialWallet } = await this.initDataStorageAndWallets();

    const DIDmain = await this.createIdentity(email);
    const allDIDs = await dataStorage.identity.getAllIdentities();
    const didFound = allDIDs.filter(did => core.DID.parse(did.did).id == DIDmain.did.id)
    var did = core.DID.parse(didFound[0].did);


    console.log({ did })
    let credentials = [];
    for (let i = 0; i < req.length; i++) {
      console.log(req[i])
      req[i].cred.expiration = 12345678888;
      req[i].cred.revocationOpts = {
        id: 'https://rhs-staging.polygonid.me',
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        baseUrl: rhsUrl,
      };

      const credential = await identityWallet.issueCredential(did, req[i].cred);
      credentials.push(credential);
    }
    console.log(credentials)
    return credentials;
  }


  async createProofRequest(req: any) {
    console.log(req)
    const proofReqSig = {
      id: 1,
      circuitId: CircuitId.AtomicQuerySigV2,
      optional: false,
      query: {
        allowedIssuers: ['*'],
        type: 'VoterID',
        context: 'https://raw.githubusercontent.com/mithesh16/PolygonIDSchemas/main/VoterIDSchema/voterID.jsonld',
        credentialSubject: req,
      },
    };
    return proofReqSig;
  }

  async initProofService(
    identityWallet: any,
    credentialWallet: any,
    circuitStorage: any,
    stateStorage: any
  ) {
    return new ProofService(
      identityWallet,
      credentialWallet,
      circuitStorage,
      stateStorage
    );
  }

  async verify(proof: any, pub_signals: any) {

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

  async saveAllCredentialsToStorage(credentials: any) {
    const { dataStorage, identityWallet, credentialWallet } =
      await this.initDataStorageAndWallets();
    const res = await dataStorage.credential.saveAllCredentials(credentials);
    return true;
  }


  async generateProof(data: { proofReq: any }, email: string) {


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


    // verifier side
    // const mtpProofOk = await proofService.verifyProof(
    //   { proof, pub_signals },
    //   CircuitId.AtomicQuerySigV2
    // );

    return {
      proof: JSON.stringify(proof),
      pub_signals: JSON.stringify(pub_signals),
    };

  }

  async revokeIssuedCredentials(email: string, revokeReq: { id: string }) {
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
