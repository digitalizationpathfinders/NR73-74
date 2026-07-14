class Stepper {
    constructor(stepSelector) {
        this.steps = Array.from(document.querySelectorAll(stepSelector));
        this.activeStep = this.steps.find(step => step.classList.contains('active'));
        this.observeStepContentChanges();

        this.stepHandlers = {}; // Store step instances
        this.updateStepNumbers();
        this.customStepCode(this.steps.indexOf(this.activeStep))

    }

    adjustMaxHeight(step) {
        if (!step) return;
        const stepContent = step.querySelector('.step-content');
        if (stepContent) {
            stepContent.style.maxHeight = stepContent.scrollHeight + 'px';
        }
    }

    setActive(step) {
        if (!step) return;

        if (this.activeStep) {

            this.activeStep.classList.remove('active');
            const stepContent = this.activeStep.querySelector('.step-content');
            if (stepContent) {
                stepContent.style.maxHeight = null;
            }
        }

        step.classList.add('active');
        this.activeStep = step;

        this.updateStepNumbers();
        this.customStepCode(this.steps.indexOf(this.activeStep))

        //this.adjustMaxHeight(step); //hiding this fixed the accordion issue, unknown other effects/imapcts though
    }

    updateStepNumbers() {
        this.steps.forEach((step, index) => {
            let stepNumberElement = step.querySelector('.step-number');
            if (!stepNumberElement) return;

            const isActive = step === this.activeStep;
            const isCompleted = index < this.steps.indexOf(this.activeStep);

            this.styleStepNumber(stepNumberElement, index, isActive, isCompleted);
        });
    }


    styleStepNumber(element, index, isActive, isCompleted) {
        element.style.backgroundColor = isActive || isCompleted ? "#26374A" : "#6F6F6F";
        element.style.color = "#FFFFFF";

        if (index === 0 && !isCompleted) {
            // First step gets the 'info' icon
            element.innerHTML = `<strong>i</strong>`;
        } else {
            // Other steps display their number
            element.innerHTML = isCompleted ? `<span class="material-icons">check</span>` : `${index}`;
        }
    }

    observeStepContentChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    this.adjustMaxHeight(this.activeStep); // ✅ Auto-adjust height when new elements are added
                }
            });
        });

        this.steps.forEach(step => {
            const stepContent = step.querySelector('.step-content');
            if (stepContent) {
                observer.observe(stepContent, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }

    navigateStep(direction) {
        const currentIndex = this.steps.indexOf(this.activeStep);
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (targetIndex >= 0 && targetIndex < this.steps.length) {
            this.storeData(currentIndex);
            this.setActive(this.steps[targetIndex]);
        }
    }

    storeData(stepNum) {
        const stepForm = document.querySelector(`#step-${stepNum}-form`);
        let dataObj = {};
        const checkArr = [];

        if (stepForm) {
            const allInputs = stepForm.querySelectorAll("input, select, textarea");
            allInputs.forEach(input => {
                if (input.closest('.hidden')) return;

                const name = input.name;
                if(!name) return;

                if(input.dataset.array === "true") {
                    if (!dataObj[name]) dataObj[name] = [];
                        if (input.value !== "") 
                            dataObj[name].push(input.value);
                }
                
                else {
                    if (input.type === "radio") {
                        if (input.checked) {
                            dataObj[input.name] = input.value;
                        }
                    } else if (input.type === "checkbox") {
                        if (input.checked) {
                            checkArr.push(input.value);
                            dataObj[input.name] = checkArr;
                        }
                    } else {
                        dataObj[input.name] = input.value;
                    }
                }
                
            });
            
            Object.keys(dataObj).forEach(k => {
                if (Array.isArray(dataObj[k]) && dataObj[k].length === 0) {
                    delete dataObj[k];
                }
                });

        }

        // Step 2 special: include tax lines table
        if (stepNum === 2) {
            if(this.stepHandlers[2]?.taxLinesTable) {
                dataObj["s2q5"] = this.stepHandlers[2].taxLinesTable.rows;
            }
            
        }
    
        DataManager.saveData(`stepData_${stepNum}`, dataObj);
    }


    loadStoredData() {
        this.steps.forEach((step, index) => {
            let savedData = DataManager.getData(`stepData_${index}`);
            if (!savedData) return;

            Object.keys(savedData).forEach(key => {
                let input = step.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === "radio" || input.type === "checkbox") {
                        if (input.value === savedData[key]) {
                            input.checked = true;
                        }
                    } else {
                        input.value = savedData[key];
                    }
                }
            });
        });
    }

    customStepCode(stepNum) {
        if (!this.stepHandlers[stepNum]) {
            switch (stepNum) {
                case 1:
                    this.stepHandlers[stepNum] = new Step1Handler();
                    break;
                case 2:
                    this.stepHandlers[stepNum] = new Step2Handler();
                    break;
                case 3:
                    this.stepHandlers[stepNum] = new Step3Handler(this);
                    break;


            }
        }
        if(stepNum == 2){
            
            this.stepHandlers[stepNum].onActivate();
        }
          

        
 

    }
}
class Step1Handler {
    constructor() {
        this.businessTypeDropdown = document.getElementById("s1biz-accountype");
        this.individualTaxTypeDropdown = document.getElementById("s1ind-taxtype")
        this.accountFieldset = document.getElementById("s1biz-bn-fieldset");
        this.indThirdPartyNumber = document.getElementById("s1-ind-thirdpartyref-fieldset");
        this.bizThirdPartyNumber = document.getElementById("s1-biz-thirdpartyref-fieldset");
        
        this.bn9Field = document.getElementById("s1biz-bn-wrapper");
        this.bnFreeFormField = document.getElementById("s1biz-bnfreeform")
        this.prefixDiv = this.accountFieldset.querySelector(".static");

        this.individualTaxTypeDropdown.addEventListener("change", () => {
           
                this.thirdPartyDisplay(1, this.individualTaxTypeDropdown.value);
            
        });
        this.businessTypeDropdown.addEventListener("change", () => {
           
                this.updateAccountField(this.businessTypeDropdown.value);
                this.thirdPartyDisplay(2, this.businessTypeDropdown.value);
        });
    }

