
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
    async getById(req:Request, res:Response){       
        try{
            
            let className = req.params["className"];            
            let whereJson = {_id:req.params["_id"]};
            let selectArray = req.query["keys"] ? req.query["keys"].split(","):[];
            let selectJson = selectArray.length>0 ? this.constructJson(selectArray) : undefined;
            if(selectJson){
                selectJson["createdAt"]=1;
                selectJson["updatedAt"]=1;
                this.maskJson(selectJson);
            }            
            let include = req.query["include"];
            let result = await this.getFirstData(className, whereJson, include, selectJson);
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
    async putById(req:Request, res:Response){       
        try{
            
            let className = req.params["className"];            
            let whereJson = {_id:req.params["_id"]};                        
            let newData = req.body;
            this.preProcessJson(newData);
            delete(newData.objectId);
            delete(newData.createdAt);
            delete(newData.updatedAt);
            newData["_updated_at"] = new Date();            
            let result = await this.db.collection(className).update(whereJson,{$set: newData}, {upsert:false});
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
    async get(req:Request, res:Response){       
        try{
            //console.log("getData start", new Date()) ;            
            let skip = parseInt(req.query["skip"] || "0");
            let pageSize = parseInt(req.query["limit"] || "50");                                
            let className = req.params["className"];
            //mask fieldname to follow parse format
            let whereJson = JSON.parse((req.query["where"] || "{}"));

            let sortArray = req.query["order"] ? req.query["order"].split(","):[];
            let sortJson= sortArray.length>0 ? this.constructJson(sortArray) : undefined;
            
            let selectArray = req.query["keys"] ? req.query["keys"].split(","):[];
            let selectJson = selectArray.length>0 ? this.constructJson(selectArray) : undefined;
            if(selectJson){
                selectJson["createdAt"]=1;
                selectJson["updatedAt"]=1;
            }
            this.maskJson(whereJson);
            this.maskJson(sortJson);
            this.maskJson(selectJson);
            let include = req.query["include"];
            let results = [];
            let count = 0;
          
            if(pageSize>10000)pageSize=10000;
            else if(pageSize<1)pageSize=20;
            
            await Promise.all([
                this.getData(className, skip, pageSize, whereJson, sortJson, selectJson, include).then(res=>results =res),
                this.getDataCount(className, whereJson).then(res=>count=res)
            ]);
            let totalPages=Math.ceil(count/pageSize);
            //console.log("getData end", new Date()) ;
            let page = (skip / pageSize)+1;
            res.json({pageSize,page,count,totalPages,results});
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
    async del(req:Request, res:Response){       
        try{
            //console.log("getData start", new Date()) ;                                                        
            let className = req.params["className"];
            //mask fieldname to follow parse format
            let whereJson = JSON.parse((req.query["where"] || "{}"));
            this.maskJson(whereJson);            
            let result = await this.deleteMany(className, whereJson);
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
    async deleteMany(className: string, where: any) {
        return await this.db.collection(className).remove(where);
    }
    async dropCollection(className:string, callBack:(err, success)=>void){
        this.db.collection(className).drop(callBack);
    }
    async getCount(req:Request, res:Response){       
        try{       
            
            let className = req.params["className"];
            //mask fieldname to follow parse format
            let whereJson = JSON.parse((req.query["where"] || "{}"));

            this.maskJson(whereJson);
            
            let count = 0;
            await Promise.all([
                this.getDataCount(className, whereJson).then(res=>count=res)
            ]);

            res.json({count});
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
    private constructJson(keys: string[]) {
        let data={};
        for (let key of keys) {
            if (key.indexOf("-") == 0)
                data[key.substring(1, key.length)] = -1;
            else
                data[key] = 1;
        }
        return data;
    }
    getNewObjectId(){
        return this.mongoist.ObjectId().toString();
    }
    async post(req:Request, res:Response){       
        try{
            
            let className = req.params["className"];
            let data = req.body;
            for(let item of data){
                item._id= this.getNewObjectId();
                this.preProcessJson(item);
                item._created_at=new Date();
                item._updated_at=new Date();
            }
            let result = await this.insertMany(className, data);
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
    async insertMany(className: any, data: any[]) {
        return await this.db.collection(className).insertMany(data);
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
        if(!data)return;      
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
    maskJson(data:any){   
        if(!data)return;
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
            if(data[key] && data[key]!=null && typeof(data[key])==="object") this.maskJson(data[key]);
        }
    }
    //make it similar to parse object
    postProcessJson(data:any){
        if(!data)return;
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
    async getFirstData(className:string, where:any, includeRequest?:string, select?:any):Promise<any>{        
        let data = await this.db.collection(className).find(select !== undefined ? where : where, select);
        let item = data&& data.length>0 ? data[0] : undefined;

        this.postProcessJson(item);            

        if(!includeRequest || !item)return item;

        return await this.fetchInclude(includeRequest, [item]);
    }
    async getRawData(className:string, page:number, pageSize:number, where:any, sort?:any, select?:any):Promise<any[]>{        
        let data = sort === undefined ? 
            await this.db.collection(className).findAsCursor(select !== undefined ? where : where, select).skip((page-1)*pageSize).limit(pageSize).toArray():
            await this.db.collection(className).findAsCursor(select !== undefined ? where : where, select).sort(sort).skip((page-1)*pageSize).limit(pageSize).toArray();
        return data;

        
    }
    async getData(className:string, skip:number, pageSize:number, where:any, sort?:any, select?:any, includeRequest?:string):Promise<any[]>{        
        let data = sort === undefined ? 
            await this.db.collection(className).findAsCursor(select !== undefined ? where : where, select).skip(skip).limit(pageSize).toArray():
            await this.db.collection(className).findAsCursor(select !== undefined ? where : where, select).sort(sort).skip(skip).limit(pageSize).toArray();
        for(let item of data){
            this.postProcessJson(item);            
        }

        if(!includeRequest)return data;

        return await this.fetchInclude(includeRequest, data);
    }
    async getDataCount(className:string, where:any){        
        let total:number= await this.db.collection(className).count(where);
        return total;
    }
}

export interface includeData{
    includeData:{fieldNames:string[], depth:number}[];
    maxDepth:number
}