const {By, Builder, Browser, until, Capabilities} = require('selenium-webdriver');
const assert = require("assert");
const firefox = require('selenium-webdriver/firefox');
const questionHolder_xpath = '//*[@id="mG61Hd"]/div[2]/div/div[2]';
var driver;
const os = require("os");

var fs = require('fs');
//const { generateKey } = require('crypto');
//const { Children } = require('react');

////////////////////////////////////////////////
const answers = [
  {type: "biased", params: [100,0,0,0,0]},
  {type: "biased", params: [0,0,95,5]},
  {type: "biased", params: [100,0]},
  {type: "biased", params: [0,100]},
  {type: "biased", params: [100,0,0,0]},
  {type: "none"},
  {type: "biased", params: [100,0,0]},
  {type: "biased", params: [100,0,0,0,0,0]},
  {type: "biased", params: [100,0,0,0,0]},
  {type: "biased", params: [0,0,0,0,100]},
  {type: "biased", params: [100,0,0,0,0]},
  {type: "random", params: [1,2]}
];

const applicants = 5;
const URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfVSy4q6FU12oN6aqqTlwNhkzqwAUkUTEVpbXBg3ooUUM57Tg/viewform'

///////////////////////////////////////////////

const identifiers ={
  "checkbox": 4,
  "scale": 5,
  "multipleChoice": 2,
  "rating":18,
  "shortText":0,
  "longText":1,
  "dropdown":3,
  "trickster":-1
};

function getRandomInt(min, max) {
  min = Math.round(min);
  max = Math.round(max);
  return Math.floor(Math.random() * (max - min+1)) + min;
}

function gaussianRandom_ans(min, max, mean, stdev) {
  var dist = [];
  var sum = 0;
  for (var i = min; i<=max; i++){
    sum += (1/(stdev*Math.sqrt(2 * Math.PI)))*Math.pow(Math.E, -(1/2)*Math.pow((i-mean)/stdev,2));
  }
  for (var i = min; i<=max; i++){
    at_index = (1/(stdev*Math.sqrt(2 * Math.PI)))*Math.pow(Math.E, -(1/2)*Math.pow((i-mean)/stdev,2))
    dist.push((at_index/sum)*100);
  }
  return biased_random(...dist);
}

function compareNumbers(a, b) {
  return b - a;
}

function findOcc(list, sus) {
  const Occs = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i] === sus) {
      Occs.push(i);
    }
  }
  return Occs;
}

function biased_random(...args) {
  const args_sorted = [...args].slice().sort(compareNumbers);
  let array_sum = 0;
  const fate = Math.random()*100;
  let the_one = null;
  for (i in args_sorted) {
    const arg = args_sorted[i];
    array_sum += arg;
    if (fate >= array_sum - arg && fate <= array_sum) {
      the_one = arg;
      break;
    }
  }
  const Occs = findOcc(args, the_one);
  return Occs[getRandomInt(0, Occs.length - 1)];
}

function multiple_biased(...args){
  let picks = [];
  for(var i = 0; i<args.length; i++){
    const fate = Math.random()*100;
    if(fate < args[i]){
      picks.push(i);
    }
  }
  return picks
}

function multiple_random(min, max, amount){
  var picks = [];
  var prop = 0
  for(var i = 0; i<amount; i++){
    const fate = Math.random();
    const random = getRandomInt(min, max);
    if(fate < Math.random()){
      picks.push(getRandomInt);
    }
  }
  return picks
}

function List_sum(list){
  var sum = 0
  for (i in list){
    sum += list[i]
  }
  return sum
}

function CheckNegs(list, step){
  for (i in list){
    if(list[i]<0){
      throw `LimitsError at ${step+1}: No negative numbers allowed. The ${Number(i+1)}'st input is negative (${list[i]})`
    }
  }
  return false
}

function IntCheck(n, n_name, step){
  if(!Number.isInteger(n)){
    throw `TypeError at ${step+1}: ${n_name} has to be an Integer. "${n}" is not an integer`
  }
}

