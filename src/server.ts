import { RequestHandler, json, createError } from 'micro';
import { FullTextIndex } from './FullTextIndex';
import { loadJSON } from './utils';

const bootstrap = async () => {
    const index = new FullTextIndex();
    index.importData(await loadJSON(`${__dirname}/../data/fts-index.json`));
    return index;
};

const index = bootstrap();

const handler: RequestHandler = async (req, res) => {
    const fts = await index;
    const request = (await json(req)) as { query?: string } | undefined;
    if (request?.query !== undefined && typeof request?.query === 'string') {
        try {
            const results = await fts.search(request.query, 4);
            return results;
        } catch (e) {
            throw createError(500, e.message || `${e}`);
        }
    } else {
        throw createError(400, 'Empty request');
    }
};

module.exports = handler;
