
var order = [{type:"utils"}];

window.onload = () => {
    load();
    save();
    document.addEventListener('change', () => {
        save();
    });
    document.getElementById("submitForm").addEventListener("click", () => {
        var status = document.getElementById("status");
        status.classList.remove('success','error','medium');
        status.innerHTML = `<span class="bold">Status: </span>Submitting...`;
        readData();
        chrome.runtime.sendMessage({ action: "submitForm", answer:order }, (response) => {
            if (chrome.runtime.lastError) {
                //console.error("Error:", chrome.runtime.lastError.message);
                status.classList.add('medium');
                status.innerHTML = `<span class="bold">Status: </span>Error sending request`;
            } else if (response && response.success) {
                status.classList.add('success');
                status.innerHTML = `<span class="bold">Status: </span>Form submitted successfully`;
                setTextAfterTimeout(status,4000,`<span class="bold">Status: </span> ready`);
            } else {
                status.classList.add('error');
                status.innerHTML = `<span class="bold">Status: </span>${response.error.slice(1,response.error.length-1)}`;
            }
        });
    });
    document.getElementById("add-answer").querySelectorAll(".selector-popup .selector-option").forEach((e) => e.addEventListener("click", function() {
        addAnswerPopup(this.innerText);
    }));
    document.getElementById("day-night-container").addEventListener('click', function() {
        setTheme();
    });
};

function handleFirstClick(e) {
    e = e.target;
	e.value = '0%';
	e.setSelectionRange(1,1);
	e.removeEventListener("click", handleFirstClick);
}

function handlePercent(e) {
    e = e.target;
	//Get the value without the percent (%) sign
	var inputValue = Number(e.value.slice(0, e.value.length - 1)) || 0;

	var value = inputValue;
	//Ensures numbers with trailing decimal don't get deleted
	if (e.value.includes('.')) {
		value = e.value.slice(0, e.value.length - 1);
	}
	//Add decimal point to values over 100
	if (inputValue > 100 && !e.value.includes('.')) {
		//First part before decimal
		var first = e.value.slice(0, 2);
		//Last part after the decimal
		var last = e.value.slice(2, e.value.length - 1);
		//Setting the decimal point
		value = Number(first + '.' + last);
	}
	e.value = value + "%";
	e.setSelectionRange(e.value.length - 1,e.value.length - 1);
    save();
}

window.onscroll = function() {scrollFunction()};

function resetObjects(array) {
    array.forEach((e) => {
        if (e.params) {
            e.params = [];
        }
    })
    return true;
}

function setTheme(theme) {
    theme = theme || document.documentElement.getAttribute('data-UIStyle')
    if (theme === "dark") {
        document.documentElement.setAttribute('data-UIStyle',"light");
        document.getElementById('moon').classList.add('moon-animated');
        document.getElementById('sun').classList.add('sun-animated');
    } else {
        document.documentElement.setAttribute('data-UIStyle',"dark");
        document.getElementById('sun').classList.remove('sun-animated');
        document.getElementById('moon').classList.remove('moon-animated');
    }
    save();
}

function setTextAfterTimeout(element, timeoutms, text) {
    setTimeout(() => {
        element.innerHTML = text;
        element.classList.remove('success','error','medium');
    }, timeoutms);
}

function load() {
    var utils = JSON.parse(localStorage.getItem('utils'));
    var theme = (localStorage.getItem('theme') === "light") ? 'dark' : 'light';
    if (utils) {
        document.getElementById('input-url').value = utils.url || '';
        document.getElementById('input-amount').value = utils.amount || '';
    }
    if (localStorage.getItem('order')) {
        var anwsers = JSON.parse(localStorage.getItem('order'));
        anwsers.forEach((e) => {
            addAnswerPopup(e.type);
            if(e.type !== 'none') {
                var elements = document.getElementById(e.id).children[1].children[1].children;
                var inputContainer = document.getElementById(e.id).children[1].children[1];
                var amountOfFields = inputContainer.querySelectorAll('.input-field').length;
                if (e.params.length !== amountOfFields) {
                    for (var i = 0; i < e.params.length-amountOfFields; i++) {
                        var click = new MouseEvent('click',{bubbles:false});
                        elements[elements.length-1].dispatchEvent(click);
                    }
                }
                if (e.type === 'multi_biased' || e.type === 'biased') {
                    for (var i = 0; i < elements.length; i++) {
                        if (e.params[i] === null) {
                            continue;
                        }
                        var value = e.params[i] + '%';
                        elements[i].value = value;
                    }
                } else {
                    for (var i = 0; i < elements.length; i++) {
                        elements[i].value = e.params[i];
                    }
                }
            }
        });
    }
    setTheme(theme);
}

