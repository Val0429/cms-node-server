export interface ICameraEvent {
    Type: string;
    Id?: string;
    Value?: boolean;
}

export class CameraEvent {
    Type: string;
    Id: string;
    Value: boolean;
    constructor(obj: ICameraEvent) {
        this.Type = obj.Type;
        this.Id = obj.Id !== undefined ? obj.Id : '1';
        this.Value = obj.Value !== undefined ? obj.Value : true;
    }
}
