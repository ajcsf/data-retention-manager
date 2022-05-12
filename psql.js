/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;
const CACHE_SCHEMA = process.env.CACHE_SCHEMA || "cache";
const CONFIG_SCHEMA = process.env.CONFIG_SCHEMA || "ajc_drm_config";

const DEBUG = process.env.DEBUG ?? false;

const {Pool} = require('pg');
const format = require('pg-format');

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl:{
        rejectUnauthorized: false
    }
});

const getScheduledHour = async ()=>{    
    const queryString = format(`SELECT scheduled_hour FROM ${CONFIG_SCHEMA}.schedule WHERE id = 1;`);         
    try{
        const results = await pool.query(queryString);        
        return results.rows;                    
    }catch(error){
        console.error(error);
        throw(error);
    }  
}

const setScheduledHour = async (hour)=>{    
    const queryString = format(`UPDATE ${CONFIG_SCHEMA}.schedule SET scheduled_hour = ${hour} WHERE id = 1;`); 
    
    try{
        const results = await pool.query(queryString);        
        return results.rowCount;                    
    }catch(error){
        console.error(error);
        throw(error);
    }  
}


const getAvailableTablesAndSelection = async ()=>{    
    const queryString = format(`SELECT information_schema.tables.table_name, ${CONFIG_SCHEMA}.tables.should_delete, ${CONFIG_SCHEMA}.tables.ttl FROM information_schema.tables LEFT JOIN ${CONFIG_SCHEMA}.tables ON information_schema.tables.table_name = ${CONFIG_SCHEMA}.tables.table_name WHERE table_schema = '${CACHE_SCHEMA}' ORDER BY information_schema.tables.table_name ASC;`);
    try{
        const results = await pool.query(queryString);        
        return results.rows;                    
    }catch(error){
        console.error(error);
        throw(error);
    }  
}   

const updateSelectedTables = async (tables)=>{    
    
    if(Array.isArray(tables)){
        let values = '';
        tables.forEach((item, index, array) => {
            values = values +  `('${item.tableName}',${item.isSelected},${item.ttl})`;
            if(index < array.length-1){
                values = values + ',';
            }
        });
    
        const queryString = format(`INSERT INTO ${CONFIG_SCHEMA}.tables (table_name,should_delete,ttl) VALUES ${values} ON CONFLICT (table_name) DO UPDATE SET should_delete = excluded.should_delete, ttl = excluded.ttl;`);      
        try{
            const results = await pool.query(queryString);       
            return results.rowCount;                    
        }catch(error){
            console.error(error);
            throw(error);
        }  
    }else{            
            throw new Error('Problem querying database.');
    }
}

const deleteRowsFromPSQL = async (table)=>{    
    const queryString = format(`DELETE FROM ${CACHE_SCHEMA}.${table}`); 
        
    try{
        const results = await pool.query(queryString);        
        return results.rowCount;                    
    }catch(error){
        console.error(error);
        throw(error);
    }  
}

const deleteRowsUsingAge = async (table,ageInDays = 0)=>{    
   
    let queryString;

    if(ageInDays === 0){
        // delete all rows
        queryString = format(`DELETE FROM ${CACHE_SCHEMA}.${table}`); 
    }else{
        queryString = format(`DELETE FROM ${CACHE_SCHEMA}.${table} WHERE lastmodifieddate < (NOW() - INTERVAL '${ageInDays} DAY')`); 
    }
        
    try{
        const results = await pool.query(queryString);        
        return results.rowCount;                    
    }catch(error){
        console.error(error);
        throw(error);
    }  
}

const shouldCreateConfigTables = async ()=>{
    const schema = CONFIG_SCHEMA;
    let tableExists = false;
    const queryString = format(`SELECT EXISTS(SELECT table_schema FROM information_schema.tables WHERE table_schema  = '${schema}');`);        
    

    try{
        const results = await pool.query(queryString);        
        tableExists = results.rows[0].exists;
        if(results.rows[0].exists === false){
            return true;
        }else{
            return false;
        }
    }catch(err){
        console.error(err);
        return false;
    }
}

const createConfigTables = async ()=>{    
    const schema = CONFIG_SCHEMA;
 
    const createSchemaStatement = format(`CREATE SCHEMA ${schema};`);

    const createScheduleTableStatement = format(`CREATE TABLE IF NOT EXISTS ${schema}.schedule (
        id INT PRIMARY KEY UNIQUE,
        scheduled_hour INT,
        should_run BOOLEAN,
        last_run TIMESTAMPTZ
        );`);

    const createTablesTableStatement = format(`CREATE TABLE IF NOT EXISTS ${schema}.tables (
        table_name VARCHAR PRIMARY KEY UNIQUE,
        should_delete BOOLEAN DEFAULT false,   
        ttl INTEGER DEFAULT 0, 
        last_run TIMESTAMPTZ
        );`);

    const insertConfigDataStatement = format(`INSERT INTO ${schema}.schedule (id,scheduled_hour,should_run,last_run) VALUES(1,2,false,null);`);
    
    try{
        const createSchemaResult = await pool.query(createSchemaStatement);        
        //console.log(createSchemaResult);    
        
        const createScheduleTableResult = await pool.query(createScheduleTableStatement);        
        //console.log(createScheduleTableResult);         

        const createTablesTableResult = await pool.query(createTablesTableStatement);        
        //console.log(createTablesTableResult);         

        const insertConfigDataResult = await pool.query(insertConfigDataStatement);        
        //console.log(insertConfigDataResult.rowCount);   
               
        return true;
       
    }catch(err){
        console.error(err);
        return false;
    }    
}

module.exports = {     
    deleteRowsFromPSQL,    
    updateSelectedTables,    
    getAvailableTablesAndSelection,
    setScheduledHour,
    getScheduledHour,
    shouldCreateConfigTables,
    createConfigTables,
    deleteRowsUsingAge
}