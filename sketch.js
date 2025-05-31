// 這是一個用 p5.js 和 ml5.js handpose 製作的互動小遊戲
// 玩家用雙手選擇左右下角的選項，猜教育科技相關題目

let video;
let handposeModel;
let predictions = [];

// PoseNet 相關
let poseNet;
let poses = [];

// 題目資料陣列，每題包含問題、選項A/B、正確答案、課程簡介
const questions = [
  {
    question: "哪個工具可以用來設計教材？",
    optionA: "A：Canva",
    optionB: "B：Excel",
    answer: "A",
    intro: "Canva 是一個簡單易用的線上教材設計工具，適合教育應用。"
  },
  {
    question: "哪個程式語言可以用來做互動作品？",
    optionA: "A：Word",
    optionB: "B：p5.js",
    answer: "B",
    intro: "p5.js 是一個適合創作互動作品的 JavaScript 函式庫。"
  },
  {
    question: "哪個平台可以用來做即時互動簡報？",
    optionA: "A：Mentimeter",
    optionB: "B：PowerPoint",
    answer: "A",
    intro: "Mentimeter 可以讓老師與學生即時互動，適合用於簡報。"
  }
];

let currentQuestion = 0; // 目前題號（從0開始）
let correctCount = 0;    // 答對題數

// 選項區域座標
let leftZone = { x: 40, y: 380, w: 200, h: 80 };
let rightZone = { x: 400, y: 380, w: 200, h: 80 };

// 計時用
let leftHandInZoneTime = 0;
let rightHandInZoneTime = 0;
let selectThreshold = 2000; // 2秒

let gameState = "question"; // "question", "correct", "wrong", "result"

let replayButton; // 儲存再玩一次按鈕

// 圖片物件
let imgP1, imgP2, imgP3, imgP4;

// 載入圖片
function preload() {
  imgP1 = loadImage('P1.png'); // 第一題面具
  imgP2 = loadImage('P2.png'); // 第二題面具
  imgP3 = loadImage('P3.png'); // 第三題面具
  imgP4 = loadImage('P4.png'); // 皇冠
}

function setup() {
  createCanvas(640, 480).position(
    (windowWidth - 640) / 2,
    (windowHeight - 480) / 2
  );
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // 啟用 handpose
  handposeModel = ml5.handpose(video, modelReady);
  handposeModel.on('predict', results => {
    predictions = results;
  });

  // 啟用 PoseNet
  poseNet = ml5.poseNet(video, () => {
    console.log("PoseNet model loaded!");
  });
  poseNet.on('pose', function(results) {
    poses = results;
  });

  textAlign(CENTER, CENTER);
  rectMode(CORNER);
}

function modelReady() {
  // Handpose模型載入完成
  console.log("Handpose model loaded!");
}

function draw() {
  image(video, 0, 0, width, height);

  // 疊加面具或皇冠
  drawFaceOverlay();

  // 顯示題號
  if (gameState !== "result") {
    fill(0, 180);
    noStroke();
    rect(0, 10, width, 30, 10);
    fill(255);
    textSize(18);
    text(`第 ${currentQuestion + 1} / 共 ${questions.length} 題`, width / 2, 25);
  }

  // 畫選項區域
  if (gameState !== "result") {
    drawOptions();
  }

  // 顯示題目
  if (gameState !== "result") {
    fill(0, 180);
    noStroke();
    rect(0, 40, width, 60, 10);
    fill(255);
    textSize(24);
    text(questions[currentQuestion].question, width / 2, 70);
  }

  // 畫手部關鍵點
  drawHandKeypoints();

  // 狀態判斷
  if (gameState === "question") {
    checkHandSelection();
    // 隱藏 replayButton（如果存在）
    if (replayButton) {
      replayButton.hide();
    }
  } else if (gameState === "correct") {
    showFeedback(true);
    if (replayButton) {
      replayButton.hide();
    }
  } else if (gameState === "wrong") {
    showFeedback(false);
    if (replayButton) {
      replayButton.hide();
    }
  } else if (gameState === "result") {
    showResult();
  }
}

