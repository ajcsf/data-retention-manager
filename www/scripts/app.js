let tableData;
let isTableEditMode;
let isTimeEditMode;
let shouldShowSuccess;

function login(){    
    window.location.href = '/login';    
}

function initData(){
    this.isTableEditMode = false;
    this.isTimeEditMode = false;
    this.shouldShow = false;
    getScheduledTime();
    getTables();
}

/*
 * Scheduled time functions
 */

async function getScheduledTime(){
    const url = '../api/time';    
    try{   
        const response = await fetch(url);       
        if(response.status === 200){
            const data = await response.json();           
            const hour = data.scheduled_hour;
            const timeSel = document.getElementById('time-sel');
            timeSel.value = (hour % 12) || 12;
            const amPmSel = document.getElementById('am-pm-sel');
            amPmSel.value = hour >= 12 ? 'PM' : 'AM';
        
            updateTimeText(hour);
        }        
    }catch(error){
        console.error(error);
    }
}

function updateTimeText(hour){
    timeTextDiv = document.getElementById('time-text');
    timeTextDiv.innerHTML = ' ' + ((hour % 12)||12) + ' ' +  (hour >= 12 ? 'PM' : 'AM');
}

function editScheduledTime(){    
    this.isTimeEditMode = true; 
    setButtonIsEnabled('edit-time-button',false);
    toggleDivDisplay('time-edit-controls',true);  
};

function logout(){
    window.location = './logout';
}

async function setScheduledTime(){   
    toggleDivDisplay('time-edit-controls',false);  
    setButtonIsEnabled('edit-time-button',true);

    const url = '../api/time';    
    const hour = Number(document.getElementById('time-sel').value);
    const ampm = document.getElementById('am-pm-sel').value;
       
    let timeToSend = ampm === 'AM' ? (hour % 12) : (12 + hour) % 24 || 12;
    const payload = JSON.stringify({"time": timeToSend});
    
    try{   
        const response = await fetch(url,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },           
            body: payload
        });
                
        if(response.ok !== true){
            throw new Error('Something went wrong saving the new scheduled time.');
        }

        this.isTimeEditMode = false; 
        updateTimeText(timeToSend);
        showSuccessModal();

    }catch(error){
        console.error(error);
    }
}

async function cancelEditTimeChange(){  
    this.isTimeEditMode = false; 
    toggleDivDisplay('time-edit-controls'); 
    await getScheduledTime();
    setButtonIsEnabled('edit-time-button',true);
}

/*
 *  Table functions
 */

async function getTables(){
    const url = '../api/selected-tables?offset=0&limit=2000';
    try{   
        const response = await fetch(url);       
        if(response.ok !== true){ 
            throw new Error('Could not fetch list of archive tables.');
        }else{     
            const data = await response.json();   
            this.tableData = data;     
            renderList(data);                                      
        }        
    }catch(error){
        console.error(error);
    }
}

function editTableSelection(){    
    this.isTableEditMode = true;
    setButtonIsEnabled('edit-button',false);
    toggleDivDisplay('table-cancel-confirm-button-group',true);  
    setCheckboxesAreEnabled(true);    
}

async function saveTableSelection(){
    shouldShowSpinner(true);
           
    const url = '../api/selected-tables';    
    const form = document.getElementById('pb-form');
   
    let tablePayload = [];

    const tableRows = document.querySelectorAll('.table-row');    
    for(let row of tableRows){
        
        const rowInputs = row.querySelectorAll('input');
        
        let isSelected;
        let tableName = row.dataset.tableName;
        let ttl;

        for(let input of rowInputs){        
            input.disabled = true;
            if(input.type === 'checkbox'){
                isSelected = input.checked;
            }else if(input.type === 'number'){
                ttl = input.value;
            }            
        }
        tablePayload.push({"tableName":tableName, "isSelected":isSelected, "ttl":ttl});              
    }
    
    let requestPayload = {
        "tables": tablePayload
    };


    const jsonRequestPayload = JSON.stringify(requestPayload);
    
    try{   
        const response = await fetch(url,{
            method: 'POST', 
            cache: 'no-cache',          
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },           
            body: jsonRequestPayload
        });
       
        if(response.ok !== true){
            throw new Error('Could not send updated table selection.');
        }
            
        const commitResponse = await fetch('../api/commit',{
            method: 'POST',      
            cache: 'no-cache',            
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
        });
        if(commitResponse.ok !== true){
            throw new Error('Could not save updated table selection.');
        }
        this.isTableEditMode = false;
        toggleDivDisplay('table-cancel-confirm-button-group',false);
        setCheckboxesAreEnabled(this.isTableEditMode);
        setButtonIsEnabled('edit-button',true);        
        shouldShowSpinner(false);
        showSuccessModal();
    }catch(error){     
        shouldShowSpinner(false);   
        shouldShowError(true);
        console.error(error);
    }
}

