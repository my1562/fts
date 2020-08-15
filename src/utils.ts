import { Address } from './types';

export const getBuildingAsStr = (addr: Address): string => {
    let building = '';
    if (addr.number !== 0) {
        building = `${building}${addr.number}`;
    }
    if (addr.suffix !== '') {
        building = `${building}${addr.suffix}`;
    }
    if (addr.block !== '') {
        building = `${building} к. №${addr.block}`;
    }
    if (addr.detail !== '') {
        building = `${building} ${addr.detail}`;
        if (addr.detailNumber !== '') {
            building = `${building}${addr.detailNumber}`;
        }
    }
    return building;
};