// 畫左右下角的選項區域
function drawOptions() {
  // 左選項
  fill(200, 230, 255, 200);
  stroke(0, 100, 200);
  strokeWeight(2);
  rect(leftZone.x, leftZone.y, leftZone.w, leftZone.h, 15);
  fill(0);
  noStroke();
  textSize(22);
  text(questions[currentQuestion].optionA, leftZone.x + leftZone.w / 2, leftZone.y + leftZone.h / 2);

  // 右選項
  fill(255, 230, 200, 200);
  stroke(200, 100, 0);
  strokeWeight(2);
  rect(rightZone.x, rightZone.y, rightZone.w, rightZone.h, 15);
  fill(0);
  noStroke();
  textSize(22);
  text(questions[currentQuestion].optionB, rightZone.x + rightZone.w / 2, rightZone.y + rightZone.h / 2);
}

// 畫出所有手指關鍵點
function drawHandKeypoints() {
  // 結果頁時不再畫手指
  if (gameState === "result") return;
  for (let i = 0; i < predictions.length; i++) {
    const hand = predictions[i];
    const landmarks = hand.landmarks;
    for (let j = 0; j < landmarks.length; j++) {
      const [x, y, z] = landmarks[j];
      fill(255, 0, 100);
      noStroke();
      ellipse(x, y, 10, 10);
    }
  }
}

// 判斷手指是否進入選項區域並計時
function checkHandSelection() {
  let now = millis();
  let leftIn = false;
  let rightIn = false;

  for (let i = 0; i < predictions.length; i++) {
    const hand = predictions[i];
    // 用 index finger tip (第8點) 判斷
    const [x, y] = hand.landmarks[8];

    // 判斷左手（靠左邊）進入左區
    if (x < width / 2 && inZone(x, y, leftZone)) {
      leftIn = true;
    }
    // 判斷右手（靠右邊）進入右區
    if (x > width / 2 && inZone(x, y, rightZone)) {
      rightIn = true;
    }
  }

  // 左手進入左區
  if (leftIn) {
    if (leftHandInZoneTime === 0) leftHandInZoneTime = now;
    // 畫進度條
    drawProgressBar(leftZone.x, leftZone.y - 15, (now - leftHandInZoneTime) / selectThreshold);
    if (now - leftHandInZoneTime > selectThreshold) {
      // 選擇A
      if (questions[currentQuestion].answer === "A") {
        gameState = "correct";
        correctCount++;
      } else {
        gameState = "wrong";
      }
      leftHandInZoneTime = 0;
      rightHandInZoneTime = 0;
    }
  } else {
    leftHandInZoneTime = 0;
  }

  // 右手進入右區
  if (rightIn) {
    if (rightHandInZoneTime === 0) rightHandInZoneTime = now;
    // 畫進度條
    drawProgressBar(rightZone.x, rightZone.y - 15, (now - rightHandInZoneTime) / selectThreshold);
    if (now - rightHandInZoneTime > selectThreshold) {
      // 選擇B
      if (questions[currentQuestion].answer === "B") {
        gameState = "correct";
        correctCount++;
      } else {
        gameState = "wrong";
      }
      leftHandInZoneTime = 0;
      rightHandInZoneTime = 0;
    }
  } else {
    rightHandInZoneTime = 0;
  }
}

// 判斷(x, y)是否在區域內
function inZone(x, y, zone) {
  return x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h;
}

// 畫進度條
function drawProgressBar(x, y, percent) {
  percent = constrain(percent, 0, 1);
  fill(100, 200, 100);
  noStroke();
  rect(x, y, 200 * percent, 10, 5);
}

