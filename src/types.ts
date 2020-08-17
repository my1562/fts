export interface StreetAR {
    id: number;
    name_ukr: string;
    name_ru: string;
    typeRU: string;
    typeUKR: string;
    shortTypeRU: string;
    shortTypeUKR: string;
    Children: StreetAR[];
}

export interface Address {
    block: string; //''
    detail: string; //''
    detailNumber: string; //''
    id: number; //100000
    lat: number; //49.963557842
    lng: number; //36.352988433
    number: number; //3
    postcode: number; //61099
    streetID: number; //2009
    suffix: string; //''
}

export interface LevenshteinResponse {
    steps: number;
    relative: number;
    similarity: number;
}
