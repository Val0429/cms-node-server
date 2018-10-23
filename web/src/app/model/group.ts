export class Group {
    objectId: string;
    Name: string;
    Level: string;
    Nvr: string[];
    Channel: IGroupChannel[];

    constructor() { }
}

export interface IGroupChannel {
    Nvr: string;
    Channel: number;
}
