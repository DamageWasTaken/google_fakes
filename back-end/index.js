const {By, Builder, Browser, until, Capabilities} = require('selenium-webdriver');
const assert = require("assert");
const firefox = require('selenium-webdriver/firefox');
const questionHolder_xpath = '//*[@id="mG61Hd"]/div[2]/div/div[2]';
var driver;
const os = require("os");

var fs = require('fs');
const { get } = require('http');
//const { generateKey } = require('crypto');
//const { Children } = require('react');

////////////////////////////////////////////////
const answers = [
  {type: "gaussian", params: [1,5,1.7,1.3]},
  {type: "gaussian", params: [1,7,1.9,1.3]},
  {type: "biased", params: [59,38,3]},
  {type: "gaussian", params: [1,6,1,1.1]},
  {type: "biased", params: [52,12,36]},
  {type: "gaussian", params: [1,5,4,1.7]},
  {type: "gaussian", params: [1,4,2.7,1.4], logic: {"prev_answer": [4,5]}},
  {type: "biased", params: [3,11,86]},
  {type: "multi_biased", params: {min: 1, max: 3, props: [20,10,4,2,7,8,2,1,2]}},
  {type: "gaussian", params: [2,7,5.4,1.6]},
  {type: "random", params: [1,7]},
  {type: "random", params: [1,7]},
];

const applicants = 1;
const original_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe_Fx31KB48P0Np_yuHRsi-pPeq4O3H8uoZTy1WKhwsAy18ug/viewform'

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

function get_random_int(min, max) {
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

function compare_numbers(a, b) {
  return b - a;
}

function find_occ(list, sus) {
  const Occs = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i] === sus) {
      Occs.push(i);
    }
  }
  return Occs;
}

function biased_random(...args) {
  const args_sorted = [...args].slice().sort(compare_numbers);
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
  const Occs = find_occ(args, the_one);
  return Occs[get_random_int(0, Occs.length - 1)];
}

function multiple_biased(args){
  let picks = [];
  let picks_amount = Math.floor(Math.random()*((args.max+1)-args.min))+min;
  let amount = 0;
  while(picks_amount === amount){
    const fate = Math.random()*100;
    const subject = Math.floor(Math.random()*args.props.lenght);
    if(fate < args.props[subject]){
      picks.push(i);
    }
  }
  return picks;
}

function biased_text(args){
  let props = [];
  for(let i = 0; i<args.length; i++){
    props.push(args[i].prop);
  }
  return args[biased_random(...props)].ans;
}

function multiple_random(min, max, amount){
  var picks = [];
  var prop = 0
  for(var i = 0; i<amount; i++){
    const fate = Math.random();
    const random = get_random_int(min, max);
    if(fate < random){
      picks.push(get_random_int);
    }
  }
  return picks
}

function list_sum(list){
  var sum = 0
  for (i in list){
    sum += list[i]
  }
  return sum
}

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
    A_len = ans.params.props.length;
  } else {
    A_len = ans.params.length;
  }
  var params = ans.params;
  var min = 0;
  var max = 0;

  check_negs(params, step)
  
  if (A_type === "biased" || A_type === "multi_biased"){
    min = 1;
    max = A_len;
    if(A_type === "multi_biased"){
      if(data.must_answer && params.min === 0){
        throw `Multi-LimitsError at ${step+1}: Question ${step+1} is a 'must-answer' question. Therefor Min can't be 0`
      }
      multi_biased_error_check(ans, data, step);
    }
  } else {
    min = params[0];
    max = params[1];
  }

  if (ans.type === "multi_random"){
    amount = params[2];
    int_check(amount, "Amount", step);
  }

  int_check(min, "Min", step);
  int_check(max, "Max", step);

  bounderies_check(min, max, 1, Q_len, step)

  if (Q_type !== "checkbox"){
    if(["multi_biased", "multi_random"].includes(A_type)){
      throw `CompatibilityError at ${step+1}: Answer type ${A_type} not fit for ${Q_type}`
      }
    else if(A_type === "biased"){
      if (list_sum(params)!==100 && data.must_answer){
        throw `LimitsError at ${step+1}: All percentages must add to 100% not ${list_sum(params)}%. The question is of type 'must-answer'`
      } else if(list_sum(params)>100){  
        throw `LimitsError at ${step+1}: All percentages must add to 100% or less not ${list_sum(params)}%`
      }
    }
  }
}

function getResponseIndex(ans_config) {
  const { type, params } = ans_config;
  if (type === "gaussian") {
    const [min, max, mean, stdev] = params;
    return gaussianRandom_ans(min-1, max-1, mean-1, stdev);
  } else if (type === "biased") {
    return biased_random(...params);
  } else if(type === "multi_biased"){
    return multiple_biased(params);
  }else if(type === "multi_random"){
    const [min, max, amount] = params;
    return multiple_random(min-1, max-1, amount);
  }else if(type === "random"){
    const [min, max] = params;
    return get_random_int(min-1, max-1)
  } else if (type === "biased_text") {
    return biased_text(params);
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
        }, 10000).then(() => {
          console.log("Page loaded");
        });
        

        let questionHolder = await driver.findElement(By.xpath(questionHolder_xpath));
        let q_elements = await get_children(questionHolder);  
        //console.log(q_elements);

        let page_data = [];
        let page_answers = [];

        let skip_counter = 0;
        for (i in q_elements){
          let current = await q_elements[i];
          console.log(await current.getAttribute("class"));
          let current_data = await get_data(current, i);
          if (current_data === null) {
            skip_counter += 1;
            continue;
          }
          page_data.push(current_data);
          if(!["longText", "shortText"].includes(current_data.type)){
            page_answers.push({type: "random", params: [1, current_data.length]});
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
          page_data[page_data.length-1].continue_xpath = [submit_button_xpath];
        } else {
          let last_question = data[data.length-1];
          last_question.continue_xpath.push(submit_button_xpath);
        };
        
        data.push(...page_data);

        let submit_button = await driver.findElement(By.xpath(submit_button_xpath)); 
        submit_text = await submit_button.getAttribute("innerHTML");
        
        if(submit_text == "Submit"){
          console.log("Prope done");
          return data;
        }
        await submit_button.click();
    }
} 

