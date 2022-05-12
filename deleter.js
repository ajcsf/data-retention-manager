/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config()
let Queue = require("bull");
const REDIS_URL = process.env.REDIS_URL;
//const workers = process.env.WEB_CONCURRENCY;
const WORK_QUEUE = process.env.WORK_QUEUE || "ajc-drm-work";

const psql = require('./psql');
let maxJobsPerWorker = 1;
let workQueue = new Queue(WORK_QUEUE, REDIS_URL);

workQueue.process(maxJobsPerWorker, async (job) => {    
    const {data} = job;
    
    if(data === undefined){
        return {"error":"Mesage is malformed."};
    }
   
    const {table,operation,ttl} = data;
    
    if(table === undefined){                             
        return {"error": "Message is missing table name parameter."};   
    }
    
    if(operation === undefined){        
        return {"error": "Message is missing operation parameter."};   
    }
        
    console.log('Processing delete operation for ',table);
    try{        
        //const rows = await psql.deleteRowsFromPSQL(table);           
        const rows = await psql.deleteRowsUsingAge(table,ttl);
        return {
            "table": table, 
            "operation": operation, 
            "rows": rows.rowCount
        };
    }catch(error){
        console.error(error.message);            
        return {"error": error.message}                
    }            
});