import { FullTextIndex } from '../FullTextIndex';

const searches = [
    'ленина 15',
    'григоровское , 55',
    'григоровское шоссе 57а',
    'проспект науки 7',
    'зойфера 3',
    'Фесенковский въезд, 12',
    'фесенковский 12',
    'гвардейцев-широнинцев 59',
];

const main = async () => {
    const index = new FullTextIndex();
    await index.initialize();

    for (const query of searches) {
        console.log('>>>>', query, ':');
        const addresses = index
            .search(query)
            .map(({ addressID, similarity }) => [
                similarity,
                index.addressIDToString(addressID),
            ]);
        console.log(addresses);
    }
};

main().catch((e) => {
    console.error(e.stack);
    process.exit(1);
});
