import _ from 'lodash';
import { flow } from 'lodash/fp';

const VOWELS_RU = 'аяоёуюэеыи';
const VOWELS_UK = 'іїє';
const VOWELS_EN = 'aeiouy';

const ALPH_RU = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const ALPH_UA = 'їієґ';
const ALPH_EN = 'abcdefghijklmnopqrstuvwxyz';

const RE_VOWELS = new RegExp(`[${VOWELS_RU}${VOWELS_UK}${VOWELS_EN}]+`, 'g');
const RE_WORD = new RegExp(`[${ALPH_RU}${ALPH_UA}${ALPH_EN}]+|[0-9]+`, 'g');

const RE_APOS = /[\u0027\u2019\u02BC]+/g; // @see https://uk.wikipedia.org/wiki/Апостроф
const RE_SIGNS = /[ьъ]+/g;

const RE_DUPS = new RegExp(`([${ALPH_RU}${ALPH_UA}${ALPH_EN}])\\1*`, 'g');

const RE_SPLIT_NUMBER_WITH_LETTER = new RegExp(
    `^([0-9]+)([${ALPH_RU}${ALPH_UA}${ALPH_EN}]+)$`,
    'g'
);

type TextTransformer = (input: string) => string;

type Tokenizer = (input: string) => string[];

const transformLowercase: TextTransformer = (input) => {
    return input.toLowerCase();
};

const transformStripVowels: TextTransformer = (input) => {
    return input.replace(RE_VOWELS, '');
};

const transformStripApostrophe: TextTransformer = (input) => {
    return input.replace(RE_APOS, '');
};

const transformStripSigns: TextTransformer = (input) => {
    return input.replace(RE_SIGNS, '');
};

const transformRemoveDuplicates: TextTransformer = (input) => {
    return input.replace(RE_DUPS, '$1');
};

const tokenizeWords: Tokenizer = (input) => {
    return input.match(RE_WORD) ?? [];
};

export const prepare = (text: string): string[] => {
    const normalizedText: string = flow(
        transformLowercase,
        transformStripApostrophe,
        transformRemoveDuplicates,
        // transformStripVowels,
        transformStripSigns
    )(text);

    const tokens = tokenizeWords(normalizedText);

    return tokens;
};
