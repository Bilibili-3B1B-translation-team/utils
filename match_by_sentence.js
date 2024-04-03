const fs = require('fs');
const ss = require('string-similarity-js');

const originFile = 'test_origin_captions.ass';
const targetFile = 'sentence_translations.json';

// 读取originFile和targetFile内容
const originContent = fs.readFileSync(originFile, 'utf-8');
const targetContent = fs.readFileSync(targetFile, 'utf-8');

const targetContentJson = JSON.parse(targetContent);
const originContentLines = originContent.split('\n');

const getTextFromLine = (line) => {
  return line.split('0,0,0,,')[1];
}

const pairs = [];
let beginFlag = false;
for (let i = 0; i < originContentLines.length; i++) {
  const line = originContentLines[i];
  if (!beginFlag) {
    if (line.startsWith('Dialogue:') && line.includes('ENG')) {
      beginFlag = true;
    }
    else {
      continue;
    }
  }
  if (i == originContentLines.length - 1) {
    continue;
  }
  const nextLine = originContentLines[i + 1]
  pairs.push({
    en: getTextFromLine(line).replace(/\W/g, '').toLowerCase(),
    enO: getTextFromLine(line),
    zh: getTextFromLine(nextLine)
  });

  i++;
}

targetContentJson.forEach(item => {
  item.translatedText = ''
  item.inputM = item.input.replace(/\W/g, '').toLowerCase()
});

const matchSentence = (target, origin) => {
  return ss.stringSimilarity(target.slice(0, origin.length), origin) > 0.5;
}

let currentIndex = 0
while (pairs.length) {
  const pair = pairs.shift();
  if (targetContentJson[currentIndex] && matchSentence(targetContentJson[currentIndex].inputM, pair.en)) {
    targetContentJson[currentIndex].translatedText += (pair.zh + ' ');
  }
  else if (targetContentJson[currentIndex + 1]
      && matchSentence(targetContentJson[currentIndex + 1].inputM, pair.en)) {
      currentIndex++;
      targetContentJson[currentIndex].translatedText += (pair.zh + ' ');
  }
  else if (targetContentJson[currentIndex + 2]
    && matchSentence(targetContentJson[currentIndex + 2].inputM, pair.en)) {
    currentIndex += 2;
    targetContentJson[currentIndex].translatedText += (pair.zh + ' ');
  }
  else {
    console.log('未匹配：', pair);
  }
  targetContentJson[currentIndex].inputM = targetContentJson[currentIndex].inputM.slice(pair.en.length);
}
targetContentJson.forEach(item => {
  item.translatedText = item.translatedText.trim().replace('  ', ' ');
  delete item.inputM;
});
fs.writeFileSync('result_' + targetFile, JSON.stringify(targetContentJson, null, 1));

