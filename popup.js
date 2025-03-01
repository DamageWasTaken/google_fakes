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
    
        chrome.runtime.sendMessage({ action: "submitForm", answer:order }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
                document.getElementById("status").textContent = "Error sending request.";
            } else if (response && response.success) {
                document.getElementById("status").textContent = "Form submitted successfully!";
            } else {
                document.getElementById("status").textContent = "Failed to submit.";
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
        var index = Array.prototype.indexOf.call(formsFrame.children, e.parentElement.parentElement) + 1;
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
    wrapper.classList.add('frame-element');
    switch (answerType) {
        case 'Gaussian Distribution':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Gaussian Distrubution</p><div class="input-container"><input class="input-field" placeholder="Mean" type="number"><input class="input-field" placeholder="Stdev" type="number"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"></div><button id="p-delete-button" class="delete-button">x</button>`;
            answer.type = "gaussian";
            break;
        case 'Biased Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Biased Random</p><div class="input-container"><input class="input-field" type="number"><input class="input-field" type="number"><button id="p-add-button" class="add-button">+</button></div><button id="p-delete-button" class="delete-button">x</button>`;
            wrapper.children[2].children[2].addEventListener('click', function() {
                this.insertAdjacentHTML('beforebegin','<input class="input-field" type="number">');
            });
            answer.type = "biasedrandom";
            break;
        case 'Multi Biased Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Multi Biased Random</p><div class="input-container"><input class="input-field" type="number"><input class="input-field" type="number"><button id="p-add-button" class="add-button">+</button></div><button id="p-delete-button" class="delete-button">x</button>`;
            wrapper.children[2].children[2].addEventListener('click', function() {
                this.insertAdjacentHTML('beforebegin','<input class="input-field" type="number">');
            });
            answer.type = "multibiasedrandom";
            break;
        case 'Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Random</p><div class="input-container"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"></div><button id="p-delete-button" class="delete-button">x</button>`;
            answer.type = "random";
            break;
        case 'Multi Random':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Multi Random</p><div class="input-container"><input class="input-field" placeholder="Min" type="number"><input class="input-field" placeholder="Max" type="number"><input class="input-field" placeholder="Amount" type="number"></div><button id="p-delete-button" class="delete-button">x</button>`;
            answer.type = "multirandom";
            break;
        case 'Blank':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Blank</p><button id="p-delete-button" class="delete-button">x</button>`;
            answer.type = "none";
            break;
        case 'Page Break':
            wrapper.innerHTML = `<p class="id-number">${id}</p><p>Page Break</p><button id="p-delete-button" class="delete-button">x</button>`;
            answer.type = "none";
            break;
    }
    wrapper.children[wrapper.children.length - 1].addEventListener('click', function() {
        this.parentElement.remove();
    });
    parentDiv.insertBefore(wrapper,targetElement);
    answer.id = order.length
    answer.params = [];
    order.push(answer);
}