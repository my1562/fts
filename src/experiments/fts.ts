import { FullTextIndex } from '../FullTextIndex';
import { loadJSON, logTimeSync } from '../utils';
import { StreetAR, Address } from '../types';
import { AddressFormatter } from './utils/AddressFormatter';

const searches = [
    'ленина 16',
    'ленина 15',
    'григоровское , 55',
    'григоровское шоссе 57а',
    'проспект науки 7',
    'зойфера 3',
    'Фесенковский въезд, 12',
    'фесенковский 12',
    'гвардейцев-широнинцев 59',
    'клапцова 4',
    'котлова 1',
    'котлова 230/1',
];

const createAndBuild = async () => {
    const streets = await loadJSON<{ [id: string]: StreetAR }>(
        `${__dirname}/../../../my1562normalizer/data/streetsAR.json`
    );
    const addresses = await loadJSON<{ [id: string]: Address }>(
        `${__dirname}/../../../my1562normalizer/data/addresses.json`
    );

    const index = new FullTextIndex(streets, addresses);
    await index.initialize();
    const formatter = new AddressFormatter(streets, addresses);
    return { formatter, index };
};

const createAndImport = async () => {
    const streets = await loadJSON<{ [id: string]: StreetAR }>(
        `${__dirname}/../../../my1562normalizer/data/streetsAR.json`
    );
    const addresses = await loadJSON<{ [id: string]: Address }>(
        `${__dirname}/../../../my1562normalizer/data/addresses.json`
    );

    const index = new FullTextIndex();
    index.importData(await loadJSON(`${__dirname}/../../data/fts-index.json`));

    const formatter = new AddressFormatter(streets, addresses);

    return { formatter, index };
};

const main = async () => {
    const { index, formatter } = await createAndImport();

    for (const query of searches) {
        console.log('>>>>', query, ':');
        logTimeSync(() => {
            const addresses = index
                .search(query)
                .map(({ addressID, similarity }) => [
                    similarity,
                    formatter.addressIDToString(addressID),
                ]);

            console.log(addresses);
        }, `search(${query})`);
    }
};

main().catch((e) => {
    console.error(e.stack);
    process.exit(1);
});
