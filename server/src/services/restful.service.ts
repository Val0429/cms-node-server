
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
            //mask fieldname to follow parse format
            let where = JSON.parse((req.query["where"] || "{}"));
            this.sanitizeQuery(where);
            let include = req.query["include"];
            let results = [];
            let total = 0;
          
            if(pageSize>1000)pageSize=1000;
            else if(pageSize<1)pageSize=1;
            if(page<1)page=1;
            
            await Promise.all([
                this.getData(className, page, pageSize, where, include).then(res=>results =res),
                this.getCount(className, where).then(res=>total=res)
            ]);
            let totalPages=Math.ceil(total/pageSize);
            //console.log("getData end", new Date()) ;
            res.json({pageSize,page,total,totalPages,results});
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
                item._id= this.mongoist.ObjectId().toString();                                
                this.preProcessJson(item);
                item._created_at=new Date();
                item._updated_at=new Date();
            }
            let result = await this.db.collection(className).insertMany(data);
            for(let item of result){
                this.postProcessJson(item);
            }
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
        let newPath="/"+fieldNames.join("/");
        //console.log(newPath, val);
        this.jsonPointer.set(obj, newPath, val);
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
                    const getData$ = this.db.collection(target.className).find({_id:target.objectId}).then(res=>{ 
                        //console.log(res);
                        if(res&&res.length>0) {
                            res[0].__type="Object";
                            res[0].className=target.className;
                            this.postProcessJson(res[0]);
                            this.updateTargetField(record, include.fieldNames, res[0]);                           
                        }
                    });
                    promises.push(getData$);                    
                }
            }
            await Promise.all(promises);
        }
        return data;
    }
    //make it similar to parse object
    preProcessJson(data:any){        
        let keys = Object.keys(data);
        if(!keys || keys.length<=0)return;

        for(let key of keys){
            if (data[key].__type && data[key].__type==="Pointer"){
                data["_p_"+key]=data[key].className+"$"+data[key].objectId;
                delete(data[key]);
            }
            if(data[key] && data[key]!=null && typeof(data[key])==="object") this.preProcessJson(data[key]);
        }
    }
    sanitizeQuery(data:any){        
        let keys = Object.keys(data);
        if(!keys || keys.length<=0)return;

        for(let key of keys){
            if (key=="objectId"){
                data["_id"]=data[key];
                delete(data[key]);
            }else
            if (key=="createdAt"){
                data["_created_at"]=data[key];
                delete(data[key]);
            }else
            if (key=="updatedAt"){
                data["_updated_at"]=data[key];
                delete(data[key]);
            }
            if(data[key] && data[key]!=null && typeof(data[key])==="object") this.sanitizeQuery(data[key]);
        }
    }
    //make it similar to parse object
    postProcessJson(data:any){
        let pointer="_p_";
        let keys = Object.keys(data);
        
        data.objectId = data._id;
        data.createdAt = data._created_at;
        data.updatedAt = data._updated_at;        
        delete(data._id);
        delete(data._created_at);
        delete(data._updated_at);

        for(let key of keys){
            if(key.indexOf(pointer)>-1){
                let newKey=key.substring(pointer.length,key.length);
                let link = data[key].split('$');                     
                data[newKey]={"__type": "Pointer", "className": link[0], "objectId": link[1]};
                delete(data[key]);
            }
            if(data[key] && data[key]!=null && typeof(data[key])==="object") this.postProcessJson(data[key]);
        }
    }
    async getData(className:string, page:number, pageSize:number, where:string, includeRequest?:string){        
        let data = await this.db.collection(className).findAsCursor(where).skip((page-1)*pageSize).limit(pageSize).toArray();
        for(let item of data){
            this.postProcessJson(item);            
        }

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