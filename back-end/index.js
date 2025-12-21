const {By, Builder, Browser, until, Capabilities, WebElement} = require('selenium-webdriver');
const assert = require("assert");
const firefox = require('selenium-webdriver/firefox');
const questionsContainerXPath = '//*[@id="mG61Hd"]/div[2]/div/div[2]';
var driver;
const os = require("os");

var fs = require('fs');
const { get } = require('http');
//const { generateKey } = require('crypto');
//const { Children } = require('react');

////////////////////////////////////////////////
const answers = [
  /*{type: "gaussian", params: [1,5,1.7,1.3]},
  {type: "biased", params: [70,15,8,]},
  {type: "gaussian", params: [1,5,1.7,1.3]},
  {type: "gaussian", params: [1,6,2.3,1.3]},
  {type: "biased", params: [59,38,3]},
  {type: "gaussian", params: [1,6,2,1.1]},
  {type: "biased", params: [52,12,36]},
  {type: "gaussian", params: [1,5,4,1.7]},
  {type: "gaussian", params: [1,4,2.7,1.4], logic: {"prev_answer": [4,5]}},
  {type: "biased", params: [3,11,86]},
  {type: "multi_biased", params: [3,2,0,1,7,6,2,0,2]},
  {type: "gaussian", params: [2,7,5.4,1.6]},
  {type: "random", params: [1,7]},
  {type: "random", params: [1,7]},*/
];

const applicants = 1;
const  original_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfihgEgw1Zokr9RvFH8RyAu5F7RZ8Ul_AgzxYd6VHDqGun7YQ/viewform';
//const original_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe_Fx31KB48P0Np_yuHRsi-pPeq4O3H8uoZTy1WKhwsAy18ug/viewform'

///////////////////////////////////////////////

const identifiers ={
  "trickster":-1,
  "shortText":0,
  "longText":1,
  "multipleChoice":2,
  "dropdown":3,
  "checkbox": 4,
  "scale": 5,
  "multipleGridChoice":7,
  "rating":18,
};

/* Utility Functions */

Object.defineProperty(Array.prototype, 'sum', {
  value: function() {
    return this.reduce((a, b) => a + b, 0);
  }
});

Object.defineProperty(Array.prototype, 'indexOfAll', {
  value: function(searchElement, fromIndex = 0) {
    var indexes = [];
    for (var i = fromIndex; i < this.length; i++) {
      if (this[i] === searchElement) {
        indexes.push(i);
      }
    }
    return indexes;
  }
});

Object.defineProperty(Math, 'randomInt', {
  value: function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
});

Object.defineProperty(String.prototype, 'reverse', {
  value: function() {
    return this.split('').reverse().join('');
  }
});

function compareNumbersDescending(a, b) {
  return b - a;
}

/* Index functions */

/*
@param {number} min - The minimum index (inclusive)
@param {number} max - The maximum index (inclusive)
@param {number} median - The median value of the Gaussian distribution (Where the peak occurs)
@param {number} standardDeviation - The standard deviation of the Gaussian distribution (How spread out the values are | Higher values = more spread)
@returns {number} - The selected index based on the Gaussian distribution
*/
function gaussianRandom(min, max, median, standardDeviation) {
  var indexProbabilities;
  var probabilityDensites = [];
  var sum = 0;
  for (var i = min; i <= max; i++) {
    const exponent = -0.5 * Math.pow((i - median) / standardDeviation, 2);
    probabilityDensites.push((1 / (standardDeviation * Math.sqrt(2 * Math.PI))) * Math.pow(Math.E, exponent));
    sum += probabilityDensites[i - min];
  }

  indexProbabilities = probabilityDensites.map(probabilityDensity => (probabilityDensity / sum) * 100);

  return biasedRandom(...indexProbabilities);
}

/*
@param {...number} probabilities - The probabilities for each index adding up to 100
@returns {number} - The selected index based on the biased probabilities
*/
function biasedRandom(...probabilities) {
  const fate = Math.random() * 100;
  const decendingProbabilities = probabilities.sort(compareNumbersDescending);
  let cumulativeProbability = 0;

  for (let i = 0; i < decendingProbabilities.length; i++) {
    cumulativeProbability += decendingProbabilities[i];

    if (fate <= cumulativeProbability) {
      const targetProbability = decendingProbabilities[i];
      const occurrences = probabilities.indexOfAll(targetProbability);
      return occurrences[Math.randomInt(0, occurrences.length - 1)];
    }
  }
}