async function cancelEditTableSelection(){   
    this.isTableEditMode = false;
    toggleDivDisplay('table-cancel-confirm-button-group',false);
    await getTables();
    setCheckboxesAreEnabled(this.isTableEditMode);
    setButtonIsEnabled('edit-button',true);
}

function search(){    
    if(this.tableData === undefined){
        console.error('No data');
        return;
    }
    
    const input = document.getElementById('search-input').value;
    
    if(input === ''){
        renderList(this.tableData);
        setCheckboxesAreEnabled(this.isTableEditMode);
    }else{
        const subArray = this.tableData.filter(item => item.tableName.search(input) >= 0 );
        renderList(subArray);
        setCheckboxesAreEnabled(this.isTableEditMode);
    }
}

/* 
 * Rendering functions
 */

function renderList(data){
    if(data === undefined){
        console.error('No data');
        return;
    }
    const tableListDiv = document.getElementById('alist');                     
    tableListDiv.innerHTML = buildList(data);    
}

function buildList(data){
    let listHtml = '<form id="pb-form">';
    
    listHtml += `<div class="table-head">
                    <span class="table-header">Table</span>
                    <span class="checkbox-header">Selected for Delete</span>
                    <span class="ttl-header">TTL (days)</span>
                </div>`;
    listHtml += `<div class="table-rows">`;
    
    data.forEach(item => {
        listHtml = listHtml + buildRow(item.tableName,item.isSelected,item.ttl);
    });
    
    listHtml += '</dvi></form>';
    return listHtml;
}

function buildRow(tableName,status,ttl = 0){
    
    const checked = status ? 'checked' : '';
    const row = `<div class="table-row" data-table-name="${tableName}">
                <span class="table-name">${tableName}</span>
                <span class="table-checkbox round">
                    <input data-table-name="${tableName}" id="${tableName}-selected" name="${tableName}-selected" type="checkbox" ${checked}  disabled class="checkbox-input" />
                    <label for="${tableName}-selected"></label>
                </span>
                <span class="table-ttl">
                    <input data-table-name="${tableName}" min="0" step="1" id="${tableName}-ttl" type="number" name="${tableName}-ttl" value="${ttl}"  disabled class="ttl-input" />
                </span>
            </div>`;    
    return row;
}

/* 
 * Helper functions 
 */

function setButtonIsEnabled(buttonId,enabled){
    const button = document.getElementById(buttonId);
    // if state = true then enable  
    button.disabled = !enabled;      
}

function shouldShowSpinner(shouldShow){
    const spinnerDiv = document.getElementById('spinner');
    spinnerDiv.style.display = shouldShow ? 'block' : 'none';
}

function shouldShowError(shouldShow){
    const spinnerDiv = document.getElementById('error-modal');
    spinnerDiv.style.display = shouldShow ? 'block' : 'none';
}

function setCheckboxesAreEnabled(enabled){
    const inputForm = document.getElementById('pb-form');        
    for(let input of inputForm.elements){        
        input.disabled = !enabled;
    }   
}

function hideSuccessModal(){    
    const successModalDiv = document.getElementById('success-modal');
    successModalDiv.style.display = 'none';
}

function showSuccessModal(){    
    const successModalDiv = document.getElementById('success-modal');
    successModalDiv.style.display = 'block';
}

const toggleDivDisplay = (divId,shouldShow)=>{
    const div = document.getElementById(divId);   
    div.style.display = shouldShow ? 'inline-block' : 'none';        
}
