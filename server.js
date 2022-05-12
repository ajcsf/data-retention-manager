/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config()
const express = require('express');
const session = require('express-session');

const redisStore = require('connect-redis')(session);

const app = express();
const server = require('http').Server(app);
const path = require('path');

const schedule = require('node-schedule');

const Queue = require('bull');
const REDIS_URL = process.env.REDIS_URL;

const psql = require('./psql');
const helper = require('./helper');

const uuid = require('uuid-random');

const TIMEZONE = process.env.TIMEZONE || "Europe/London";
const PORT = process.env.PORT;
const WORK_QUEUE = process.env.WORK_QUEUE || "ajc-drm-work";
const RUN_MODE = process.env.RUN_MODE || "production";

let workQueue = new Queue(WORK_QUEUE, REDIS_URL);

const {createClient} = require('redis');

const redisClient = createClient({url: REDIS_URL, legacyMode: true});

redisClient.on('error', (error) => {
    console.error('❌ Redis error: ', error.message);
});

redisClient.on("ready", () => {
   console.log('✅ Redis is ready')
  });
  
  redisClient.on("connect", () => {
   console.log('✅ Redis connected')
  });

let sessionOptions = {    
    secret: uuid(),
    name: '_ajc-pc-delete-app',
    resave: false,
    saveUninitialized: false,
    cookie: {                        
        secure: false,
        httpOnly: true        
    },    
    store: new redisStore( {client: redisClient }),
};

let currentJob;

const scheduleDeleteJobs = async (hourToRun = 2)=>{    
    const rule = new schedule.RecurrenceRule();
    if(RUN_MODE === 'development'){
        rule.second = 55;
    }else{
        rule.hour = hourToRun;   
        rule.minute = 0;
        rule.second = 0;
    }
    rule.tz = TIMEZONE;

    if(currentJob !== undefined){        
        currentJob.cancel();
    }

    currentJob = schedule.scheduleJob(rule, async ()=>{
        let configSelectedTables;
        try{                        
            configSelectedTables = await helper.tableSelectionData();                   
            if(Array.isArray(configSelectedTables)){
                const onlySelectedTables = configSelectedTables.filter(tableEntry => tableEntry.isSelected === true);
                onlySelectedTables.forEach(tableEntry => {    
                    addDeleteTableJobToQueue(tableEntry.tableName,tableEntry.ttl);
                });
            }else{
                console.error('Not an array.');                
            }
        }catch(error){
            console.error('Could not get table data.',error);            
        }                
    });
}

const addDeleteTableJobToQueue = async (tableName,ttl=0)=>{
    const msg = {
        "operation":"delete",
        "table":tableName,
        "ttl":ttl
    }
    console.log('delete msg',msg);
    const newJob = await workQueue.add(msg);    
};

app.use(express.static(__dirname + '/www'));
app.set("views", path.join(__dirname, "/www/views"));
app.set("assets", path.join(__dirname, "/www/assets"));
app.set("scripts", path.join(__dirname, "/www/scripts"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(session(sessionOptions));


// auth routes
const authRoutes = require('./routes/auth');
app.use(authRoutes);

// user routes
const uiRoutes = require('./routes/ui');
app.use(uiRoutes);

// api routes
const apiRoutes = require('./routes/api');
app.use(apiRoutes);

workQueue.on('global:completed', (jobId, result)=>{
    console.log(`✅ Job ${jobId} completed with result ${result}`);
});

server.listen(PORT,async () => {       
    
    try{       
        const shouldCreateTables = await psql.shouldCreateConfigTables();       
        if(shouldCreateTables){
            const didCreateConfigTables = await psql.createConfigTables();
            if(didCreateConfigTables){
                console.log('✅ Config tables created.');
            }else{    
                console.log('❌ Unable to create Config tables.');
            }
        }
    }catch(error){
        console.error(error.message);
    }

    try{
        await redisClient.connect();        
    }catch(error){
        console.error(error.message);
    }

    try{                
        const response = await psql.getScheduledHour();        
        const {scheduled_hour} = response[0];               
        await scheduleDeleteJobs(scheduled_hour);
    }catch(error){
        console.error(error.message);                
    }
        
    console.log(`🚀 Express server listening on ${ PORT }`);
});