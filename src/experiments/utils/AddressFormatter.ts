import { StreetsById, AddressesByID } from '../../FullTextIndex';
import { getBuildingAsStr } from '../../utils';

export class AddressFormatter {
    constructor(
        private readonly streetsById: StreetsById = {},
        private readonly addressesByID: AddressesByID = {}
    ) {}

    public addressIDToString(addrID: number): string {
        const address = this.addressesByID[addrID];
        if (!address) {
            throw new Error('Address not found' + addrID);
        }
        const street = this.streetsById[address.streetID];
        const buildingString = getBuildingAsStr(address);
        return `${street.shortTypeRU} ${street.name_ru} ${buildingString}`;
    }
}