    thirdPartyDisplay(flow, selectedValue) {
        if (selectedValue === "thirdparty") {
            if(flow === 1) {
                this.indThirdPartyNumber.classList.remove("hidden");
                this.bizThirdPartyNumber.classList.add("hidden");
                this.bnFreeFormField.classList.add("hidden");
                this.bn9Field.classList.add("hidden");
            }
            else {
                this.bizThirdPartyNumber.classList.remove("hidden");
                this.indThirdPartyNumber.classList.add("hidden");
                this.bnFreeFormField.classList.remove("hidden");
                this.bn9Field.classList.add("hidden");


            }
        }
        else {
            this.indThirdPartyNumber.classList.add("hidden");
            this.bizThirdPartyNumber.classList.add("hidden");
            this.bnFreeFormField.classList.add("hidden");
            this.bn9Field.classList.remove("hidden");

        }
             
    }
   updateAccountField(selectedValue) {

        if(selectedValue !== "thirdparty"){
        // Update the prefix div
                this.prefixDiv.textContent = selectedValue || "";

                // Show/hide the fieldset
                if (selectedValue) {
                    this.accountFieldset.classList.remove("hidden");
                } else {
                    this.accountFieldset.classList.add("hidden");
                }
        }
        else {

        }
        
        
        
    }
}
class Step2Handler {
    constructor() {

        this.noticeTypeSelection = document.querySelectorAll('input[name="s2q1"]');
        this.noticeDateField = document.getElementById("s2-noticedate-field");
        this.noticeDateLabel = this.noticeDateField.parentElement.querySelector('label');
        this.extensionFieldset = document.getElementById("s2-timeextension-fieldset");

        this.userType = this.getUserType();
    
        this.taxYearsFieldset = document.getElementById("tax-years-fieldset");
        this.fiscalFieldset = document.getElementById("fiscal-period-fieldset");
        this.lineSearchField = document.getElementById("s2q5-field");
        this.searchDropdown = document.getElementById("s2q5-dropdown");
        this.taxLinesTableEl = document.getElementById("tax-lines-tb");

        this.taxYearsContainer = document.getElementById("tax-years-container");
        this.addTaxYearBtn = document.getElementById("add-tax-year-btn");
        this.taxYearCount = 1;

        if (this.addTaxYearBtn) {
            this.addTaxYearBtn.addEventListener("click", () => this.addTaxYearInput());
        }
        

        this.taxLineLists = {
            Individual: [
                
                { value: "15000", description: "Total income" },
                { value: "12600", description: "Net rental income" },
                { value: "22100", description: "Carrying charges and interest expenses" },
                { value: "22900", description: "Other employment expenses" },
                { value: "23200", description: "Other deductions" },
                { value: "13800", description: "Gain (or loss) - Real estate, depreciable property, and other properties" },
                { value: "13000", description: "Other income" },
                { value: "10100", description: "Employment Income (box 14 on all T4 slips)" },
                { value: "12000", description: "Taxable amount of dividends from taxable Canadian corporations" },
                { value: "12100", description: "Interest and other investment income" },
                { value: "43700", description: "Total income tax deducted" },
                { value: "21900", description: "Moving expenses" },
                { value: "21400", description: "Child care expenses" },
                { value: "24500", description: "Total contributions made to your RRSP or your spouse or common-law partner's RRSP"},
                { value: "20800", description: "RRSP deduction" },
                { value: "60360", description: "Home renovation expenses" },
                { value: "33099", description: "Medical expenses" },
                { value: "34000", description: "Allowable charitable donations and government gifts" },
                { value: "31270", description: "Home buyer's amount" },
                { value: "17900", description: "Principal residence designation" },
            ],
            Business: [             
                { value: "90", description: "Taxable sales (including zero-rated supplies) made in Canada" },
                { value: "91", description: "Exempt supplies, zero-rated exports, and other sales and revenue" },
                { value: "101", description: "Total sales and other revenue" },
                { value: "102", description: "Your associates’ taxable sales (including zero-rated supplies) made in Canada" },
                { value: "135", description: "Total GST/HST new housing rebates" },
                { value: "136", description: "Deduction for pension rebate amount" },
                { value: "103", description: "GST/HST collected or that became collectible in the reporting period" },
                { value: "104", description: "Adjustments to be added to the net tax for the reporting period" },
                { value: "105", description: "Total GST/HST and adjustments for this period" },
                { value: "106", description: "ITCs for the current period and unclaimed ITCs from a previous period" },
                { value: "107", description: "Adjustments to be deducted when determining the net tax for the reporting period" },
                { value: "108", description: "Total ITCs and adjustments" },
                { value: "109", description: "Net tax" },
                { value: "110", description: "Instalments and other annual filer payments" },
                { value: "111", description: "Rebates" },
                { value: "205", description: "GST/HST due on purchases of real property or purchases of emission allowances" },
                { value: "405", description: "Other GST/HST to be self-assessed" },
                { value: "114", description: "Refund claimed" },
                { value: "115", description: "Amount owing" }
],
            Trust: [
                { value: "1", description: "Trust income" },
                { value: "10", description: "Taxable capital gains" }
            ]
        };
       
        this.lineSearchField.addEventListener("keyup", () => {
            this.filterSearch(this.lineSearchField, this.searchDropdown)
        })

        this.taxLinesTable = new TableObj("tax-lines-tb", {
            allowEdit: false,
            allowDelete: true
        });

     

        //Listeners
        document.querySelectorAll('input[name="s2q1"]').forEach(input => {
            input.addEventListener("change", () => {
                this.noticeDateField.value = "";
                this.checkNoticeType();
                
            });
        });  
        this.noticeDateField.addEventListener("change", () => {
            this.handleNoticeDateChange();
            this.checkNoticeType();
        });
         this.lineSearchField.addEventListener("focus", () => {
            this.searchDropdown.classList.remove("hidden")
        })
        this.searchDropdown.addEventListener("click", (e) => {
            const option = e.target.closest("option");
            if (!option) return;

            this.handleLineSelection(option);
        });
        
        this.updateTableVisibility();
        document.addEventListener("rowDeleted", (e) => {
            if (e.detail?.tableID === "tax-lines-tb") {
                this.updateTableVisibility();
            }
        });

    }
    getUserType(){
        const step1 = DataManager.getData("stepData_1");
        const normalized = {
            "A business": "Business",
            "A trust": "Trust",
            "Individual": "Individual"
            };

        this.userType = normalized[step1?.s1q7];
    }
    onActivate() {
        this.getUserType();
        this.clearTaxLinesTable();
        this.populateTaxLines();
        this.setYearOrFiscalField();
    }

    
    setYearOrFiscalField() {

        if (!this.userType) return;

        if (this.userType === "Business") {
            this.taxYearsFieldset.classList.add("hidden");
            this.fiscalFieldset.classList.remove("hidden");
        } else {
            this.taxYearsFieldset.classList.remove("hidden");
            this.fiscalFieldset.classList.add("hidden");
        }
    }

