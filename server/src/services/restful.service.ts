
import { ConfigHelper } from '../helpers';
import { Request, Response } from 'express';

export class RestFulService {    
    mongoist = require('mongoist');
    jsonPointer = require('json-pointer');
    config = ConfigHelper.instance;
    static get instance() {
        return this._instance || (this._instance = new this());
    }
    private db:any;
    private static _instance: RestFulService;

    constructor() {     
        this.db = this.mongoist(`${this.config.parseConfig.DATABASE_URI}`);  
    }

    async get(req:Request, res:Response){       
        try{
            //console.log("getData start", new Date()) ;
            let page = parseInt(req.query["page"] || "1");                            
            let pageSize = parseInt(req.query["pageSize"] || "50");                                
            let className = req.params["className"];
            let where = JSON.parse(req.query["where"] || "{}");
            let include = req.query["include"];
            let data = [];
            let total = 0;
          
            if(pageSize>1000)pageSize=1000;
            else if(pageSize<1)pageSize=1;
            if(page<1)page=1;

            await Promise.all([
                this.getData(className, page, pageSize, where, include).then(res=>data =res),
                this.getCount(className, where).then(res=>total=res)
            ]);
            let totalPages=Math.ceil(total/pageSize);
            //console.log("getData end", new Date()) ;
            res.json({pageSize,page,total,totalPages,data});
        }
        catch(err){
            console.error(err);
            res.status(err.status || 500);
            res.json({
                message: err.message,
                error: err
            });
        }
    }
    async post(req:Request, res:Response){       
        try{
            
            let className = req.params["className"];
            let data = req.body;
            for(let item of data){
                item._created_at=new Date();
                item._updated_at=new Date();
            }
            let result = await this.db.collection(className).insertMany(data);
            res.json(result);
        }
        catch(err){
            console.error(err);
            res.status(err.status || 500);
            res.json({
                message: err.message,
                error: err
            });
        }
    }
    constructInclude(includeRequest:string):includeData{
        let includeArray = includeRequest.split(',');
        let includeData:{fieldNames:string[], depth:number}[]=[];
        let maxDepth=0;
        for(let include of includeArray){
            let fieldNames=include.split('.');
            let depth=fieldNames.length;
            includeData.push({depth, fieldNames});
            //update max depth
            if(depth>maxDepth)maxDepth=depth;
        }
        return {maxDepth, includeData}
    }
    getTargetField(obj:any,fieldNames:string[]):any{        
        return this.jsonPointer.get(obj, "/"+fieldNames.join("/"));
    }
    updateTargetField(obj:any,fieldNames:string[],val:any){        
        this.jsonPointer.set(obj, "/"+fieldNames.join("/"), val);
    }
    async fetchInclude(includeRequest:string, data:any[]){
        let includes = this.constructInclude(includeRequest);
        //console.log(includes);
        for(let depth=1;depth<=includes.maxDepth;depth++){              
            // forks promises based on depth level
            let promises=[];
            for(let include of includes.includeData.filter(x=>x.depth==depth)){
                //get parent link data
                for(let record of data){      
                    var target = this.getTargetField(record, include.fieldNames);
                    //console.log(target);
                    if(!target)continue;
                    //change from className$objectId to parent json object
                    let link = target.split('$');
                    //console.log(link);
                    if(link.length<2)continue;
                    
                    let parentClassName = link[0];
                    let _id = link[1];
                    const getData$ = this.db.collection(parentClassName).find({_id}).then(res=>{ 
                        //console.log(res);                        
                        if(res&&res.length>0) this.updateTargetField(record, include.fieldNames, res[0]);                           
                    });
                    promises.push(getData$);                    
                }
            }
            await Promise.all(promises);
        }
        return data;
    }
    async getData(className:string, page:number, pageSize:number, where:string, includeRequest?:string){
        
        let data = await this.db.collection(className).findAsCursor(where).skip((page-1)*pageSize).limit(pageSize).toArray();
        
        if(!includeRequest)return data;

        return await this.fetchInclude(includeRequest, data);
    }
    async getCount(className:string, where:string){        
        let total:number= await this.db.collection(className).count(where);
        return total;
    }
}

export interface includeData{
    includeData:{fieldNames:string[], depth:number}[];
    maxDepth:number
}