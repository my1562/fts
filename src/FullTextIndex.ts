import Debug from 'debug';
import _ from 'lodash';
import { TokenStore, TokenStoreExportedData } from './TokenStore';
import { Address, LevenshteinResponse, StreetAR } from './types';
import { getBuildingAsStr, logTimeSync } from './utils';
const levenshtein = require('damerau-levenshtein');

const debug = Debug('fts');

const STOP_WORD_LIMIT = 600;

export type AddressIDsByTokenID = {
    [tokenID: number]: number[];
};
export type TokenizedVariantsByAddressID = {
    [addressID: number]: number[][];
};
export type AddressIDsByStreetID = {
    [streetID: string]: number[];
};
export type StreetsById = {
    [streetID: string]: StreetAR;
};
export type AddressesByID = {
    [addressID: string]: Address;
};
export type DecommunizationMap = {
    //Old street IDs
    [newStreetID: string]: number[];
};

export interface FullTextIndexExportedData {
    addressIDsByTokenID: AddressIDsByTokenID;
    tokenizedVariantsByAddressID: TokenizedVariantsByAddressID;
    addressIDsByStreetID: AddressIDsByStreetID;
    tokens: TokenStoreExportedData;
}

export class FullTextIndex {
    private isInitialized = false;
    private addressIDsByStreetID: AddressIDsByStreetID = {};
    private addressIDsByTokenID: AddressIDsByTokenID = {};
    private tokenizedVariantsByAddressID: TokenizedVariantsByAddressID = {};
    private decommunizationMap: DecommunizationMap = {};
    private readonly tokens: TokenStore = new TokenStore();

    constructor(
        private readonly streetsById: StreetsById = {},
        private readonly addressesByID: AddressesByID = {}
    ) {}

    private getAddressSimilarity(
        tokenizedQuery: number[],
        tokenizedAddressVariants: number[][]
    ): number {
        let maxSimilarity = 0;
        for (const tokenizedVariant of tokenizedAddressVariants) {
            const lev: LevenshteinResponse = levenshtein(
                tokenizedVariant,
                tokenizedQuery
            );
            if (maxSimilarity < lev.similarity) {
                maxSimilarity = lev.similarity;
            }
        }
        return maxSimilarity;
    }
    private indexAddressesByStreetID(addressesByID: {
        [id: string]: Address;
    }): { [streetID: string]: number[] } {
        const result: { [streetID: string]: number[] } = {};
        for (const address of Object.values(addressesByID)) {
            if (!result[address.streetID]) {
                result[address.streetID] = [];
            }
            result[address.streetID].push(address.id);
        }
        return result;
    }

    private buildSearchIndex() {
        const stopTokens = new Set<number>();

        for (const [addrId, tokenIDs] of this.genTokenizeAllAddresses()) {
            if (!this.tokenizedVariantsByAddressID[addrId]) {
                this.tokenizedVariantsByAddressID[addrId] = [];
            }

            this.tokenizedVariantsByAddressID[addrId].push(tokenIDs);

            for (const tokenID of tokenIDs) {
                if (stopTokens.has(tokenID)) {
                    continue;
                }
                if (!this.addressIDsByTokenID[tokenID]) {
                    this.addressIDsByTokenID[tokenID] = [];
                }

                const token = this.tokens.getTokenById(tokenID);
                if (
                    !token?.match(/^[0-9]+$/) &&
                    (token?.length ?? 0) > 3 &&
                    this.addressIDsByTokenID[tokenID][
                        this.addressIDsByTokenID[tokenID].length - 1
                    ] !== addrId
                ) {
                    this.addressIDsByTokenID[tokenID].push(addrId);
                }

                //TODO: introduce constant
                if (
                    this.addressIDsByTokenID[tokenID].length > STOP_WORD_LIMIT
                ) {
                    stopTokens.add(tokenID);
                    delete this.addressIDsByTokenID[tokenID];
                    debug(`stopWord: ${this.tokens.getTokenById(tokenID)}`);
                }
            }
        }
    }

    private getAllRelatedStreets(newStreetID: number): StreetAR[] {
        const oldStreetIDs = this.decommunizationMap[newStreetID];
        if (oldStreetIDs?.length) {
            return _(this.streetsById)
                .pick([newStreetID, ...oldStreetIDs])
                .values()
                .value();
        }
        return [this.streetsById[newStreetID]];
    }