// 顯示回饋訊息
function showFeedback(isCorrect) {
  fill(0, 180);
  rect(0, 160, width, 120, 10);
  fill(255);
  textSize(36);
  if (isCorrect) {
    text("正確！", width / 2, 200);
    textSize(20);
    text(questions[currentQuestion].intro, width / 2, 250);
  } else {
    text("喔不，答錯了！", width / 2, 200);
    textSize(18);
    text("正確答案：" + questions[currentQuestion].answer + "，" + questions[currentQuestion].intro, width / 2, 250);
  }

  // 2秒後自動進入下一題或結果頁（不論對錯都會換題）
  if (!showFeedback.timerSet) {
    showFeedback.timerSet = true;
    setTimeout(() => {
      showFeedback.timerSet = false;
      if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        gameState = "question";
      } else {
        gameState = "result";
      }
    }, 2000);
  }
}

// 顯示結果頁面
function showResult() {
  fill(0, 180);
  rect(0, 120, width, 200, 20);
  fill(255);
  textSize(36);
  text("遊戲結束！", width / 2, 170);
  textSize(28);
  text(`你答對 ${correctCount} / ${questions.length} 題`, width / 2, 210);

  // 根據答對題數顯示不同結語
  let msg = "";
  if (correctCount === 3) {
    msg = "太厲害了！你完全是教育科技高手！";
  } else if (correctCount === 2) {
    msg = "好棒！你對教育科技已經很有概念了～";
  } else if (correctCount === 1) {
    msg = "不錯唷～再接再厲更進一步！";
  } else {
    msg = "沒關係，再玩一次就會更熟悉了！加油！";
  }
  textSize(20);
  text(msg, width / 2, 250);

  // 顯示「再玩一次」按鈕
  if (!replayButton) {
    replayButton = createButton('再玩一次');
    replayButton.position(width / 2 - 40 + (windowWidth - width) / 2, 320 + (windowHeight - height) / 2);
    replayButton.size(80, 40);
    replayButton.style('font-size', '18px');
    replayButton.mousePressed(() => {
      currentQuestion = 0;
      correctCount = 0;
      gameState = "question";
      replayButton.hide();
    });
  } else {
    replayButton.show();
  }
}

// 取代原本的 drawFaceOverlay，改用 PoseNet 並根據 currentQuestion 與答題狀態顯示面具與皇冠
function drawFaceOverlay() {
  if (poses.length > 0) {
    let pose = poses[0].pose;
    // 取得左右眼座標
    let leftEye = pose.keypoints.find(k => k.part === "leftEye");
    let rightEye = pose.keypoints.find(k => k.part === "rightEye");

    if (
      leftEye && rightEye &&
      leftEye.score > 0.3 && rightEye.score > 0.3
    ) {
      // 計算雙眼中心點
      let centerX = (leftEye.position.x + rightEye.position.x) / 2;
      let centerY = (leftEye.position.y + rightEye.position.y) / 2;

      // 根據眼睛距離決定面具大小
      let eyeDist = dist(leftEye.position.x, leftEye.position.y, rightEye.position.x, rightEye.position.y);
      let maskW = eyeDist * 3.2;
      let maskH = eyeDist * 2.5;

      // 選擇要顯示的面具
      let maskImg = null;
      if (gameState === "question" || gameState === "correct" || gameState === "wrong") {
        if (currentQuestion === 0) maskImg = imgP1;
        else if (currentQuestion === 1) maskImg = imgP2;
        else if (currentQuestion === 2) maskImg = imgP3;
      } else if (gameState === "result") {
        // 結果頁時顯示最後一題的面具
        if (currentQuestion === 2) maskImg = imgP3;
        else if (currentQuestion === 1) maskImg = imgP2;
        else maskImg = imgP1;
      }

      // 讓面具再往上移動一點（例如 -maskH/2 - 30）
      let maskYOffset = maskH / 2 + 30;
      if (maskImg) {
        image(maskImg, centerX - maskW / 2, centerY - maskYOffset, maskW, maskH);
      }

      // 皇冠顯示條件與位置
      if (gameState === "result" && correctCount === 3) {
        let crownW = maskW * 0.7;
        let crownH = maskH * 0.5;
        let crownY = centerY - maskH / 2 - crownH + 10 - 30; // 皇冠也往上移一點
        image(imgP4, centerX - crownW / 2, crownY, crownW, crownH);
      }
    }
  }
}
