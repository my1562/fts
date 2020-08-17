import { FullTextIndex } from '../FullTextIndex';
import { loadJSON, saveJSON } from '../utils';
import { StreetAR, Address } from '../types';

const main = async () => {
    const index = new FullTextIndex(
        await loadJSON<{ [id: string]: StreetAR }>(
            `${__dirname}/../../external/data/streetsAR.json`
        ),
        await loadJSON<{ [id: string]: Address }>(
            `${__dirname}/../../external/data/addresses.json`
        )
    );
    await index.initialize();

    const data = index.exportData();
    await saveJSON(`${__dirname}/../../data/fts-index.json`, data);
};

main().catch((e) => {
    console.error(e.stack);
    process.exit(1);
});