    addTaxYearInput() {
        this.taxYearCount++;
        const newInput = document.createElement("input");
        newInput.type = "number";
        newInput.id = "s2q3-field";
        newInput.name = "s2q3";
        newInput.min = "1900"
        newInput.max = "2100"
        newInput.dataset.array = "true";
        newInput.classList.add("tax-year-input", "quarter-width");
        this.taxYearsContainer.appendChild(newInput);
       
     
    }
    
    clearTaxLinesTable() {
        this.taxLinesTable.rows = [];
        this.taxLinesTable.refreshTable();
        this.updateTableVisibility();
        if (this.lineSearchField) this.lineSearchField.value = "";
        if (this.searchDropdown) this.searchDropdown.classList.add("hidden");
    }

    populateTaxLines() {
        const dropdown = this.searchDropdown;
        dropdown.innerHTML = ""; // clear existing

        
       
        if (!this.userType || !this.taxLineLists[this.userType]) return;

        this.taxLineLists[this.userType].forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.value;
            opt.dataset.description = item.description;
            opt.textContent = `${item.value}: ${item.description}`;
            dropdown.appendChild(opt);
        });
    }
    checkNoticeType() {
        const selected = document.querySelector('input[name="s2q1"]:checked');
       
        if (!selected) return;
       

        const isDetermination =
            selected.value === "Notice of determination or redetermination";

        const provinceFieldset = document.getElementById("s2q4-fieldset");
        const taxLineFieldset = document.getElementById("s2q5-fieldset");

       
        const asterisk = this.noticeDateLabel.querySelector(".label-ast");
        // Always rebuild the label text from a stable prefix
        const prefix = "Date on notice of ";
       

        if (isDetermination) {
           
            this.noticeDateLabel.textContent = `${prefix}determination or redetermination`;
            // Re-insert the asterisk at the front if it existed
            if (asterisk) {
                 this.noticeDateLabel.insertBefore(asterisk,  this.noticeDateLabel.firstChild);
            }

            provinceFieldset.classList.add("hidden");
            taxLineFieldset.classList.add("hidden");
             // clear province
            const provinceSelect = document.getElementById("s2q4-field");
            if (provinceSelect) provinceSelect.value = "";

            // clear tax lines
            this.taxLinesTable.rows = [];
            this.taxLinesTable.refreshTable();
        } 
        else {
            this.noticeDateLabel.textContent = `${prefix}assessment or reassessment`;
            // Re-insert the asterisk at the front if it existed
            if (asterisk) {
                 this.noticeDateLabel.insertBefore(asterisk,  this.noticeDateLabel.firstChild);
            }


        }
    }
    handleNoticeDateChange() {
        const dateValue = this.noticeDateField.value;
        const showExtension = this.isMoreThan90Days(dateValue);


        if (this.extensionFieldset) {
            this.extensionFieldset.classList.toggle("hidden", !showExtension);
        }
    }

    isMoreThan90Days(dateStr) {
        const entered = new Date(dateStr);

        if (isNaN(entered)) {
            return false;
        }

        const today = new Date();
        const diffDays = (today - entered) / (1000 * 60 * 60 * 24);

        return diffDays > 90;
    }

    updateTableVisibility() {

        if (this.taxLinesTable.rows.length > 0) {
            this.taxLinesTableEl.classList.remove("hidden");
        } else {
            this.taxLinesTableEl.classList.add("hidden");
        }
    }
    handleLineSelection(option) {
        const lineNumber = option.value;
        const description = option.dataset.description;
        const alreadyExists = this.taxLinesTable.rows.some(row => row.line === lineNumber);
        if (alreadyExists) {
            this.searchDropdown.classList.add("hidden");
            this.lineSearchField.value = option.textContent;
            return; // Stop here — don't add again
        }
        this.lineSearchField.value = option.textContent;
        this.searchDropdown.classList.add("hidden");

        this.taxLinesTable.addRow({
            line: lineNumber,
            description: description
        });
        this.lineSearchField.value = "";
        this.lineSearchField.blur();
        this.updateTableVisibility();
    }



    filterSearch(input, dropdown) {
        const filter = input.value.toUpperCase();

        const option = dropdown.getElementsByTagName("option");
        for (let i = 0; i < option.length; i++) {
            var txtValue = option[i].textContent || option[i].innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                option[i].style.display = "";
            } else {
                option[i].style.display = "none";
            }
        }
    }
    

}