/*
@param {number[]} probabilities - An array of probabilities for each index
@returns {number[]} - An array of selected indexes based on the biased probabilities
*/
function multipleBiased(probabilities) {
  var selectedIndexes = [];
  for (let i = 0; i < probabilities.length; i++) {
    const fate = Math.random() * 100;
    if (fate <= probabilities[i]) {
      selectedIndexes.push(i);
    }
  }
  return selectedIndexes;
}

/*
@param {Object[]} args - An array of objects with 'ans' and 'prop' properties where sum of 'prop' being 100
@returns {string} - The selected answer based on the biased probabilities
*/
function biasedText(args) {
  let probabilities = args.map(item => item.prop);
  let selectedIndex = biasedRandom(...probabilities);
  return args[selectedIndex].ans;
}

/*
@param {number} min - The minimum index (inclusive)
@param {number} max - The maximum index (inclusive)
@param {number} amount - The number of unique indexes to select
@returns {number[]} - An array of selected unique indexes
*/
function multipleRandom(min, max, amount){
  var selectedIndexes = [];
  while (selectedIndexes.length < amount) {
    const randomIndex = Math.randomInt(min, max);
    if (!selectedIndexes.includes(randomIndex)) {
      selectedIndexes.push(randomIndex);
    }
  }
  return selectedIndexes;
}

/*
@param {Object} answerConfig - The answer configuration object
@returns {number|number[]|string|null} - The index(es) or text answer(s) based on the configuration
*/
function getResponseIndex(answerConfig) {
  const { type, params } = answerConfig;
  var min, max, mean, stdev, amount;

  switch(type) {
    case "gaussian":
      [min, max, mean, stdev] = params;
      return gaussianRandom(min-1, max-1, mean-1, stdev);

    case "biased":
      return biasedRandom(...params);

    case "multi_biased":
      return multipleBiased(params);

    case "multi_random":
      [min, max, amount] = params;
      return multipleRandom(min-1, max-1, amount);

    case "random":
      [min, max] = params;
      return Math.randomInt(min-1, max-1);

    case "biased_text":
      return biasedText(params);

    case "none":
      return null;

    default: 
      throw new Error(`Unknown type: ${type}`);
  }
}

/* Error functions */
//What is this mess

function check_negs(list, step){
  for (i in list){
    if(list[i]<0){
      throw `LimitsError at ${step+1}: No negative numbers allowed. The ${Number(i+1)}'st input is negative (${list[i]})`
    }
  }
  return false
}

function int_check(n, n_name, step){
  if(!Number.isInteger(n)){
    throw `TypeError at ${step+1}: ${n_name} has to be an Integer. "${n}" is not an integer`
  }
}

function bounderies_check(min, max, lower, upper, step){
    if(min<lower){
      throw `LimitsError at ${step+1}: Lowerbound (min?: ${min}) can't be less than 1`
    }
    else if(max > upper){
      throw `LimitsError at ${step+1}: The question has only ${upper} possible answers. Not ${max}`
    }
    else if(max < min){ 
      throw `LimitsError at ${step+1}: The Lower limit "min" (${min}) cant be higher than Upper limit "max" (${max})`
    }
}

function multi_biased_error_check(ans, data, step){
  if(ans.params.max > ans.params.props.length){
    throw `Multi-LimitsError at ${step+1}: The Max amount of questions to answer (${ans.params.max}) can't be higher than the number of question properbilleties(${ans.params.props.length})`
  } else if(ans.params.max > data.lenght){
    throw `Multi-LimitsError at ${step+1}: The question has only (${ans.params.length} possible answers. Not ${ans.params.props.length}`
  }
  bounderies_check(ans.params.min, ans.params.max, 0, data.length, step);
};

function text_error_check(){ // TODO
  return;
};