function save() {
    readData();
    localStorage.setItem('theme', document.documentElement.getAttribute('data-UIStyle'));
    var utils = {}
    utils.url = (document.getElementById('input-url').value) || undefined;
    utils.amount = (document.getElementById('input-amount').value) || undefined;
    localStorage.setItem('utils', JSON.stringify(utils));
    if (order.length > 1) {
        var temp = order.toSpliced(0,1);
        localStorage.setItem('order', JSON.stringify(temp));
    } else {
        localStorage.setItem('order',[]);
    }
    console.info('Data saved');
}

function readData() {
    order[0] = {
        type: "utils",
        url: document.getElementById("input-url").value,
        amount: document.getElementById("input-amount").value
    };
    var formsFrame = document.getElementById("forms-frame");
    resetObjects(order);
    formsFrame.querySelectorAll("#forms-frame .input-field").forEach((e) => {
        var index = [ ...formsFrame.children ].indexOf(e.parentElement.parentElement.parentElement)+1;
        var value;
        if (e.value.includes('%')) {
            value = e.value.slice(0, e.value.length - 1)? Number(e.value.slice(0, e.value.length - 1)) : null;
        } else {
            value = (e.value)? Number(e.value) : null;
        }
        order[index].params.push(value);
    });
}

function scrollFunction() {
    if (document.body.scrollTop >= 10 || document.documentElement.scrollTop >= 10) {
        document.getElementById("logo-container").style.height = "30px";
        document.getElementById("title-text").style.fontSize = "12px";
        document.getElementById("day-night-container").style.height = "30px";
    } else {
        document.getElementById("logo-container").style.height = "42px";
        document.getElementById("title-text").style.fontSize = "22px";
        document.getElementById("day-night-container").style.height = "40px";
    }
}


function deletedElement() {
    var parentDiv = document.getElementById('forms-frame');
    for (var i = 0; i < parentDiv.children.length - 1; i++) {
        parentDiv.children[i].id = i+1;
        parentDiv.children[i].children[0].innerText = i+1;
        order[i+1].id = i+1;
    }
    readData();
}