class Step3Handler {
    constructor(stepper) {
        this.stepper = stepper;
        this.reviewContainer = document.getElementById("s3-review-container");
        this.submitBtn = document.getElementById("appsubmit-btn");
        this.populateReview();

        // Listen for navigation events
        document.addEventListener("navigateToStep", (event) => {
            this.stepper.setActive(this.stepper.steps[event.detail.index]);
        });

        this.submitBtn.addEventListener('click', () => {
            sessionStorage.setItem("navigatingToConfirmation", "true");
            // Store necessary data in sessionStorage to retrieve on confirmation page


            // Redirect to confirmation page
            window.location.href = "confirmation.html";
        });
    }

    populateReview() {
        this.reviewContainer.innerHTML = ""; // Clear previous content

        const steps = [{
                stepNum: 1,
                title: "Provide objection information",
                storageKey: "stepData_1"
            },
            {
                stepNum: 2,
                title: "Describe your objection",
                storageKey: "stepData_2"

            }
        ];
        steps.forEach(({ stepNum, title, storageKey, labels }) => {
            let data = DataManager.getData(storageKey);
            if (!data) return; 

            // Replace field names with question labels
            let formattedData = {};
            let subTableData = null; // Placeholder for subtable
            

            Object.keys(data).forEach(key => {
                let value = data[key];
                if (value == null) return;

                // Only create a subtable for s2q5_lines
                if (key === "s2q5") {
                    subTableData = {
                        title: "Tax line you want to object to",
                        headers: ["Line", "Description"],
                        columns: ["line", "description"],
                        rows: value
                    };
                    return; // skip adding s2q5_lines to main data table
                }

                if (key === "s1biz-accountype") {
                    const select = document.getElementById("s1biz-accountype"); // your select input
                    if (select) {
                        value = select.selectedOptions[0]?.text || value;
                    }
                }

                // Format dates
                if (key.toLowerCase().includes("date")) {
                    value = this.formatDate(value);
                }

                // Use proper labels
                const label = this.getLabelForInput(key);
                formattedData[label] = value;
            });
            new PanelObj({
                container: this.reviewContainer,
                title: title,
                data: formattedData, // Use the formatted data with proper labels
                editButton: true,
                editIndex: stepNum,
                reviewPanel: true,
                subTable: subTableData
            });
        });

        // Listen for edit button clicks
        document.addEventListener("editPanelEvent", (event) => {
            this.stepper.setActive(this.stepper.steps[event.detail.index]);
        });
    }

    formatDate(value) {
        if (!value)
            return "N/A";
        const date = new Date(value);

        if (isNaN(date))
            return value;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }


    getLabelForInput(name) {
        let label = "";

        // Handle standard <label for="...">
        const input = document.querySelector(`[name="${name}"]`);
        if (input) {
            const labelElement = document.querySelector(`label[for="${input.id}"]`);
            if (labelElement) {
                const cloned = labelElement.cloneNode(true);
                // Remove help links/icons and asterisks
                cloned.querySelectorAll('a, span, .label-ast').forEach(el => el.remove());
                label = cloned.textContent.trim();
            }
        }

        // Handle radio/checkbox inside a <fieldset>
        const fieldset = document.querySelector(`fieldset [name="${name}"]`);
        if (fieldset) {
            const legend = fieldset.closest("fieldset").querySelector("legend");
            if (legend) {
                const cloned = legend.cloneNode(true);
                // Remove help links/icons and asterisks
                cloned.querySelectorAll('a, span, .label-ast').forEach(el => el.remove());
                label = cloned.textContent.trim();
            }
        }

        // Final cleanup: remove any leftover asterisks or whitespace
        return label.replace(/^\*\s*/, "").trim() || name;
    }


}

class CharacterCounter {
    constructor(textarea) {
        this.textarea = textarea;
        this.maxLength = parseInt(textarea.dataset.maxlength, 10) || null;

        this.counterEl = document.createElement("div");
        this.counterEl.classList.add("char-counter");

        textarea.insertAdjacentElement("afterend", this.counterEl);

        this.updateCount();

        textarea.addEventListener("input", () => {
            this.updateCount();
        });
    }

    updateCount() {
        const currentLength = this.textarea.value.length;

        if (this.maxLength) {
            this.counterEl.textContent = `${currentLength} / ${this.maxLength} characters`;
        } else {
            this.counterEl.textContent = `${currentLength} characters`;
        }
    }
}

class PanelObj {
    constructor({
        container,
        title,
        data,
        editButton = false,
        editIndex = null,
        deleteButton = false,
        reviewPanel = false,
        labels = null,
        subTable = null
    }) {
        this.container = container; // The DOM element where the panel should be appended
        this.title = title;
        this.data = data;
        this.editButton = editButton;
        this.editIndex = editIndex;
        this.deleteButton = deleteButton;
        this.reviewPanel = reviewPanel;
        this.labels = labels; // Store optional labels
        this.subTable = subTable;

        this.render();
    }