function error_check(question_data, ans, step){
  //console.log(ans)
  var Q_len = question_data.length;
  var Q_type = question_data.type;

  if("biased_text" === ans.type){
    text_error_check(Q_len, ans, step, Q_len);
    return;
  }

  step = parseInt(step);
  var A_type = ans.type;
  var A_len;
  if(A_type === "multi_biased"){
    A_len = ans.params.length;
  } else { 
    A_len = ans.params.length;
  }
  var params = ans.params;
  var min = 0;
  var max = 0;

  check_negs(params, step)
  
  if (A_type === "biased" || A_type === "multi_biased"){
    min = 1;
  }

  /*
  if (A_type === "biased" || A_type === "multi_biased"){
    min = 1;
    max = A_len;
    if(A_type === "multi_biased"){
      if(question_data.must_answer && params.min === 0){
        throw `Multi-LimitsError at ${step+1}: Question ${step+1} is a 'must-answer' question. Therefore Min can't be 0`
      }
      multi_biased_error_check(ans, question_data, step);
    }
  } else {
    min = params[0];
    max = params[1];
  }*/

  if (ans.type === "multi_random"){
    amount = params[2];
    int_check(amount, "Amount", step);
  }

  int_check(min, "Min", step);
  int_check(max, "Max", step);

  //bounderies_check(min, max, 1, Q_len, step);  

  if (Q_type !== "checkbox"){
    if(["multi_biased", "multi_random"].includes(A_type)){
      throw `CompatibilityError at ${step+1}: Answer type ${A_type} not fit for ${Q_type}`
      }
    else if(A_type === "biased"){
      if (params.sum()!==100 && data.mustAnswer){
        throw `LimitsError at ${step+1}: All percentages must add to 100% not ${params.sum()}%. The question is of type 'must-answer'`
      } else if(params.sum()>100){  
        throw `LimitsError at ${step+1}: All percentages must add to 100% or less not ${params.sum()}%`
      }
    }
  }
}


async function elementChildren(element) {
  return await element.findElements(By.xpath("./*"));
}

async function elementXPath(element) {
  let xpath = await driver.executeScript(`
    function getElementXPath(el) {
      if (el && el.id) {
        return 'id("' + el.id + '")';
      }
      const parts = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = el.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
            index++;
          }
          sibling = sibling.previousSibling;
        }
        const tagName = el.nodeName.toLowerCase();
        const part = (index > 1 ? tagName + '[' + index + ']' : tagName);
        parts.unshift(part);
        el = el.parentNode;
      }
      return '/' + parts.join('/');
    }
    return getElementXPath(arguments[0]);
  `, element);
  return xpath;
}

async function probeForum(URL) {
  var data = [];
  await driver.get(URL);

  while(true){
    await driver.wait(async () => {
      const readyState = await driver.executeScript("return document.readyState");
      return readyState === "complete";
    }, 10000).then(() => {console.log("Done")});

    //Main container that holds all questions
    let questionsContainer = await driver.findElement(By.xpath(questionsContainerXPath));
    //Array of the question elements inside the main container
    let questionElements = await elementChildren(questionsContainer);

    let pageData = [];

    for (var i = 0; i < questionElements.length; i++){
      let currentElement = await questionElements[i];
      let currentData = await getElementData(currentElement);
    
      if (currentData === null) {
        // If the given element is not a question, skip it
        continue;
      }

      if (currentData.type === "unsupported"){
        throw `CompatibilityError at ${parseInt(i)+1}: Unsupported itemtype`;
      }

      pageData.push(currentData);

      let pageAnswer;
      if (currentData.type === "longText" || currentData.type === "shortText"){
        pageAnswer = {type: "biased_text", params: [{ans: " ", prop: 100}]};
      } else {
        pageAnswer = {type: "random", params: [1, 1]};
      }

      await answerQuestion(pageAnswer, currentData, i);

    }

    let continueButtonXPath = '/html/body/div/div[2]/form/div[2]/div/div[3]/div[1]/div[1]/';
    // When forms have multiple pages a "back" button appears, therefore we change the XPath accordingly
    continueButtonXPath += (data.length === 0) ? 'div/span/span' : 'div[2]/span/span';

    //Add the "next"/"submit" button to the last question before the page change
    if (pageData.length > 0) {
      pageData[pageData.length - 1].continueXPath = [continueButtonXPath];
    } else {
      //For cases where there are blank sections/pages
      data[data.length - 1].continueXPath.push(continueButtonXPath);
    }

    //We add the current page data to the full data array
    data.push(...pageData);

    let button = await driver.findElement(By.xpath(continueButtonXPath));
    let buttonText = await button.getAttribute("innerHTML");

    if (buttonText === "Submit") {
      console.log("Probing complete");
      return data;
    } else {
      //Continue to next page
      await button.click();
      console.log("Clicking next");
    }

  }
}

