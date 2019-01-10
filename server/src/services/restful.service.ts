
import { ConfigHelper } from '../helpers';
import { Request, Response } from 'express';

const mongoist = require('mongoist');
const config = ConfigHelper.instance;

export class RestFulService {    
    
    static get instance() {
        return this._instance || (this._instance = new this());
    }
    private db:any;
    private static _instance: RestFulService;

    constructor() {     
        this.db = mongoist(`${config.parseConfig.DATABASE_URI}`);  
    }

    async get(req:Request, res:Response){       
        try{
            //console.log("getData start", new Date()) ;
            let page = parseInt(req.query["page"] || "1");                            
            let pageSize = parseInt(req.query["pageSize"] || "50");                                
            let className = req.params["className"];
            let data = [];
            let total = 0;
          
            
            if(pageSize>1000)pageSize=1000;
            if(page<1)page=1;

            await Promise.all([
                //paging$,
                this.db.collection(className).findAsCursor().skip((page-1)*pageSize).limit(pageSize ).toArray().then(res=>data =res),
                this.db.collection(className).count().then(res=>total=res)
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
}