function BounderiesCheck(min, max, lower, upper, step){
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

function ErrorCheck(Qtype, ans, step, Qlen){

  step = parseInt(step);
  var Atype = ans.type;
  var Alen = ans.params.length
  var params = ans.params
  var min = 0
  var max = 0

  CheckNegs(params, step)
  
  if (["multi_biased", "biased"].includes(ans.type)){
      min = 1
      max = Alen
    } else {
      min = params[0]
      max = params[1]
    }

  if (ans.type === "multi_random"){
    amount = params[2]
    IntCheck(amount, "Amount", step)
  }

  IntCheck(min, "Min", step);
  IntCheck(max, "Max", step);


  BounderiesCheck(min, max, 1, Qlen, step)

  if (Qtype !== "checkbox"){
    if(["multi_biased", "multi_random"].includes(Atype)){
      throw `CompatibilityError at ${step+1}: Answer type ${Atype} not fit for ${Qtype}`
      }
    else if(Atype === "biased"){
      if (List_sum(params)!==100){
        throw `LimitsError at ${step+1}: All percentages must add to 100% not ${List_sum(params)}%`
    }
  }
}
}

function getResponseIndex(ansConfig) {
  const { type, params } = ansConfig;
  if (type === "gaussian") {
    const [min, max, mean, stdev] = params;
    return gaussianRandom_ans(min-1, max-1, mean-1, stdev);
  } else if (type === "biased") {
    return biased_random(...params);
  } else if(type === "multi_biased"){
    return multiple_biased(...params)
  }else if(type === "multi_random"){
    const [min, max, amount] = params;
    return multiple_random(min-1, max-1, amount);
  }else if(type === "random"){
    const [min, max] = params;
    return getRandomInt(min-1, max-1)
  } else if (type === "dropdown") {
    return biased_random(...params);
  } else if (type === "shortText" || type === "longText") {
    return params[0];
  } else if(type === "none"){
    return null;
  } else {
    throw new Error(`Unknown type: ${type}`);
  }
}

async function get_children(element){
  return await element.findElements(By.xpath("./*"));
}

function reverse_str(s){
  return s.split('').reverse().join('');
}

async function get_xpath(element){
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

async function send_prope(URL){
      let data = [];

      await driver.get(URL);

      while (true){
        await driver.wait(async () => {
          const readyState = await driver.executeScript("return document.readyState");
          return readyState === "complete";
        }, 10000);
        
        let questionHolder = await driver.findElement(By.xpath(questionHolder_xpath));
        let q_elements = await get_children(questionHolder);  

        let page_data = [];
        let page_answers = [];

        let skip_counter = 0;
        for (i in q_elements){
          let current = q_elements[i];
          let current_data = await get_data(current, i);
          if (current_data === null) {
            skip_counter += 1;
            continue;
          }
          page_data.push(current_data);
          page_answers.push({type: "random", params: [1, current_data.length]});
          await answer_question(page_answers[i-skip_counter], page_data[i-skip_counter], i-skip_counter);
        }
      
        let submitButton_xpath;
        if(data.length === 0){
          submitButton_xpath = '/html/body/div[1]/div[2]/form/div[2]/div/div[3]/div[1]/div[1]/div/span/span';
        } else {
          submitButton_xpath = '/html/body/div/div[2]/form/div[2]/div/div[3]/div[1]/div[1]/div[2]/span/span';
        }

        page_data[page_data.length-1].continue_xpath = submitButton_xpath;
        data.push(...page_data);


        let submitButton = await driver.findElement(By.xpath(submitButton_xpath)); 
        submit_text = await submitButton.getAttribute("innerHTML");
        
        if(submit_text == "Submit"){
          console.log("Prope done");
          return data;
        }
        await submitButton.click();
    }
} 

async function get_data(element, step){
  let data_stack = await get_children(element);
  let raw_data = await data_stack[0].getAttribute("data-params");
  let identifier;

  if([null, undefined].includes(raw_data)){
    return null;
  }

  raw_data = raw_data.slice(4);
  raw_data = JSON.parse(reverse_str(reverse_str(raw_data).slice(reverse_str(raw_data).indexOf("]", 1))));
  identifier = raw_data[3];

  let data = {};

  if (Object.values(identifiers).includes(identifier)){
    data.type = Object.keys(identifiers)[Object.values(identifiers).indexOf(identifier)];
  } else {
    throw `CompatibilityError at ${parseInt(step)+1}: Unsupported itemtype`;
  }

  if (!["shortText", "longText"].includes(data.type)){
    data.length = raw_data[4][0][1].length;
  } else {
    data.length = null;
  }

  data.element_xpath = await get_xpath(element);
  return data
}

async function answer_question(ans, data, step){
  let element = await driver.findElement(By.xpath(data.element_xpath));

  if(ans.type==="none"){
    return;
  };

  await driver.executeScript(
    "arguments[0].scrollIntoView({block: 'center'});", 
    element
  );
  //await driver.executeScript("arguments[0].focus();", q_elements[step]);

  switch(data.type){
    case "checkbox": 
      var CheckChoice = await getResponseIndex(ans);
      ErrorCheck(data.type, ans, step, data.length);
      let checkParent = await element.findElement(By.xpath('./div/div/div[2]/div[1]'))
      let Checkbox_options = await get_children(checkParent);

      if(Array.isArray(CheckChoice)){
        for(i in Checkbox_options){
          if(CheckChoice.includes(parseInt(i))){
            let _box = await Checkbox_options[i];
            await _box.click();
          }
        }
      } else {
        let _box = await Checkbox_options[CheckChoice]; //answer_options[i];
        await _box.click();
      }
      break;

    case "scale":
      var scaleChoice = getResponseIndex(ans);
      ErrorCheck(data.type, ans, step, data.length);
      let scaleParent = await element.findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
      let scale_options = await get_children(scaleParent);
      scale_options = scale_options.slice(1,-1);
      let _scale = await scale_options[scaleChoice];
      await _scale.click();
      break;

    case "multipleChoice":
      var multiChoice = getResponseIndex(ans);
      ErrorCheck(data.type, ans, step, data.length);

      let multiParent = await element.findElement(By.xpath('./div/div/div[2]/div[1]/div/span/div'))
      let multi_options = await get_children(multiParent);
      let _multi = await multi_options[multiChoice];

      await _multi.click();
      break;

    case "rating":
      var ratingChoice = getResponseIndex(ans);
      ErrorCheck(data.type, ans, step, data.length);

      let ratingParent = await element.findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
      let rating_options = await get_children(ratingParent);
      rating_options = await rating_options.slice(1,-1);

      let _rating = await rating_options[ratingChoice];
      await _rating.click();
      break;
    case "shortText":
      let shortPragraph = await element.findElement(By.xpath('./div/div/div[2]/div/div[1]/div/div[1]/input'));
      await driver.executeScript("arguments[0].scrollIntoView(true);", shortPragraph);
      await shortPragraph.sendKeys(getResponseIndex(ans));
      break;
    case "longText":
      let longParagraph = await element.findElement(By.xpath('./div/div/div[2]/div/div[1]/div[2]/textarea'));
      await driver.executeScript("arguments[0].scrollIntoView(true);", longParagraph);
      await longParagraph.sendKeys(getResponseIndex(ans));
      break;
    case "dropdown":
      let dropdownChoice = getResponseIndex(ans);
      let dropDown = await element.findElement(By.xpath('./div/div/div[2]/div'));
      await dropDown.click();
      await driver.wait(
        until.elementLocated(By.xpath(`html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[${Number(step)+1}]/div/div/div[2]/div/div[2]/div[3]`)),
        5000
      );
      let choices = await get_children(await element.findElement(By.xpath('./div/div/div[2]/div/div[2]')));
      await choices[dropdownChoice+2].click();
      await driver.wait(
        until.stalenessOf(await element.findElement(By.xpath('./div/div/div[2]/div/div[2]/div[3]'))),
        500
      );
      break;
    default:
      throw `CompatibilityError at ${parseInt(step)+1}: Unsupported itemtype`
  }
};

async function submitFakeResponse(answersheet, data){
  try {
    for (step in data){
      await answer_question(answersheet[step], data[step], step);
      if(data[step].continue_xpath !== undefined){
        let continue_button = await driver.findElement(By.xpath(data[step].continue_xpath));
        await continue_button.click();
        await driver.wait(async () => {
          const readyState = await driver.executeScript("return document.readyState");
          return readyState === "complete";
        }, 10000);
      }
    }
//end
    var return_xpath = '/html/body/div[1]/div[2]/div[1]/div/div[4]/a'

    await driver.wait(
      until.elementLocated(By.xpath(return_xpath)),
      10000
    );
  
    return;
  } catch (e) {
    console.log(e)
  }
}

async function submitWave(applicants, _URL, answers){
  var URL = _URL.slice().concat("?hl=en");
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

    let prope_data = await send_prope(URL);

    for(let i = 0; i<applicants; i++){
      console.log(i+1)
      await driver.get(URL);
      await driver.wait(async () => {
        const readyState = await driver.executeScript('return document.readyState');
        return readyState === 'complete';
      }, 10000);

      await driver.wait(
        until.elementLocated(By.xpath(questionHolder_xpath)),
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


submitWave(applicants, URL, answers);