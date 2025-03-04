/*
Exported:

[
{
    type:"utils", 
    url:"https://", 
    amount:100
},
{
    type:"random",
    id:0
},
{
    type:"biasedrandom",
    id:1,
    params:[0,1,2,3]
}
{
    type:"none",
    id:2,
    params:[]
}
{
    type:"random",
    id:3,
    params:[]
}
]

*/
var order = [{type:"utils"}];

window.onload = () => {
    document.getElementById("submitForm").addEventListener("click", () => {
        document.getElementById("status").textContent = "Submitting...";
        readData();
        chrome.runtime.sendMessage({ action: "submitForm", answer:order }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
                document.getElementById("status").textContent = "Status: Error sending request";
            } else if (response && response.success) {
                document.getElementById("status").textContent = "Status: Form submitted successfully";
            } else {
                document.getElementById("status").textContent = "Status: Failed to submit";
            }
        });
    });
    document.getElementById("add-answer").querySelectorAll(".selector-option").forEach((e) => e.addEventListener("click", function() {
        addAnswerPopup(this.innerText);
    }));
    /*document.getElementById("p-delete-button").addEventListener('click', function() {
        this.parentElement.remove();
    });*/
    /*document.getElementById("temp-submit-button").addEventListener("click", function() {
        readData();
    });*/
};

window.onscroll = function() {scrollFunction()};

function resetObjects(array) {
    array.forEach((e) => {
        if (e.params) {
            e.params = [];
        }
    })
    return true;
}

function readData() {
    order[0] = {
        type: "utils",
        url: document.getElementById("input-url").value,
        amount: document.getElementById("input-amount").value
    };
    var formsFrame = document.getElementById("forms-frame");
    console.log(formsFrame.querySelectorAll("#forms-frame .input-field"));
    resetObjects(order);
    formsFrame.querySelectorAll("#forms-frame .input-field").forEach((e) => {
        var index = [ ...formsFrame.children ].indexOf(e.parentElement.parentElement.parentElement)+1;
        order[index].params.push(Number(e.value));
    });
    console.log(order);

}

function scrollFunction() {
    if (document.body.scrollTop >= 10 || document.documentElement.scrollTop >= 10) {
        document.getElementById("nav-bar").style.height = "30px";
        document.getElementById("title-text").style.fontSize = "12px";
    } else {
        document.getElementById("nav-bar").style.height = "42px";
        document.getElementById("title-text").style.fontSize = "22px";
    }
}




function addAnswerPopup(answerType) {
    var answer = {}
    var targetElement = document.getElementById('add-answer');
    var parentDiv = document.getElementById('forms-frame');
    var wrapper = document.createElement('div');
    var id = parentDiv.children.length;
    var deleteicon = '<svg class="delete-button delete-icon" viewBox="4 4 8 8"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>';
    var addicon = '<svg viewBox="0 0 16 16" fill="none" class="add-button"><path d="M 8 2 L 8 14 M 2 8 L 14 8"></path></svg>'
    wrapper.classList.add('frame-element');
    switch (answerType) {
        case 'Gaussian Distribution':
            //wrapper.innerHTML = `<p class="answer-text" >Gaussian Distrubution</p><p class="id-number">${id}</p>${deleteicon}<div class="input-container"><input class="input-field" placeholder="Mean" type="number"><input class="input-field" placeholder="Stdev" type="number"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"></div>`;
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text" >Gaussian Distrubution</p><div class="input-container"><input class="input-field" placeholder="Mean" type="number"><input class="input-field" placeholder="Stdev" type="number"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"></div></div>${deleteicon}`;
            answer.type = "gaussian";
            break;
        case 'Biased Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text">Biased Random</p><div class="input-container"><input class="input-field" type="number"><input class="input-field" type="number">${addicon}</div></div>${deleteicon}`;
            wrapper.children[1].children[1].children[2].addEventListener('click', function() {
                var siblings = this.parentElement.children
                this.insertAdjacentHTML('beforebegin','<input class="input-field" type="number">');
                if (siblings.length > 6) {
                    siblings[siblings.length-1].remove();
                }
            });
            answer.type = "biased";
            break;
        case 'Multi Biased Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text">Multi Biased Random</p><div class="input-container"><input class="input-field" type="number"><input class="input-field" type="number">${addicon}</div></div>${deleteicon}`;
            wrapper.children[1].children[1].children[2].addEventListener('click', function() {
                var siblings = this.parentElement.children
                this.insertAdjacentHTML('beforebegin','<input class="input-field" type="number">');
                if (siblings.length > 6) {
                    siblings[siblings.length-1].remove();
                }
            });
            answer.type = "multi_biased";
            break;
        case 'Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text" >Random</p><div class="input-container"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"></div></div>${deleteicon}`;
            answer.type = "random";
            break;
        case 'Multi Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><div class="container"><p class="answer-text" >Multi Random</p><div class="input-container"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"><input class="input-field" placeholder="Qty" type="number"></div></div>${deleteicon}`;
            answer.type = "multi_random";
            break;
        case 'Blank':
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
    });
    parentDiv.insertBefore(wrapper,targetElement);
    answer.id = order.length
    answer.params = [];
    order.push(answer);
}