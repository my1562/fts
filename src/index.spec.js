import { prepare } from './index';

describe('hello', () => {
    it('should tokenize', () => {
        expect(prepare('науки 15б')).toMatchInlineSnapshot(`
            Array [
              "науки",
              "15",
              "б",
            ]
        `);

        expect(prepare('Ленина, 27')).toMatchInlineSnapshot(`
            Array [
              "ленина",
              "27",
            ]
        `);

        expect(prepare('большевистская, 14')).toMatchInlineSnapshot(`
            Array [
              "болшевистская",
              "14",
            ]
        `);

        expect(prepare('більшовистська-14')).toMatchInlineSnapshot(`
            Array [
              "білшовистска",
              "14",
            ]
        `);

        expect(prepare('Первой Конной Армии')).toMatchInlineSnapshot(`
            Array [
              "первой",
              "коной",
              "арми",
            ]
        `);
    });
});