/*async function send_prope(URL){
      let data = [];

      await driver.get(URL);

      while (true){
        await driver.wait(async () => {
          const readyState = await driver.executeScript("return document.readyState");
          return readyState === "complete";
        }, 10000);

        let questionHolder = await driver.findElement(By.xpath(questionsContainerXPath));
        let q_elements = await elementChildren(questionHolder);  
        //console.log(q_elements);

        let page_data = [];
        let page_answers = [];

        let skip_counter = 0;
        for (i in q_elements){
          let current = await q_elements[i];
          //let current_data = await get_data(current, i);
          let current_data = await getElementData(current);
          
          if (current_data === null) {
            skip_counter += 1;
            continue;
          }
          if (current_data.type === "unsupported"){
            throw `CompatibilityError at ${parseInt(i)+1}: Unsupported itemtype`;
          }
          page_data.push(current_data);
          if(!["longText", "shortText"].includes(current_data.type)){
            page_answers.push({type: "random", params: [1, 1]});
          } else {
            page_answers.push({type: "biased_text", params: [{ans: " ", prop: 100}]}); 
          }
          await answer_question(page_answers[i-skip_counter], page_data[i-skip_counter], i-skip_counter);
        }
      
        let submit_button_xpath;
        if(data.length === 0){
          submit_button_xpath = '/html/body/div[1]/div[2]/form/div[2]/div/div[3]/div[1]/div[1]/div/span/span';
        } else {
          submit_button_xpath = '/html/body/div/div[2]/form/div[2]/div/div[3]/div[1]/div[1]/div[2]/span/span';
        }

        if (page_data.length > 0){
          page_data[page_data.length-1].continueXPath = [submit_button_xpath];
        } else {
          let last_question = data[data.length-1];
          last_question.continueXPath.push(submit_button_xpath);
        };
        
        data.push(...page_data);

        let submit_button = await driver.findElement(By.xpath(submit_button_xpath)); 
        submit_text = await submit_button.getAttribute("innerHTML");
        
        if(submit_text == "Submit"){
          console.log("Probe done");
          return data;
        }
        await submit_button.click();
    }
}*/

async function getElementData(element) {
  const elementData = await elementChildren(element);

  if (elementData.length === 0) {
    return null;
  }

  let attributeData = await elementData[0].getAttribute("data-params");

  let typeIdentifier;
  let data = {};

  if (attributeData === null || attributeData === undefined) {
    return null;
  }

  const mandatoryStar = await element.findElement(By.xpath("./div/div/div[1]/div/div"));
  const mandatoryAttribute = await driver.executeScript("return arguments[0].querySelectorAll('[aria-label]')", mandatoryStar);
  
  data.mustAnswer = (mandatoryAttribute.length !== 0) ? true : false;

  // The container of the question ellement has a data-params attribute that holds all data for the question
  // We parse the data to extract what we need.
  attributeData = attributeData.slice(4);
  attributeData = JSON.parse(attributeData.reverse().slice(attributeData.reverse().indexOf("]", 1)).reverse());
  attributeData = attributeData.slice(3,5);

  typeIdentifier = attributeData[0];

  const typeIdentifierIndex = Object.values(identifiers).indexOf(typeIdentifier);
  if (typeIdentifierIndex !== -1) {
    data.type = Object.keys(identifiers)[typeIdentifierIndex]
  } else {
    data.type = "unsupported";
    return data;
  }

  //For non text questions, we find the number of options available
  if (!["shortText", "longText"].includes(data.type)) {
    data.length = attributeData[1][0][1].length;
  } else {
    data.length = null;
  }

  data.elementXPath = await elementXPath(element);
  return data;
}

