/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config()
const express = require('express');
const router = express.Router();
const psql = require('../psql');
const helper = require('../helper');

let userSelectedTables = {};

const isLoggedIn = (req,res,next)=>{
    if(req.session.isLoggedIn){
        next();
    }else{
        return res.status(400).json({"error":"Authorisation failure"});
    }
}

const getScheduledHour = async (req,res)=>{    
    try{                
        const response = await psql.getScheduledHour();        
        return res.status(200).json(response[0]);               
    }catch(error){
        console.error(error.message);
        res.status(503).json({"error": error.message}); 
    }
};

const setScheduledHour = async (req,res)=>{
    const {time} = req.body;

    if(time === undefined){
        throw new Error('Request body is missing time parameter.');
    }

    try{                
        const response = await psql.setScheduledHour(time);        
        return res.status(200).json({"message":"Time saved."});               
    }catch(error){
        console.error(error.message);
        return res.status(503).json({"error": error.message}); 
    }
};

/*
 * This updates the tables held in memory along with their selection for deletion.
 *
 */
const updateTables = (req,res)=>{
    const sessionId = req.session.sessionID;
    const {tables} = req.body;

    if(tables === undefined || !Array.isArray(tables)){
        return res.status(400).json({"error":"Request body is missing tables parameter."});
    }
     
    if(userSelectedTables[sessionId] === undefined){ 
        return res.status(500).json({"error":"Tables have not been loaded."});
    }

    tables.forEach(itemToAdd => {
        const nm = itemToAdd.tableName;
        const sel = itemToAdd.isSelected;
        const ttl = itemToAdd.ttl;
    
        const fx = userSelectedTables[sessionId].findIndex(item => item.tableName === nm);       
        if(fx >= 0){            
            userSelectedTables[sessionId][fx].isSelected = sel;
            userSelectedTables[sessionId][fx].ttl = ttl;
        }            
    });    
    return res.status(200).json({"message":"Tables updated."});        
}



const getAvailableTablesAndSelection = async (req,res)=>{    
    const sessionId = req.session.sessionID;

    try{                
        if(userSelectedTables[sessionId] === undefined){
            userSelectedTables[sessionId] = await helper.tableSelectionData();
        }
        return res.status(200).send(userSelectedTables[sessionId]);            
    }catch(error){
        console.error(error.message);
        return res.status(503).json({"error":error.message});        
    }
}


/*
 * This commits the table selection held in memory to PSQL
 *
 */
const commitChanges = async (req,res)=>{   
    const sessionId = req.session.sessionID;
    const data = userSelectedTables[sessionId];
        
    try{                
        const response = await psql.updateSelectedTables(data);        
        return res.status(200).json({"message":"Selection saved."});               
    }catch(error){
        console.error(error.message);
        return res.status(503).json({"error": error.message}); 
    }
}

router.use('/api/*', isLoggedIn);
router.get('/api/time', getScheduledHour);
router.post('/api/time', setScheduledHour);
router.post('/api/selected-tables',updateTables);
router.get('/api/selected-tables',getAvailableTablesAndSelection);
router.post('/api/commit',commitChanges);

module.exports = router;