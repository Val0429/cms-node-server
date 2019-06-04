import { Injectable } from "@angular/core";
import { Http, RequestOptions } from "@angular/http";
import { ParseService } from "./parse.service";
import { CoreService } from "./core.service";

@Injectable()
export class RestFulService{
    constructor(private http:Http, private parseService:ParseService, private coreService:CoreService){
        
    }
    async get<T extends Parse.Object>(args: {
        type: new (options?: any) => T,
        filter?: (query: Parse.Query<T>) => Parse.Query<T>,
        where?:any
      }) :Promise<GetResult>{  
         
        let query = new Parse.Query(args.type);   
        let url = `${this.parseService.parseServerUrl}/cms/data/${query.className}`;
        if(args.filter){                
            let q = args.filter(query) as any;    
            console.debug("query", q);
            
            //extra where
            if(args.where)url+=`?where=${JSON.stringify(Object.assign(q._where, args.where))}`;
            else url+=`?where=${JSON.stringify(q._where)}`;

            if(q._order)url+=`&order=${q._order.join(",")}`;
            if(q._include)url+=`&include=${q._include.join(",")}`;
            url+=`&skip=${q._skip}`;
            if(q._limit)url+=`&limit=${q._limit}`;
            if(q._select)url+=`&keys=${q._select.join(",")}`;                        
        }
        const options = new RequestOptions({ headers: this.coreService.parseHeaders });
        let result = await this.http.get(url, options).toPromise();        
        let resultJson = result.json();
        //console.log("result json", resultJson);
        return resultJson;
        
      }
      async getCount<T extends Parse.Object>(args: {
        type: new (options?: any) => T,
        filter?: (query: Parse.Query<T>) => Parse.Query<T>
      }) :Promise<number>{  
         
        let query = new Parse.Query(args.type);   
        let url = `${this.parseService.parseServerUrl}/cms/count/${query.className}`;
        if(args.filter){                
            let q = args.filter(query) as any;                
            url+=`?where=${JSON.stringify(q._where)}`;
        }
        const options = new RequestOptions({ headers: this.coreService.parseHeaders });
        let result = await this.http.get(url, options).toPromise();        
        let resultJson = result.json();
        //console.log("result json", resultJson);
        return resultJson.count;
        
      }
}
export interface GetResult{
    count:number;
    results:any[];
    totalPages:number;
    page:number;
    pageSize:number;
}