/*
@param {Object} answerConfig - The answer configuration object
@param {Object} questionData - The question data object
@param {number} step - The current step index
@param {number|null} previousAnswerIndex - The index of the previous answer, or null if none
@returns {Promise<number|number[]|string|null>} - The selected index(es) or text answer(s) based on the configuration
*/
async function answerQuestion(answerConfig, questionData, step, previousAnswerIndex) {
  let questionElement = await driver.findElement(By.xpath(questionData.elementXPath));

  //error check

  if(answerConfig.type === "none"){
    return;
  };

  /*
  Needs reworking
  //Checking logic criteria
  if(answerConfig.logic !== undefined){
    switch (Object.keys(answerConfig.logic)[0]) {
      case "previousAnswer":
        // Check if the previous answer index falls within the specified range
        if (answerConfig.logic.previousAnswer[0] > previousAnswerIndex + 1 || previousAnswerIndex + 1 > answerConfig.logic.previousAnswer[1]){
          return null;
        }
        break;
    }
  }
  */

  //Ensure the question element is in view, otherwise some elements may not be interactable causing errors
  await driver.executeScript(
    "arguments[0].scrollIntoView({block: 'center'});", 
    questionElement
  );

  let choices = await getResponseIndex(answerConfig);

  switch(questionData.type){
    case "checkbox": 
      if(!Array.isArray(choices)){
        choices = [choices];
      }

      let checkboxParent = await questionElement.findElement(By.xpath('./div/div/div[2]/div[1]'))
      let checkboxOptions = await elementChildren(checkboxParent);
      for (let answerIndex of choices){
        let checkbox = await checkboxOptions[answerIndex];
        await checkbox.click();
      }
      break;

    case "scale":
      let scaleParent = await questionElement.findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
      let scaleOptions = await elementChildren(scaleParent);
      scaleOptions = scaleOptions.slice(1,-1);
      let scale = await scaleOptions[choices];
      await scale.click();
      break;

    case "multipleChoice":
      let multiParent = await questionElement.findElement(By.xpath('./div/div/div[2]/div[1]/div/span/div'))
      let multiOptions = await elementChildren(multiParent);
      let multi = await multiOptions[choices];
      await multi.click();
      break;

    case "rating":
      let ratingParent = await questionElement.findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
      let ratingOptions = await elementChildren(ratingParent);
      ratingOptions = ratingOptions.slice(1,-1);
      let rating = await ratingOptions[choices];
      await rating.click();
      break;

    case "shortText":
      let shortParagraph = await questionElement.findElement(By.xpath('./div/div/div[2]/div/div[1]/div/div[1]/input'));
      await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", shortParagraph);
      await shortParagraph.sendKeys(choices);
      break;

    case "longText":
      let longParagraph = await questionElement.findElement(By.xpath('./div/div/div[2]/div/div[1]/div[2]/textarea'));
      await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", longParagraph);
      await longParagraph.sendKeys(choices);
      break;
    
    case "dropdown":
      let dropdown = await questionElement.findElement(By.xpath('./div/div/div[2]/div'));
      await dropdown.click();
      await driver.wait(
        until.elementLocated(By.xpath(`html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[${Number(step)+1}]/div/div/div[2]/div/div[2]/div[3]`)),
        5000
      );
      let dropdownOptions = await elementChildren(await questionElement.findElement(By.xpath('./div/div/div[2]/div/div[2]')));
      await dropdownOptions[choices+2].click();
      await driver.wait(
        until.stalenessOf(await questionElement.findElement(By.xpath('./div/div/div[2]/div/div[2]/div[3]'))),
        500
      );
      break;
    case "multipleGridChoice":
      let gridParent = await questionElement.findElement(By.xpath('./div/div/div[2]/div/div/div'));
      //Nodelist containing all rows
      let rows = await driver.executeScript("return arguments[0].querySelectorAll('[role=radiogroup]')", gridParent)

      for (let i = 0; i < rows.length; i++){
        let rowOptions = await driver.executeScript("return arguments[0].querySelectorAll('div[role=radio]')", rows[i]);
        await rowOptions[getResponseIndex(answerConfig)].click();
      }

      break;
    default:
      throw `CompatibilityError at ${parseInt(step)+1}: Unsupported itemtype`
  }

  return choices;

}

