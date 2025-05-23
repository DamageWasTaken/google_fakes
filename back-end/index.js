const {By, Builder, Browser, until, Capabilities} = require('selenium-webdriver');
const assert = require("assert");
const firefox = require('selenium-webdriver/firefox');
var fs = require('fs');
//const { generateKey } = require('crypto');
//const { Children } = require('react');

////////////////////////////////////////////////
const answers = [
  {type: "biased", params: [0]},
  {type: "biased", params: [0]},
  {type: "biased", params: [5,10,15,70]},
  {type: "biased", params: [50,25,15,10]},
  {type: "multi_biased", params: [50,50,50,50]},
  {type: "biased", params: [0,50,50,0]},
];

const applicants = 5;
const URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd86dBJ7EDRN0-HKUNw2dzTjPP9Lj3hIvbQuy7bhIvyxJdZmg/viewform'
///////////////////////////////////////////////

const identifiers ={
  "checkbox": 4,
  "scale": 5,
  "multipleChoice": 2,
  "rating":18,
  "shortText":0,
  "longText":1
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
    //console.log(sum)
  }
  for (var i = min; i<=max; i++){
    //console.log(i)
    at_index = (1/(stdev*Math.sqrt(2 * Math.PI)))*Math.pow(Math.E, -(1/2)*Math.pow((i-mean)/stdev,2))
    //console.log(at_index)
    dist.push((at_index/sum)*100);
  }
  return biased_random(...dist);
}
/*
function test(){
  var reps = 100000;
  var max = 5;
  var min = 1;
  var std = 2;
  var mean = 1;
  var dict = {"0":0};
  var cur = 0;
  for(var i = 0; i<reps; i++){
    cur = gaussianRandom_ans(min, max, mean, std);

    keys = Object.keys(dict);

    if (!keys.includes(`${cur}`)){
      dict[`${cur}`] = 1;

    } else {
      dict[`${cur}`] += 1;
    }

  }
  console.log(dict)
  for (i in dict){
    console.log(`${i}: ${dict[i]/reps * 100}%`)
  }

}
*/

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
  //console.log(args_sorted);
  let array_sum = 0;
  const fate = Math.random()*100;
  let the_one = null;
  //console.log(fate);
  for (i in args_sorted) {
    const arg = args_sorted[i];
    array_sum += arg;
    if (fate >= array_sum - arg && fate <= array_sum) {
      the_one = arg;
      break;
    }
  }
  const Occs = findOcc(args, the_one);
  //console.log("test: "+Occs[getRandomInt(0, Occs.length - 1)]);
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
  //console.log(picks);
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
    //console.log('Nymber '+n)
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

async function get_data(element, step){
  let raw_data = await element[0].getAttribute("data-params")
  raw_data = raw_data.slice(4);
  raw_data = JSON.parse(reverse_str(reverse_str(raw_data).slice(reverse_str(raw_data).indexOf("]", 1))));
  let identifier = raw_data[3];
  let data = {};
  //console.log(raw_data);
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

  //console.log(data)
  return data
}