async function get_data(element, step){
  let data_stack = await get_children(element);
  console.log(await data_stack);

  if (data_stack.length === 0){
    return null;
  };

  let raw_data = await data_stack[0].getAttribute("data-params");

  let identifier;

  let data = {};

  if([null, undefined].includes(raw_data)){
    return null;
  }

  let must_answer_parent = await element.findElement(By.xpath("./div/div/div[1]/div"));
  let must_answer_star = await get_children(must_answer_parent);
  let must_answer_parameter = await must_answer_star[0].getAttribute("aria-describedby");

  data.must_answer = ([null, undefined].includes(must_answer_parameter));

  raw_data = raw_data.slice(4);
  raw_data = JSON.parse(reverse_str(reverse_str(raw_data).slice(reverse_str(raw_data).indexOf("]", 1))));
  identifier = raw_data[3];

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

async function answer_question(ans, data, step, prev_answer_index){
  let element = await driver.findElement(By.xpath(data.element_xpath));
  let answer;
  //console.log(data.must_answer);

  error_check(data, ans, step);

  if(ans.type==="none"){
    return;
  };

  
  //Checking logic criteria
  if(ans.logic !== undefined){
    switch (Object.keys(ans.logic)[0]) {
      case "prev_answer":
        if (ans.logic.prev_answer[0] > prev_answer_index || prev_answer_index > ans.logic.prev_answer[1]){
          return null;
        }
        break;
    }
  }

  await driver.executeScript(
    "arguments[0].scrollIntoView({block: 'center'});", 
    element
  );
  
  switch(data.type){
    case "checkbox": 
      var check_choice = await getResponseIndex(ans);
      let check_parent = await element.findElement(By.xpath('./div/div/div[2]/div[1]'))
      let checkbox_options = await get_children(check_parent);

      if(Array.isArray(check_choice)){
        for(i in checkbox_options){
          if(check_choice.includes(parseInt(i))){
            let _box = await checkbox_options[i];
            await _box.click();
          }
        }
      } else {
        let _box = await checkbox_options[check_choice];
        await _box.click();
      }
      break;

    case "scale":
      var scale_choice = getResponseIndex(ans);
      let scale_parent = await element.findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
      let scale_options = await get_children(scale_parent);
      scale_options = scale_options.slice(1,-1);
      let _scale = await scale_options[scale_choice];
      answer = scale_choice;
      await _scale.click();
      break;

    case "multipleChoice":
      var multi_choice = getResponseIndex(ans);
      let multi_parent = await element.findElement(By.xpath('./div/div/div[2]/div[1]/div/span/div'))
      //let multi_parent = await element.findElement(By.xpath('./div/div/div[2]/div'));
      let multi_options = await get_children(multi_parent);
      let _multi = await multi_options[multi_choice];
      answer = multi_choice;
      await _multi.click();
      break;

    case "rating":
      var rating_choice = getResponseIndex(ans);
      let rating_parent = await element.findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
      let rating_options = await get_children(rating_parent);
      rating_options = await rating_options.slice(1,-1);
      let _rating = await rating_options[rating_choice];
      answer = rating_choice;
      await _rating.click();
      break;
    case "shortText":
      let short_paragraph = await element.findElement(By.xpath('./div/div/div[2]/div/div[1]/div/div[1]/input'));
      await driver.executeScript("arguments[0].scrollIntoView(true);", short_paragraph);
      await short_paragraph.sendKeys(getResponseIndex(ans));
      break;

    case "longText":
      let long_paragraph = await element.findElement(By.xpath('./div/div/div[2]/div/div[1]/div[2]/textarea'));
      await driver.executeScript("arguments[0].scrollIntoView(true);", long_paragraph);
      await long_paragraph.sendKeys(getResponseIndex(ans));
      break;

    case "dropdown":
      let dropdown_choice = getResponseIndex(ans);
      let dropdown = await element.findElement(By.xpath('./div/div/div[2]/div'));
      let choices = await get_children(await element.findElement(By.xpath('./div/div/div[2]/div/div[2]')));
      await dropdown.click();
      await driver.wait(
        until.elementLocated(By.xpath(`html/body/div[1]/div[2]/form/div[2]/div/div[2]/div[${Number(step)+1}]/div/div/div[2]/div/div[2]/div[3]`)),
        5000
      );
      await choices[dropdown_choice+2].click();
      answer = dropdown_choice;
      await driver.wait(
        until.stalenessOf(await element.findElement(By.xpath('./div/div/div[2]/div/div[2]/div[3]'))),
        500
      );
      break;

    default:
      throw `CompatibilityError at ${parseInt(step)+1}: Unsupported itemtype`
  }
  return answer;
};

async function submitFakeResponse(answersheet, data){
  let prev_answer_index = null;
  for (step in data){
    prev_answer_index = await answer_question(answersheet[step], data[step], step, prev_answer_index);
    if(data[step].continue_xpath !== undefined){
      for(var i in data[step].continue_xpath){
        let continue_button = await driver.findElement(By.xpath(data[step].continue_xpath[i]));
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


submitWave(applicants, original_URL, answers);