/*
@param {string[]} buttonXPaths - An array of XPaths for the buttons to click
*/
async function nextPage(buttonXPaths) {
  //For cases where there are pages with no elements/questions the continueXPath contains multiple XPaths
  for (let button of buttonXPaths) {
    let continueButton = await driver.findElement(By.xpath(button));
    await continueButton.click();
    //Wait until the next page is loaded
    await driver.wait(async () => {
      const readyState = await driver.executeScript("return document.readyState");
      return readyState === "complete";
    }, 10000);
  }
}

async function submitFakeResponse(answersheet, data) {
  let previousAnswerIndex = null;

  for (var step = 0; step < data.length; step++) {
    
    previousAnswerIndex = await answerQuestion(answersheet[step], data[step], step, previousAnswerIndex);

    if (data[step].continueXPath !== undefined) {
      await nextPage(data[step].continueXPath);
    }
  }
  var returnXPath = '/html/body/div[1]/div[2]/div[1]/div/div[4]/a';

  await driver.wait(
    until.elementLocated(By.xpath(returnXPath)),
    10000
  );
}

/*
async function submitFakeResponse(answersheet, data){
  let prev_answer_index = null;
  for (step in data){
    prev_answer_index = await answer_question(answersheet[step], data[step], step, prev_answer_index);
    if(data[step].continueXPath !== undefined){
      for(var i in data[step].continueXPath){
        let continue_button = await driver.findElement(By.xpath(data[step].continueXPath[i]));
        await continue_button.click();
        await driver.wait(async () => {
          const ready_state = await driver.executeScript("return document.readyState");
          return ready_state === "complete";
        }, 10000);
      }
    }
  }
//end
  var return_xpath = '/html/body/div[1]/div[2]/div[1]/div/div[4]/a'

  await driver.wait(
    until.elementLocated(By.xpath(return_xpath)),
    10000
  );
}
*/

async function submitWave(applicants, _URL, answers){
  var URL;
  if(_URL.search("\\?") !== -1){
    URL = _URL.slice().concat("&hl=en");
  } else{
    URL = _URL.slice().concat("?hl=en");
  }
  console.log(URL);
  var ans = answers;
  
  var config_paths = await JSON.parse(fs.readFileSync('config_paths.json', 'utf8'));
  let platform = config_paths[os.platform()];

  try {
// load
    const service = new firefox.ServiceBuilder(platform.geckodriver_path); // path to geckodriver
    const options = new firefox.Options()

    //.addArguments('--headless')
    .addArguments('--no-sandbox')
    .setBinary(platform.firefox_path)
    
    .setPreference('permissions.default.image', 2) 
    .setPreference('dom.ipc.plugins.enabled.libflashplayer.so', false) 
    .setPreference('media.autoplay.default', 1)
    .setPreference('media.autoplay.allow-muted', false)
    .setPreference('browser.shell.checkDefaultBrowser', false)
    .setPreference('browser.startup.homepage', 'about:blank')
    .setPreference('startup.homepage_welcome_url', 'about:blank')
    .setPreference('startup.homepage_welcome_url.additional', 'about:blank')
    .setPreference('datareporting.policy.dataSubmissionEnabled', false)
    .setPreference('gfx.downloadable_fonts.enabled', false); 

    driver = await new Builder()
    .forBrowser(Browser.FIREFOX)
    .setFirefoxService(service)
    .setFirefoxOptions(options)
    .build();

    let prope_data = await probeForum(URL);

    for(let i = 0; i<applicants; i++){
      console.log(i+1)
      await driver.get(URL);
      await driver.wait(async () => {
        const readyState = await driver.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 10000);

      await driver.wait(
        until.elementLocated(By.xpath(questionsContainerXPath)),
        10000
      );
      if (ans.length>prope_data.length){
        throw new Error(`ContainmentError: More Answers(${ans.length}) than Questions(${prope_data.length})`)
      } else if (ans.length<prope_data.length){
        throw `ContainmentError: Fewer Answers(${ans.length}) than Questions(${prope_data.length})`
      }

      await submitFakeResponse(answers, prope_data);
  }

  } catch (e) {
    console.log(e);
  } finally {
    driver.close();
  }
}

submitWave(applicants, original_URL, answers);