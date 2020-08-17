import Debug from 'debug';
import fs from 'fs';
import { Address } from './types';

const debug = Debug('fts');

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

export const logTimeAsync = async <ReturnType>(
    fn: () => ReturnType | Promise<ReturnType>,
    label: string
): Promise<ReturnType> => {
    const start = Date.now();
    const res = await fn();
    const end = Date.now();
    debug(`${label} took ${end - start}ms`);
    return res;
};

export const logTimeSync = <ReturnType>(
    fn: () => ReturnType,
    label: string
): ReturnType => {
    const start = Date.now();
    const res = fn();
    const end = Date.now();
    debug(`${label} took ${end - start}ms`);
    return res;
};

export const loadJSON = async <T>(fileName: string): Promise<T> => {
    const data = await logTimeAsync(
        async () => JSON.parse(await fs.promises.readFile(fileName, 'utf8')),
        `loadJSON(${fileName})`
    );
    return data;
};

export const saveJSON = async (fileName: string, data: any): Promise<void> => {
    await logTimeAsync(
        async () =>
            await fs.promises.writeFile(fileName, JSON.stringify(data), 'utf8'),
        `saveJSON(${fileName})`
    );
};