    private getAllVariantsOfStreetWriting(street: StreetAR): string[] {
        return [
            `${street.shortTypeRU} ${street.name_ru}`,
            `${street.typeRU} ${street.name_ru}`,
            `${street.shortTypeUKR} ${street.name_ukr}`,
            `${street.typeUKR} ${street.name_ukr}`,
        ];
    }
    private getAllVariantsOfBuilding(addr: Address): string[] {
        return [getBuildingAsStr(addr)];
    }

    private getAllVariantsOfAddress(street: StreetAR, addr: Address): string[] {
        const streetVariants = _(this.getAllRelatedStreets(street.id))
            .map((street) => this.getAllVariantsOfStreetWriting(street))
            .flatten()
            .value();
        const bldgVariants = this.getAllVariantsOfBuilding(addr);
        const variants = [];
        for (const streetVariant of streetVariants) {
            for (const bldgVariant of bldgVariants) {
                variants.push(`${streetVariant} ${bldgVariant}`);
            }
        }
        return variants;
    }

    private *genTokenizeAllAddresses(): Generator<[number, number[]], void> {
        for (const [street, address] of this.genAllAddresses()) {
            const variants = this.getAllVariantsOfAddress(street, address);
            for (const variant of variants) {
                const tokenIds = this.tokens.addText(variant);
                yield [address.id, tokenIds];
            }
        }
    }

    private *genAllAddresses(): Generator<[StreetAR, Address], void> {
        for (const [streetID, addressIDsOfCurrentStreet] of Object.entries(
            this.addressIDsByStreetID
        )) {
            const street = this.streetsById[streetID];
            for (const addressID of addressIDsOfCurrentStreet) {
                const address = this.addressesByID[addressID];
                const { detail } = address;
                //Skip garages, garden houses, dachas, etc
                if (detail.length) {
                    continue;
                }
                yield [street, address];
            }
        }
    }

    private getDecommunizationMap(
        streetsById: StreetsById
    ): DecommunizationMap {
        const decom: DecommunizationMap = {};
        for (const [streetID, oldStreet] of Object.entries(streetsById)) {
            if (oldStreet.Children.length) {
                for (const newStreet of oldStreet.Children) {
                    if (!decom[newStreet.id]) {
                        decom[newStreet.id] = [];
                    }
                    decom[newStreet.id].push(oldStreet.id);
                }
            }
        }
        return decom;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }
        this.addressIDsByStreetID = this.indexAddressesByStreetID(
            this.addressesByID
        );
        this.decommunizationMap = this.getDecommunizationMap(this.streetsById);
        logTimeSync(() => {
            this.buildSearchIndex();
        }, 'buildSearchIndex');
        this.isInitialized = true;
    }

    public importData(data: FullTextIndexExportedData): void {
        if (this.isInitialized) {
            throw new Error('Already initialized');
        }
        const {
            addressIDsByStreetID,
            addressIDsByTokenID,
            tokenizedVariantsByAddressID,
            tokens,
        } = data;

        this.addressIDsByStreetID = addressIDsByStreetID;
        this.addressIDsByTokenID = addressIDsByTokenID;
        this.tokenizedVariantsByAddressID = tokenizedVariantsByAddressID;
        this.tokens.importData(tokens);
    }

    public exportData(): FullTextIndexExportedData {
        return {
            addressIDsByTokenID: this.addressIDsByTokenID,
            tokenizedVariantsByAddressID: this.tokenizedVariantsByAddressID,
            addressIDsByStreetID: this.addressIDsByStreetID,
            tokens: this.tokens.exportData(),
        };
    }

    public search(
        query: string,
        limit: number = 10
    ): { similarity: number; addressID: number }[] {
        const queryTokenIDs = this.tokens.tokenizeText(query);
        const addressCandidates = _(this.addressIDsByTokenID)
            .pick(queryTokenIDs)
            .values()
            .flatten()
            .uniq()
            .value();

        const tokenizedAddressCandidates = _(this.tokenizedVariantsByAddressID)
            .pick(addressCandidates)
            .toPairs()
            .value();

        const addressIDsOrderedBySimilarity = _(tokenizedAddressCandidates)
            .map<[number, number]>(
                ([addressID, tokenizedVariantsOfCurrentAddress]) => [
                    parseInt(addressID, 10),
                    this.getAddressSimilarity(
                        queryTokenIDs,
                        tokenizedVariantsOfCurrentAddress
                    ),
                ]
            )
            .map(([addressID, similarity]) => ({
                addressID,
                similarity,
            }))
            .orderBy(['similarity'], ['desc'])
            .slice(0, limit)
            .value();

        return addressIDsOrderedBySimilarity;
    }
}