async function submitFakeResponse(answersheet, URL, pup){
  var driver;
  var ans = answersheet;

  var config_paths = await JSON.parse(fs.readFileSync('config_paths.json', 'utf8'));

  try {
// load
    const service = new firefox.ServiceBuilder(config_paths.geckodriver_path); // path to geckodriver
    const options = new firefox.Options()

    .addArguments('--headless')
    .addArguments('--no-sandbox')
    .setBinary(config_paths.firefox_path)
    
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


    await driver.get(URL);

    await driver.wait(async () => {
      const readyState = await driver.executeScript('return document.readyState');
      return readyState === 'complete';
    }, 10000);

    for (var its = 0; its<pup; its++){
      console.log(its+1);
      let questionHolder_xpath = '//*[@id="mG61Hd"]/div[2]/div/div[2]';

      await driver.wait(
        until.elementLocated(By.xpath(questionHolder_xpath)),
        10000
      );
  
      let questionHolder = await driver.findElement(By.xpath('//*[@id="mG61Hd"]/div[2]/div/div[2]'));
      let q_elements= await get_children(questionHolder);  

      let q_data = [];
      for (i in q_elements){
        let current = await get_children(q_elements[i]);
        q_data.push(await get_data(current, i));
      }
      //console.log(q_data);
    

  // handel
      if (ans.length>q_data.length){
        throw new Error(`ContainmentError: More Answers(${ans.length}) than Questions(${q_data.length})`)
      } else if (ans.length<q_data.length){
        throw `ContainmentError: Fewer Answers(${ans.length}) than Questions(${q_data.length})`
      }


      for (step in q_data){
        if(ans[step].type==="none"){
          continue;
        };
  //*[@id="mG61Hd"]/div[2]/div/div[2]/div[n]

        switch(q_data[step].type){
          case "checkbox": 
            var CheckChoice = await getResponseIndex(ans[step]);
            ErrorCheck(q_data[step].type, ans[step], step, q_data[step].length);
            let checkParent = await q_elements[step].findElement(By.xpath('./div/div/div[2]/div[1]'))
            let Checkbox_options = await get_children(checkParent);

            if (Array.isArray(CheckChoice)){
              for(i in Checkbox_options){
                if(CheckChoice.includes(parseInt(i))){
                  //console.log(CheckChoice);
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
            var scaleChoice = getResponseIndex(ans[step]);
            ErrorCheck(q_data[step].type, ans[step], step, q_data[step].length);
            let scaleParent = await q_elements[step].findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
            let scale_options = await get_children(scaleParent);
            scale_options = scale_options.slice(1,-1);
            let _scale = await scale_options[scaleChoice];
            await _scale.click();
            break;

          case "multipleChoice":
            var multiChoice = getResponseIndex(ans[step]);
            ErrorCheck(q_data[step].type, ans[step], step, q_data[step].length);

            let multiParent = await q_elements[step].findElement(By.xpath('./div/div/div[2]/div[1]/div/span/div'))
            let multi_options = await get_children(multiParent);
            let _multi = await multi_options[multiChoice];
            //console.log(_multi);

            await _multi.click();
            
            //let _ = await driver.findElement(By.xpath('//*[@id="mG61Hd"]/div[2]/div/div[2]/div[6]/div/div/div[2]/div[1]/div/span/div/div[2]'))
            //await _.click()
            break;

          case "rating":
            var ratingChoice = getResponseIndex(ans[step]);
            ErrorCheck(q_data[step].type, ans[step], step, q_data[step].length);

            let ratingParent = await q_elements[step].findElement(By.xpath('./div/div/div[2]/div[1]/span/div'))
            let rating_options = await get_children(ratingParent);
            rating_options = await rating_options.slice(1,-1);

            let _rating = await rating_options[ratingChoice];
            await _rating.click();
            break;
          case "shortText":
            let shortPragraph = await q_elements[step].findElement(By.xpath('./div/div/div[2]/div/div[1]/div/div[1]/input'))
            await driver.actions()
            .sendKeys(shortPragraph, 'Fake short response n')
            .perform()
            break;

          case "longText":
            let longPragraph = await q_elements[step].findElement(By.xpath('./div/div/div[2]/div/div[1]/div[2]/textarea'))
            await driver.actions()
            .sendKeys(longPragraph, 'Fake long response n')
            .perform()
            break;
          default:
            throw `CompatibilityError at ${parseInt(step)+1}: Unsupported itemtype`
        }
      }

  //end
      let submitButton = await driver.findElement(By.xpath('//*[@id="mG61Hd"]/div[2]/div/div[3]/div/div[1]/div/span'));
      await submitButton.click();

      var return_xpath = '/html/body/div[1]/div[2]/div[1]/div/div[4]/a'

      await driver.wait(
        until.elementLocated(By.xpath(return_xpath)),
        10000
      );

      await driver.get(URL);
  }

  } catch (e) {
    console.log(e)
  } finally {
    driver.close();
  }
}


//submitWave(applicants, URL, answers);
submitFakeResponse(answers, URL, applicants)