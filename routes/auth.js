/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config()
const express = require('express');
const router = express.Router();
const axios = require('axios');
const uuid = require('uuid-random');

const INSTANCE_URL = process.env.INSTANCE_URL;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;

const loginFunction = (req,res)=>{         
    const state = encodeURI(uuid());
    req.session.state = state;  
    const authUrl = INSTANCE_URL + '/services/oauth2/authorize?display=touch&prompt=login&scope=openid&response_type=code&state=' + state + '&client_id=' + CONSUMER_KEY + '&redirect_uri=' + REDIRECT_URL;          
    return res.redirect(authUrl);    
};

const authCallback = async (req, res) => {
   
    const url = INSTANCE_URL; 
    const auth_code = req.query.code;
    const {error} = req.query;
    const {state} = req.query;
    const {error_description} = req.query;
   
    if(state !== req.session.state){       
        return res.render('errorpage',{
            errorTitle: error || 'State Error',
            errorMsg: error_description || "State does not match."
        });
    }
    const reqUrl = url + '/services/oauth2/token';
    
    let postParams = new URLSearchParams();
    postParams.append('grant_type','authorization_code');        
    postParams.append('client_id',CONSUMER_KEY);  
    postParams.append('client_secret',CONSUMER_SECRET);
    postParams.append('redirect_uri',REDIRECT_URL);
    postParams.append('code',auth_code);    

   let axiosConfig = {
        headers:{
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        withCredentials: true
    };
    
    try{                 
        const response = await axios.post(reqUrl, postParams, axiosConfig);                     
        if(response.status !== 200){
            throw new Error('Problem with Salesforce authorisation.');
        }        
        req.session.isLoggedIn = true;
        req.session.accesToken = response.data.access_token;               
        req.session.instanceUrl = response.data.instance_url;    
        return res.redirect('/app/home');        
    }catch(err){        
        console.error(err.message);
        req.session.isLoggedIn = false;               
        return res.render('errorpage',{
            errorTitle: error || "Login Error",
            errorMsg: error_description || err.message
        });
    };        
};

const doLogout =  (req,res)=>{
    req.session.destroy();    
    return res.redirect('/');
}

router.get('/login', loginFunction);
router.get('/_callback/', authCallback);
router.get('/app/logout',doLogout);

module.exports = router;