    render() {

        this.panelElement = document.createElement("div");
        this.panelElement.classList.add("panel");

        let editButtonHTML = this.editButton ?
            `<button type="button" class="btn-tertiary edit-btn" data-index="${this.editIndex}"><span class="material-icons">edit</span>Edit</button>` : "";

        let deleteButtonHTML = this.deleteButton ?
            `<button type="button" class="btn-tertiary delete-btn" data-index="${this.editIndex}"><span class="material-icons">delete</span>Delete</button>` : "";
        // Generate table rows for main data
        let tableRows = Object.entries(this.data)
            .map(([key, value], index) => {
                if (value) {
                    let label = this.labels && this.labels[index] ? this.labels[index] : this.formatKey(key);
                    return `<tr><td class="label">${label}</td><td>${value}</td></tr>`;
                }

            })
            .join("");

        let subTableHTML = "";

        // Generate sub-table dynamically if data is provided
        if (this.subTable && this.subTable.rows && this.subTable.rows.length > 0) {
            subTableHTML = `
                <h5>${this.subTable.title || "Subtable"}</h5>
                <table class="review-table" cellpadding="0" cellspacing="0">
                    <thead>
                        <tr>
                            ${this.subTable.headers.map(header => `<th>${header}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.subTable.rows.map(row => `
                            <tr>
                                ${this.subTable.columns.map(column => `<td>${row[column] || "N/A"}</td>`).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }

        this.panelElement.innerHTML = `
            <div class="heading-row">
                <h5>${this.title}</h5>
                <div>
                ${editButtonHTML}
                ${deleteButtonHTML}
                </div>
                
            </div>
            <table class="panel-data">
                ${tableRows}
            </table>
            <div>

            ${subTableHTML} <!-- Dynamically insert sub-table if applicable -->
                        </div>

        `;

        this.container.appendChild(this.panelElement);

        const editButton = this.panelElement.querySelector(".edit-btn");

        if (editButton) {
            editButton.addEventListener("click", () => this.emitEditEvent());
        }
        const deleteButton = this.panelElement.querySelector(".delete-btn");

        if (deleteButton) {
            deleteButton.addEventListener("click", () => this.emitDeleteEvent());
        }
    }

    formatKey(key) {
        return key
            .replace(/([A-Z]{2,})/g, match => match) // Keep acronyms like SIN intact
            .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert spaces only between words
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
    }

    emitEditEvent() {
        if (this.reviewPanel) {
            document.dispatchEvent(new CustomEvent("navigateToStep", {
                detail: {
                    index: this.editIndex
                }
            }));
        } else {
            document.dispatchEvent(new CustomEvent("editPanelEvent", {
                detail: {
                    index: this.editIndex,
                    panelTitle: this.title,
                    panelData: this.data
                }
            }));
        }
    }
    emitDeleteEvent() {
        document.dispatchEvent(new CustomEvent("deletePanelEvent", {
            detail: {
                index: this.editIndex,
                panelTitle: this.title
            }
        }));
    }
}

class TableObj {
    constructor(tableID, {
        allowEdit = true,
        allowDelete = true
    } = {}) {
        this.table = document.getElementById(tableID);
        this.tbody = this.table.querySelector("tbody");
        this.defaultText = this.tbody.dataset.placeholder;
        this.columnCount = this.table.querySelector("thead tr").children.length;
        this.rows = []; // Store data for easier access


        this.allowEdit = allowEdit;
        this.allowDelete = allowDelete;

        // Initialize the table with placeholder text if empty
        this.renderEmptyTable();
    }
    renderEmptyTable() {
        this.tbody.innerHTML = `<tr><td colspan="${this.columnCount + 1}" style="text-align:center;">${this.defaultText}</td></tr>`;
    }
    addRow(data, rowIndex = this.rows.length) {
        // If the table is displaying the default placeholder row, clear it
        if (this.tbody.querySelector("tr") && this.tbody.querySelector("tr").cells.length === 1) {
            this.tbody.innerHTML = "";
        }
        this.rows[rowIndex] = data; // Ensure correct index assignment

        // Create a new row
        const tr = document.createElement("tr");

        // Populate row with data
        Object.values(data).forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value || "N/A"; // Handle empty fields
            tr.appendChild(td);
        });

        // Actions column (placeholder for buttons)
        const actionTd = document.createElement("td");
        let actionHTML = "";

        if (this.allowEdit) {
            actionHTML += `
                <button type="button" class="btn-tertiary edit-btn" data-index="${rowIndex}">
                    <span class="material-icons">edit</span>Edit
                </button>
            `;
        }

        if (this.allowDelete) {
            actionHTML += `
                <button type="button" class="btn-tertiary delete-btn" data-index="${rowIndex}">
                    <span class="material-icons">close</span>Delete
                </button>
            `;
        }

        actionTd.innerHTML = actionHTML;
        tr.appendChild(actionTd);

        // Append row to table
        this.tbody.appendChild(tr);

        // Attach event listeners
        if (this.allowEdit) {
            actionTd.querySelector(".edit-btn")?.addEventListener("click", (event) => {
                this.emitEditEvent(event.target.closest(".edit-btn").dataset.index);
            });
        }

        if (this.allowDelete) {
            actionTd.querySelector(".delete-btn")?.addEventListener("click", (event) => {
                this.deleteRow(event.target.closest(".delete-btn").dataset.index);
            });
        }

    }

    emitEditEvent(index) {
        index = parseInt(index);
        if (!this.rows[index]) return;

        // Dispatch an event so Step5Handler (or other handlers) can respond
        document.dispatchEvent(new CustomEvent("editRowEvent", {
            detail: {
                tableID: this.table.id,
                index: index,
                rowData: this.rows[index]
            }
        }));
    }
    deleteRow(index) {
        index = parseInt(index);
        this.rows.splice(index, 1);
        this.refreshTable();

        document.dispatchEvent(new CustomEvent("rowDeleted", {
            detail: {
                tableID: this.table.id
            }
        }));
    }
    refreshTable() {
        this.tbody.innerHTML = ""; // Clear the table

        if (this.rows.length === 0) {
            this.renderEmptyTable();
            return;
        }

        this.rows.forEach((rowData, index) => {
            this.addRow(rowData, index);
        });
    }
}

class DatepickerObj {
    constructor(inputId) {
        this.input = document.getElementById(inputId);
        this.wrapper = this.input.closest(".input-wrapper");
        this.icon = this.wrapper.querySelector(".suffix");
        this.modal = this.wrapper.querySelector(".datepicker-modal");

        // Open on icon click
        this.icon.addEventListener("click", (e) => {
            e.stopPropagation();
            DatepickerObj.closeAll(); // Close other open ones
            this.open();
        });

        // Close if clicking outside
        document.addEventListener("click", (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }
    open() {
        const today = new Date();
        this.selectedYear = today.getFullYear();
        this.selectedMonth = today.getMonth();
        this.renderDayView(this.selectedYear, this.selectedMonth);
        this.modal.classList.remove("hidden");
        // Prevent clicks inside the modal from closing it
        this.modal.addEventListener("click", (e) => e.stopPropagation());

        // Mark this step-content as open
        const stepContent = this.wrapper.closest(".step-content");
        if (stepContent) stepContent.classList.add("modal-open");
    }
    close() {
        this.modal.classList.add("hidden");
        const stepContent = this.wrapper.closest(".step-content");
        if (stepContent) stepContent.classList.remove("modal-open");
    }



    static closeAll() {
        document.querySelectorAll(".datepicker-modal").forEach(modal => {
            modal.classList.add("hidden");
        });
    }
    renderDayView(year, month) {
        this.modal.innerHTML = "";

        const container = document.createElement("div");
        container.classList.add("datepicker-grid");

        // Header
        const header = document.createElement("div");
        header.classList.add("datepicker-header");

        // Left: title + dropdown
        const left = document.createElement("div");
        left.classList.add("datepicker-header-left");

        const title = document.createElement("button");
        title.classList.add("datepicker-title-btn");
        title.innerHTML = `${this.getMonthName(month)} ${year} <span class="arrow">▼</span>`;
        title.onclick = () => this.renderYearRange(year - (year % 24));
        left.appendChild(title);

        // Right: arrows
        const right = document.createElement("div");
        right.classList.add("datepicker-header-right");

        const prev = document.createElement("span");
        prev.innerHTML = "&lsaquo;";
        prev.classList.add("datepicker-nav");
        prev.onclick = () => {
            const newMonth = month === 0 ? 11 : month - 1;
            const newYear = month === 0 ? year - 1 : year;
            this.selectedYear = newYear;
            this.selectedMonth = newMonth;
            this.renderDayView(newYear, newMonth);
        };

        const next = document.createElement("span");
        next.innerHTML = "&rsaquo;";
        next.classList.add("datepicker-nav");
        next.onclick = () => {
            const newMonth = month === 11 ? 0 : month + 1;
            const newYear = month === 11 ? year + 1 : year;
            this.selectedYear = newYear;
            this.selectedMonth = newMonth;
            this.renderDayView(newYear, newMonth);
        };

        right.appendChild(prev);
        right.appendChild(next);

        // Final header assembly
        header.appendChild(left);
        header.appendChild(right);
        container.appendChild(header);

        // Weekday headers
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdayRow = document.createElement("div");
        weekdayRow.classList.add("day-row");
        weekdays.forEach(d => {
            const day = document.createElement("div");
            day.classList.add("day-name");
            day.textContent = d;
            weekdayRow.appendChild(day);
        });
        container.appendChild(weekdayRow);

        // Day cells
        const grid = document.createElement("div");
        grid.classList.add("day-grid");

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            empty.classList.add("day-cell", "empty");
            grid.appendChild(empty);
        }

        for (let i = 1; i <= totalDays; i++) {
            const cell = document.createElement("div");
            cell.classList.add("day-cell");
            cell.textContent = i;
            cell.onclick = () => this.selectDate(year, month, i);
            grid.appendChild(cell);
        }

        container.appendChild(grid);
        this.modal.appendChild(container);
    }

    renderYearRange(startYear = this.getCurrent24Start()) {
        this.modal.innerHTML = ""; // Clear modal

        const container = document.createElement("div");
        container.classList.add("datepicker-grid");

        // Header
        const header = document.createElement("div");
        header.classList.add("datepicker-header");

        const prev = document.createElement("span");
        prev.innerHTML = "&lsaquo;";
        prev.classList.add("datepicker-nav");
        prev.onclick = () => this.renderYearRange(startYearAdjusted - 24);

        const title = document.createElement("div");
        title.classList.add("datepicker-title");
        title.textContent = `${startYear} - ${startYear + 23}`;

        const next = document.createElement("span");
        next.innerHTML = "&rsaquo;";
        next.classList.add("datepicker-nav");

        //next.onclick = () => this.renderYearRange(startYear + 24);
        next.style.visibility = "hidden";
        header.appendChild(prev);
        header.appendChild(title);
        header.appendChild(next);
        container.appendChild(header);

        // Year grid
        const grid = document.createElement("div");
        grid.classList.add("year-grid");

        const currentYear = new Date().getFullYear();
        const endYear = currentYear;
        const startYearAdjusted = endYear - 23;

        for (let i = 0; i < 24; i++) {
            const year = startYearAdjusted + i;
            const cell = document.createElement("div");
            cell.classList.add("datepicker-cell");
            cell.textContent = year;

            // Only enable if it's <= current year
            cell.classList.add("clickable");
            cell.onclick = () => this.handleYearClick(year);

            grid.appendChild(cell);
        }
        title.textContent = `${startYearAdjusted} - ${endYear}`;


        container.appendChild(grid);
        this.modal.appendChild(container);
    }

    renderMonthView(year) {
        this.modal.innerHTML = ""; // Clear modal

        const container = document.createElement("div");
        container.classList.add("datepicker-grid");

        // Header with back arrow and year label
        const header = document.createElement("div");
        header.classList.add("datepicker-header");

        const back = document.createElement("span");
        back.innerHTML = "&lsaquo;";
        back.classList.add("datepicker-nav");
        back.onclick = () => this.renderYearRange(this.getCurrent24Start(year));

        const title = document.createElement("div");
        title.classList.add("datepicker-title");
        title.textContent = year;

        header.appendChild(back);
        header.appendChild(title);
        container.appendChild(header);

        // Month grid
        const grid = document.createElement("div");
        grid.classList.add("month-grid");

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        monthNames.forEach((name, index) => {
            const cell = document.createElement("div");
            cell.classList.add("datepicker-cell");
            cell.textContent = name;
            cell.onclick = () => {
                this.selectedMonth = index;
                this.renderDayView(year, index);
            };
            grid.appendChild(cell);
        });

        container.appendChild(grid);
        this.modal.appendChild(container);
    }

    getCurrent24Start(current = new Date().getFullYear()) {
        return current - 23;
    }
    handleYearClick(year) {
        this.selectedYear = year;
        this.renderMonthView(year); // Call month view after picking a year
    }
    selectDate(year, month, day) {
        const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        this.input.value = formatted;
        this.input.dispatchEvent(new CustomEvent('dateSelected', {
            detail: {
                value: this.input.value
            }
        }));
        this.modal.classList.add("hidden");
    }

    getMonthName(index) {
        return ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ][index];
    }



}

class DataManager {
    static saveData(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
        document.dispatchEvent(new CustomEvent("dataUpdated", {
            detail: {
                key,
                data: value
            }
        }));
    }
    static appendToArray(key, newValue) {
        let existingData = DataManager.getData(key) || [];
        if (!Array.isArray(existingData)) existingData = []; // Ensure it's an array
        existingData.push(newValue);
        DataManager.saveData(key, existingData);
    }

    static getData(key) {
        let data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    static clearData(key) {
        sessionStorage.removeItem(key);
    }
}

class FormLightbox {
    constructor(lightbox) {
        this.lightbox = lightbox;
        this.form = this.lightbox.querySelector('form');
        this.openTrigger = document.querySelector(`[data-togglelb="${lightbox.id}"]`);
        this.submitButton = this.lightbox.querySelector('[data-submit]');
        this.editIndex = null;

        if (this.openTrigger) {
            this.openTrigger.addEventListener('click', () => {
                this.openLightbox();
                this.clearFormData();
            });
            if (this.openTrigger.value) {
                var buttonText = document.createTextNode(this.openTrigger.value);
                this.openTrigger.appendChild(buttonText)
            }
        }
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.lightbox.querySelectorAll('[data-closebtn]').forEach(btn => {
            btn.addEventListener('click', () => this.closeLightbox());
        });

        if (this.submitButton) {
            this.submitButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.sendFormData();

            });
        }
    }
    openLightbox() {
        this.lightbox.classList.add('open');
    }

    closeLightbox() {
        this.lightbox.classList.remove('open');
        this.clearEditIndex();
    }

    clearFormData() {
        if (!this.form) return;
        this.form.querySelectorAll("input, select, textarea").forEach(input => {
            if (input.type === "checkbox" || input.type === "radio") {
                input.checked = false;
            } else {
                input.value = "";
                
            }
        });
        let hiddenEls = this.form.querySelectorAll("[data-inithidden]");
        if (hiddenEls.length > 0) {
            hiddenEls.forEach(el => {
                el.classList.add("hidden");
            })
        }
        // Reset spans with data-formelement
        this.form.querySelectorAll("[data-formelement]").forEach(span => {
            span.textContent = span.dataset.placeholder || "";
        });
    }

    populateForm(data) {
        if (!this.form) return;
        Object.keys(data).forEach((key) => {
            const input = this.form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
        });
    }

    sendFormData() {
        const formData = new FormData(this.form);
        let dataObj = {};

        formData.forEach((value, key) => {
            dataObj[key] = value;
        });

        document.dispatchEvent(new CustomEvent("lightboxSubmitted", {
            detail: {
                lightboxId: this.lightbox.id,
                formData: dataObj
            }
        }));

        this.closeLightbox();
    }

    setEditIndex(index) {
        this.editIndex = index;
    }

    getEditIndex() {
        return this.editIndex;
    }
    clearEditIndex() {
        this.editIndex = null;
    }
}

class ProgressiveDisclosure {
    constructor(stepperInstance = null) {
        this.stepper = stepperInstance;
        this.initializeEventListeners();
        this.outConditions = [
            //step 1 selections that result in an "out"
            ["s0q1-op2"],
            ["s1q2-op1"],
            ["s1q2-op3"],
            ["s1q3-op2"]
        ];

    }

    initializeEventListeners() {
        // Attach change event to all elements with the `data-toggle` attribute
        document.querySelectorAll('[data-toggle], input[type="radio"], input[type="checkbox"]').forEach(input => {

            input.addEventListener('change', this.handleInputChange.bind(this));


        });

    }

    handleInputChange(event) {
        this.handleToggle(event); // Ensure Progressive Disclosure still works
        this.outCheck(); // Check if the user should be redirected
    }

    handleToggle(event) {
        const input = event.target;
        const toggleTargets = input.getAttribute('data-toggle');



        // Hide all sibling toggle targets in the same group
        this.hideOtherTargets(input);

        // If the current input has a data-toggle, handle its targets
        if (toggleTargets) {
            const targetIds = toggleTargets.split(',').map(id => id.trim());
            targetIds.forEach(targetId => {
                const targetElement = document.getElementById(targetId);
                if (!targetElement) {
                    console.error(`Element with ID '${targetId}' not found.`);
                    return;
                }

                if (input.type === "select-one") {
                    const options = input.childNodes;

                    options.forEach(option => {
                        if (option.selected) {
                            if (option.value != null) {
                                targetElement.classList.remove('hidden');
                            }
                        }
                    });
                }
                if (input.type === "date") {
                    targetElement.classList.remove("hidden");

                }

                if (input.checked) {
                    targetElement.classList.remove('hidden');
                }
            });
        }

        // Adjust stepper height if available
        if (this.stepper) {
            const currStep = this.stepper.activeStep;
            this.stepper.adjustMaxHeight(currStep);
        }
    }


    hideOtherTargets(input) {
        const groupName = input.name;

        if (groupName) {
            const groupInputs = document.querySelectorAll(`input[name="${groupName}"]`);

            groupInputs.forEach(groupInput => {
                const otherTargets = groupInput.getAttribute('data-toggle');

                if (otherTargets) {
                    const targetIds = otherTargets.split(',').map(id => id.trim());

                    targetIds.forEach(targetId => {
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                            this.hideWithSubfields(targetElement);
                        }
                    });
                }
            });

            // Hide all subsequent fieldsets if the current input triggers an out
            const parentFieldset = input.closest("fieldset");
            if (parentFieldset && parentFieldset.classList.contains("hidden")) {
                let nextFieldset = parentFieldset.nextElementSibling;
                while (nextFieldset) {
                    if (nextFieldset.tagName === "FIELDSET") {
                        this.hideWithSubfields(nextFieldset);
                    }
                    nextFieldset = nextFieldset.nextElementSibling;
                }
            }
        }
    }


    hideWithSubfields(element) {
        element.classList.add("hidden");
         

        // Clear all inputs inside the hidden element
        const inputs = element.querySelectorAll('input, select, select-one, textarea, option');
        inputs.forEach(input => {
            if (input.type === 'radio' || input.type === 'checkbox') {
                input.checked = false;
            } else if (input.type === 'text') {
                input.value = '';
               
            }
            else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            }
            
        });

        // Recursively hide any nested fields inside this element
        const nestedToggles = element.querySelectorAll('[data-toggle]');
        nestedToggles.forEach(nestedToggle => {
            const nestedTargets = nestedToggle.getAttribute('data-toggle');
            if (nestedTargets) {
                nestedTargets.split(',').forEach(nestedTargetId => {
                    const nestedTargetElement = document.getElementById(nestedTargetId.trim());
                    if (nestedTargetElement) {
                        this.hideWithSubfields(nestedTargetElement);
                    }
                });
            }
        });
    }

    outCheck() {
        let selectedInputs = Array.from(document.querySelectorAll('input:checked')).map(input => input.id);

        let isOut = this.outConditions.some(conditionSet => conditionSet.every(id => selectedInputs.includes(id)));

        this.updateNavigationButtons(isOut);

    }

    updateNavigationButtons(isOut) {
        const activeStep = document.querySelector('.step.active'); // Get the current active step
        if (!activeStep) return;

        const nextBtn = activeStep.querySelector('.next-button');
        const backBtn = activeStep.querySelector('.back-button');
        const outBtn = activeStep.querySelector('.out-button');

        if (!outBtn) return; // If no next button is found, exit

        if (isOut) {
            nextBtn.classList.add("hidden");
            if (backBtn)
                backBtn.classList.add("hidden");

            outBtn.classList.remove("hidden");

        } else {
            nextBtn.classList.remove("hidden");
            if (backBtn)
                backBtn.classList.remove("hidden");

            outBtn.classList.add("hidden");
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {


    // Initialize Stepper
    const stepper = new Stepper('.step');



    // Initialize ProgressiveDisclosure and pass the stepper instance
    new ProgressiveDisclosure(stepper);

    // Load the last step from session storage
    const savedStepId = sessionStorage.getItem('currentStep');
    if (savedStepId) {
        stepper.jumpStep(savedStepId);
    }

    // Add event listeners to all next buttons
    document.querySelector('.stepper').addEventListener('click', (event) => {
        if (event.target.classList.contains('next-button')) {
            stepper.navigateStep('next');

        } else if (event.target.classList.contains('back-button')) {
            stepper.navigateStep('back');

        }
    });

    // Populate radio button labels with their 'value'
    const inputsWithLabels = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    inputsWithLabels.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
            label.textContent = input.value;

        }
    });

    document.querySelectorAll("textarea[data-maxlength]").forEach(textarea => {
        new CharacterCounter(textarea);
    });

    //Add asterisks to all required fields
    const requiredInputs = document.querySelectorAll('.required-label');
    requiredInputs.forEach(input => {
        if (input) {

            const asterisk = document.createElement('span');
            asterisk.textContent = '* ';
            asterisk.classList.add('label-ast');

            input.insertBefore(asterisk, input.firstChild);
        }
    });


    //Accordion functionality
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        accordion.addEventListener('click', function() {
            this.classList.toggle('active');

        });
    });

});

window.addEventListener('beforeunload', (event) => {
    if (!sessionStorage.getItem("navigatingToConfirmation")) {
        sessionStorage.clear();
    }
    sessionStorage.removeItem("navigatingToConfirmation"); // Reset flag after navigation
});