function addAnswerPopup(answerType) {
    var answer = {}
    var targetElement = document.getElementById('add-answer');
    var parentDiv = document.getElementById('forms-frame');
    var wrapper = document.createElement('div');
    var id = parentDiv.children.length;
    var deleteicon = '<svg class="delete-button delete-icon" viewBox="4 4 8 8"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>';
    var addicon = '<svg viewBox="0 0 16 16" fill="none" class="add-button input-element"><path d="M 8 2 L 8 14 M 2 8 L 14 8"></path></svg>'
    var minusicon = '<svg viewBox="0 0 16 16" fill="none" class="minus-button input-element unavailable"><path d="M3.2 3.2 12.8 12.8M10.4 5.6 12.8 3.2M5.6 10.4 3.2 12.8"></path></svg>'
    wrapper.classList.add('frame-element');
    wrapper.id = id;
    switch (answerType) {
        case 'Gaussian Distribution':
        case 'gaussian':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text" >Gaussian Distrubution</p><div class="input-container gaussian"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"><input class="input-field" placeholder="Mean" type="number"><input class="input-field" placeholder="Stdev" type="number"></div></div>${deleteicon}`;
            answer.type = "gaussian";
            break;
        case 'Biased Random':
        case 'biased':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text">Biased Random</p><div class="input-container biased"><input class="input-field input-element percent" type="text" maxlength="5" placeholder="0%"><input class="input-field input-element percent" type="text" maxlength="5" placeholder="0%">${addicon}${minusicon}</div></div>${deleteicon}`;
            wrapper.children[1].children[1].children[2].addEventListener('click', function() {
                var element = document.createElement('input');
                element.classList.add('input-field', 'input-element', 'percent');
                element.setAttribute('type','text');
                element.setAttribute('maxlength', 5);
                element.setAttribute('placeholder', '0%');
                element.addEventListener('click', handleFirstClick);
                element.addEventListener('input', handlePercent);
                this.parentElement.insertBefore(element, this);
                this.nextElementSibling.classList.remove('unavailable');
                var siblings = this.parentElement.children;
                if (siblings.length > 51) {
                    this.classList.add('unavailable');
                }
                save();
            });
            wrapper.children[1].children[1].children[3].addEventListener('click', function() {
                this.previousElementSibling.previousElementSibling.remove();
                this.previousElementSibling.classList.remove('unavailable');
                var siblings = this.parentElement.children;
                if (siblings.length < 5) {
                    this.classList.add('unavailable');
                }
                save();
            });
            answer.type = "biased";
            break;
        case 'Multi Biased Random':
        case 'multi_biased':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text">Multi Biased Random</p><div class="input-container biased"><input class="input-field input-element percent" type="text" maxlength="5" placeholder="0%"><input class="input-field input-element percent" type="text" maxlength="5" placeholder="0%">${addicon}${minusicon}</div></div>${deleteicon}`;
            wrapper.children[1].children[1].children[2].addEventListener('click', function() {
                var element = document.createElement('input');
                element.classList.add('input-field', 'input-element', 'percent');
                element.setAttribute('type','text');
                element.setAttribute('maxlength', 5);
                element.setAttribute('placeholder', '0%');
                element.addEventListener('click', handleFirstClick);
                element.addEventListener('input', handlePercent);
                this.parentElement.insertBefore(element, this);
                this.nextElementSibling.classList.remove('unavailable');
                var siblings = this.parentElement.children;
                if (siblings.length > 51) {
                    this.classList.add('unavailable');
                }
                save();
            });
            wrapper.children[1].children[1].children[3].addEventListener('click', function() {
                this.previousElementSibling.previousElementSibling.remove();
                this.previousElementSibling.classList.remove('unavailable');
                var siblings = this.parentElement.children;
                if (siblings.length < 5) {
                    this.classList.add('unavailable');
                }
                save();
            });
            answer.type = "multi_biased";
            break;
        case 'Random':
        case 'random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text" >Random</p><div class="input-container random"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"></div></div>${deleteicon}`;
            answer.type = "random";
            break;
        case 'Multi Random':
        case 'multi_random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text" >Multi Random</p><div class="input-container multi-random"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"><input class="input-field" placeholder="Qty" type="number"></div></div>${deleteicon}`;
            answer.type = "multi_random";
            break;
        case 'Blank':
        case 'none':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p class="answer-text" >Blank</p>${deleteicon}`;
            answer.type = "none";
            wrapper.classList.add('alt');
            break;
        case 'Page Break':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p class="answer-text" >Page Break</p>${deleteicon}`;
            answer.type = "none";
            wrapper.classList.add('alt');
            break;
    }
    wrapper.children[2].addEventListener('click', function() {
        let formsFrame = document.getElementById("forms-frame");
        order.splice(([ ...formsFrame.children ].indexOf(this.parentElement)+1),1);
        this.parentElement.remove();
        deletedElement();
        save();
    });
    wrapper.querySelectorAll(".percent").forEach((e) => e.addEventListener("click", handleFirstClick));
    wrapper.querySelectorAll(".percent").forEach((e) => e.addEventListener("input", handlePercent));
    parentDiv.insertBefore(wrapper,targetElement);
    answer.id = order.length
    answer.params = [];
    order.push(answer);
    window.scrollTo({
        top: document.body.scrollHeight || document.documentElement.scrollHeight,
        left: 0,
        behavior: "smooth",
    });
    save();
}