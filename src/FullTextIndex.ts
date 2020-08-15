import fs from 'fs';
import { TokenStore } from './TokenStore';
import { Address, StreetAR, LevenshteinResponse } from './types';
import { getBuildingAsStr } from './utils';
import _ from 'lodash';
const levenshtein = require('damerau-levenshtein');

const STOP_WORD_LIMIT = 5000;

const loadStreets = async (): Promise<{ [id: string]: StreetAR }> => {
    const streetsById = JSON.parse(
        await fs.promises.readFile(
            `${__dirname}/../../my1562normalizer/data/streetsAR.json`,
            'utf8'
        )
    ) as { [id: string]: StreetAR };
    return streetsById;
};

const loadAddresses = async (): Promise<{ [id: string]: Address }> => {
    const addresses = JSON.parse(
        await fs.promises.readFile(
            `${__dirname}/../../my1562normalizer/data/addresses.json`,
            'utf8'
        )
    );
    return addresses;
};

const indexAddressesByStreetID = (addressesByID: {
    [id: string]: Address;
}): { [streetID: string]: number[] } => {
    const addressIDsByStreetID: { [streetID: string]: number[] } = {};
    for (const address of Object.values(addressesByID)) {
        if (!addressIDsByStreetID[address.streetID]) {
            addressIDsByStreetID[address.streetID] = [];
        }
        addressIDsByStreetID[address.streetID].push(address.id);
    }
    return addressIDsByStreetID;
};

export class FullTextIndex {
    private streetsById: { [id: string]: StreetAR } = {};
    private addressesByID: {
        [id: string]: Address;
    } = {};
    private addressIDsByStreetID: { [streetID: string]: number[] } = {};
    private tokens: TokenStore = new TokenStore();
    private addressIDsByTokenID: { [tokenID: number]: number[] } = {};
    private tokenizedVariantsByAddressID: {
        [addressID: number]: number[][];
    } = {};

    constructor() {}

    async initialize() {
        this.streetsById = await loadStreets();
        this.addressesByID = await loadAddresses();
        this.addressIDsByStreetID = indexAddressesByStreetID(
            this.addressesByID
        );
        this.buildSearchIndex();
    }

    public search(query: string): { similarity: number; addressID: number }[] {
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
            .value();

        return addressIDsOrderedBySimilarity;
    }

    public addressIDToString(addrID: number): string {
        const address = this.addressesByID[addrID];
        if (!address) {
            throw new Error('Address not found' + addrID);
        }
        const street = this.streetsById[address.streetID];
        const buildingString = getBuildingAsStr(address);
        return `${street.shortTypeRU} ${street.name_ru} ${buildingString}`;
    }

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
                if (!token?.match(/^[0-9]+$/)) {
                    this.addressIDsByTokenID[tokenID].push(addrId);
                }
                if ((token?.length ?? 0) > 3) {
                    this.addressIDsByTokenID[tokenID].push(addrId);
                }

                //TODO: introduce constant
                if (
                    this.addressIDsByTokenID[tokenID].length > STOP_WORD_LIMIT
                ) {
                    stopTokens.add(tokenID);
                    delete this.addressIDsByTokenID[tokenID];
                    console.log('stopWord:', this.tokens.getTokenById(tokenID));
                }
            }
        }
    }

    private getAllVariantsOfStreet(street: StreetAR): string[] {
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
        const streetVariants = this.getAllVariantsOfStreet(street);
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
        console.time('tokenizeAllAddresses');
        for (const [street, address] of this.genAllAddresses()) {
            const variants = this.getAllVariantsOfAddress(street, address);
            for (const variant of variants) {
                const tokenIds = this.tokens.addText(variant);
                yield [address.id, tokenIds];
            }
        }
        console.timeEnd('tokenizeAllAddresses');
    }

    private *genAllAddresses(): Generator<[StreetAR, Address], void> {
        for (const [streetID, addressIDsOfCurrentStreet] of Object.entries(
            this.addressIDsByStreetID
        )) {
            const street = this.streetsById[streetID];
            for (const addressID of addressIDsOfCurrentStreet) {
                const address = this.addressesByID[addressID];
                const { detail } = address;
                if (detail.startsWith('гараж')) {
                    continue;
                }
                if (detail.startsWith('ділянка')) {
                    continue;
                }
                yield [street, address];
            }
        }
    }
}
