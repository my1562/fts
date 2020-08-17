import { prepare } from '.';

export type IDByToken = { [token: string]: number };
export type TokenByID = string[];

export interface TokenStoreExportedData {
    tokenById: TokenByID;
    idByToken: IDByToken;
}

export class TokenStore {
    constructor(
        private tokenById: TokenByID = [],
        private idByToken: IDByToken = {}
    ) {}

    private getOrCreateTokenID(token: string): number {
        const maybeID = this.idByToken[token];
        if (maybeID !== undefined) {
            return maybeID;
        }
        const id = this.tokenById.length;
        this.idByToken[token] = id;
        this.tokenById.push(token);
        return id;
    }

    private getTokenID(token: string): number | undefined {
        return this.idByToken[token];
    }

    addText(text: string): number[] {
        const tokens = prepare(text);
        return tokens.map((t) => this.getOrCreateTokenID(t));
    }

    tokenizeText(text: string): number[] {
        const tokens = prepare(text);
        return tokens
            .map((t) => this.getTokenID(t))
            .filter((tid): tid is number => tid !== undefined);
    }

    getTokenById(tokenID: number): string | undefined {
        return this.tokenById[tokenID];
    }

    exportData(): TokenStoreExportedData {
        return {
            tokenById: this.tokenById,
            idByToken: this.idByToken,
        };
    }
    importData(data: TokenStoreExportedData) {
        this.tokenById = data.tokenById;
        this.idByToken = data.idByToken;
    }
}
