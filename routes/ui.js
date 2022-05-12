/* 

Data Retention Manager is free to use, but is not an official Salesforce product. 
It has not been officially tested or documented. 
Salesforce support is not available for Data Retention Manager. 
Source code provided as is without warranty of any kind.

*/

require('dotenv').config()
const express = require('express');
const router = express.Router();

const renderRoot = (req,res)=>{    
    if(req.session.isLoggedIn !== true){
        res.render('frontpage');
    }else{
        res.redirect('/app/home');
    }
}

const renderHome = (req,res)=>{
    if(req.session.isLoggedIn !== true){        
       return res.redirect('/');
    }   
    return res.render('home');
};


const renderError = (req,res)=>{
    return res.render('errorpage');
}

router.get('/',renderRoot);
router.get('/error', renderError);
router.get('/app/home',renderHome);

module.exports = router;