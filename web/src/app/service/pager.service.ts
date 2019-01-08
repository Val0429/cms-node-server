import { Injectable } from "@angular/core";

@Injectable()
export class PagerService{
    public total:number=0;
    public page:number=1;
    public pageSize:number=20;
    public options:number[]=[20,50,100,500,1000];
}
