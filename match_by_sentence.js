const fs = require('fs');
const ss = require('string-similarity-js');

const originFile = '2023_prism.ass';
const targetFile = '2023_prism.json';

// 读取originFile和targetFile内容
const originContent = fs.readFileSync(originFile, 'utf-8');
const targetContent = fs.readFileSync(targetFile, 'utf-8');

const targetContentJson = JSON.parse(targetContent);
const originContentTextLines = originContent.split('\n');

const getTextFromLine = (line) => {
  return line.split('0,0,0,,')[1];
}

const originContentLines = []
let engFlag = false;
for (let i = 0; i < originContentTextLines.length; i++) {
  const line = originContentTextLines[i];
  if (!line.startsWith('Dialogue:')) {
    continue;
  }
  if (line.includes('\\fad(')
    || line.includes('\\move(')
    || line.includes('\\fs')
    || line.includes('\\pos')
  ) {
    continue;
  }
  if (line.includes(',ENG,,')) {
    if (engFlag) {
      originContentLines.push('');
    }
    originContentLines.push(getTextFromLine(line))
    engFlag = true;
  }
  else if (line.includes(',CHN,,') || line.includes(',ZH,,')) {
    if (!engFlag) {
      console.error('ass解析失败:', line)
      break;
    }
    originContentLines.push(getTextFromLine(line)
      .replace(/\{\\fsp\-\d*\}/g, '')
      .replace(/\{\\.*\}/g, ''))
    engFlag = false;
  }
}

// console.log(originContentLines)

const pairs = [];
for (let i = 0; i < originContentLines.length; i += 2) {
  const line = originContentLines[i];
  if (i == originContentLines.length - 1) {
    continue;
  }
  const nextLine = originContentLines[i + 1]
  pairs.push({
    en: line.replace(/\W/g, '').toLowerCase(),
    enO: line,
    zh: nextLine
  });
}
// console.log(pairs);

targetContentJson.forEach(item => {
  item.translatedText = ''
  item.inputM = item.input.replace(/\W/g, '').toLowerCase()
});

const matchSentence = (target, origin) => {
  return ss.stringSimilarity(target.slice(0, origin.length), origin) > 0.5
    || target.includes(origin);
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
    // console.log('当前索引：', targetContentJson[currentIndex]);
  }
  targetContentJson[currentIndex].inputM = targetContentJson[currentIndex].inputM.slice(pair.en.length);
}
targetContentJson.forEach(item => {
  item.translatedText = item.translatedText.trim().replace(/ +/g, ' ');
  delete item.inputM;
});
fs.writeFileSync('result_' + targetFile, JSON.stringify(targetContentJson, null, 1));

