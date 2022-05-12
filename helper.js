/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config();
const psql = require('./psql');

const tableSelectionData = async ()=>{
    try{                
        const response = await psql.getAvailableTablesAndSelection();
        if(Array.isArray(response)){
            const tableNameArray = response.map(item =>{
             
                const tblObj = {};
                tblObj.tableName = item.table_name;
                tblObj.isSelected = (item.should_delete === true);
                tblObj.ttl = item.ttl ?? 0;
                return tblObj;
            });                    
            return tableNameArray;
        }else{            
            return null;
        }
    }catch(error){   
        console.error(error.message);     
        throw error;
    }
}

module.exports = {     
    tableSelectionData
}