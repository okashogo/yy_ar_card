// const THRESHOLD_VALUE = 0.1;
const THRESHOLD_VALUE = 0.37;

const video = document.getElementById("camera");
const canvas = document.getElementById("output");
const statusElement = document.getElementById("status");
const templateImgElement = document.getElementById("template-img");
const resetButton = document.getElementById("reset");

const pokemons = [
  { name: "pikachu.glb", weight: 5 },
  { name: "Groudon.glb", weight: 1 }, // 出現確率を低め
  { name: "GroudonPrimal.glb", weight: 1 }, // 出現確率を低め
  { name: "diguda.glb", weight: 2 },
  { name: "iberutaru.glb", weight: 1 },
  { name: "koikingu.glb", weight: 3 },
  { name: "nyasu.glb", weight: 2 },
  { name: "raikou.glb", weight: 1 },
  { name: "sander.glb", weight: 2 },
  { name: "zekuromu.glb", weight: 1 },
  { name: "nidoran.glb", weight: 2 },
  { name: "omunito.glb", weight: 2 },
  { name: "ninfia.glb", weight: 2 },
  { name: "zeruneasu.glb", weight: 1 },
  { name: "hitokage.glb", weight: 2 },
  { name: "gardi.glb", weight: 2 },
  { name: "kaioga.glb", weight: 1 },
  { name: "kaioga_primal.glb", weight: 1 },
  { name: "girati.glb", weight: 1 },
  { name: "kodakku.glb", weight: 2 },
];

const setModel = (model, selectedPokemon) => {
  const pokemonName = selectedPokemon.split("/").pop().split(".")[0];
  if (["GroudonPrimal"].includes(pokemonName)) {
    model.scale.set(0.0035, 0.0035, 0.0035); // サイズ調整
  } else if (["Groudon"].includes(pokemonName)) {
    model.scale.set(0.004, 0.004, 0.004); // サイズ調整
  } else if (["raikou", "zekuromu"].includes(pokemonName)) {
    model.scale.set(0.007, 0.007, 0.007); // サイズ調整
  } else if (["ninfia"].includes(pokemonName)) {
    model.scale.set(0.013, 0.013, 0.013); // サイズ調整
  } else if (
    [
      "iberutaru",
      "sander",
      "nidoran",
      "zeruneasu",
      "hitokage",
      "gardi",
    ].includes(pokemonName)
  ) {
    model.scale.set(0.02, 0.02, 0.02); // サイズ調整
  } else if (["diguda"].includes(pokemonName)) {
    model.scale.set(2, 2, 2); // サイズ調整
  } else if (["koikingu", "omunito"].includes(pokemonName)) {
    model.scale.set(0.6, 0.6, 0.6); // サイズ調整
  } else if (["kaioga"].includes(pokemonName)) {
    model.scale.set(0.005, 0.005, 0.005); // サイズ調整
  } else if (["kaioga_primal"].includes(pokemonName)) {
    model.scale.set(0.1, 0.1, 0.1); // サイズ調整
  } else {
    model.scale.set(0.03, 0.03, 0.03); // サイズ調整
  }
};
// 📌 3Dモデル（Pikachu.glb）をロード
let model;

let maxSimilarity = 0;

// Webカメラ映像を取得
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    statusElement.innerText = "ステータス: カメラ起動中";
  })
  .catch((err) => {
    statusElement.innerText = "カメラの起動に失敗しました: " + err.message;
  });

const start = async () => {
  console.log("OpenCV.js initialized.");

  // OpenCV.jsがロードされるまで待機
  await cv.onRuntimeInitialized;

  const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  const cap = new cv.VideoCapture(video);

  // **テンプレート画像の読み込みと前処理**
  const templateImg = cv.imread(templateImgElement);

  // テンプレート画像の解像度をカメラ映像の解像度に合わせてリサイズ
  const resizedTemplate = new cv.Mat();
  const newSize = new cv.Size(400, 300); // 適切なサイズを指定
  cv.resize(templateImg, resizedTemplate, newSize, 0, 0, cv.INTER_AREA);

  // テンプレート画像をグレースケール化し、明るさを均一化
  const grayTemplate = new cv.Mat();
  cv.cvtColor(resizedTemplate, grayTemplate, cv.COLOR_RGBA2GRAY);
  cv.equalizeHist(grayTemplate, grayTemplate);

  // テンプレート画像の特徴点を検出
  const orb = new cv.ORB(1000); // 特徴点数を増加
  const templateKeypoints = new cv.KeyPointVector();
  const templateDescriptors = new cv.Mat();
  orb.detectAndCompute(
    grayTemplate,
    new cv.Mat(),
    templateKeypoints,
    templateDescriptors
  );

  // メモリ解放
  resizedTemplate.delete();
  grayTemplate.delete();

  // **マッチング設定**
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);

  statusElement.innerText = "ステータス: 準備完了";

  // **リアルタイム処理**
  const interval = setInterval(() => {
    cap.read(src);

    // カメラフレームをクロップする処理（背景ノイズの削減）
    // --------------------------------------------------------
    // - ここではカメラフレームの特定の領域（カードが映っている部分）だけを切り出します。
    // - `rect`はクロップする領域を表します。(x, y, width, height)
    // - この例では、フレームの中央部分を切り出す設定にしています。
    // --------------------------------------------------------
    const croppedFrame = new cv.Mat();
    const rect = new cv.Rect(100, 100, 400, 300); // 必要な領域 (x:100, y:100, 幅400, 高さ300)
    src.roi(rect).copyTo(croppedFrame);

    // カメラフレームをグレースケール化し、明るさを均一化
    const grayFrame = new cv.Mat();
    cv.cvtColor(croppedFrame, grayFrame, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(grayFrame, grayFrame);

    // カメラフレームの特徴点を検出
    const frameKeypoints = new cv.KeyPointVector();
    const frameDescriptors = new cv.Mat();
    orb.detectAndCompute(
      grayFrame,
      new cv.Mat(),
      frameKeypoints,
      frameDescriptors
    );

    // 特徴点マッチング
    const matches = new cv.DMatchVector();
    matcher.match(templateDescriptors, frameDescriptors, matches);

    // 類似度スコアを計算
    const similarity = matches.size() / templateKeypoints.size();
    maxSimilarity = Math.max(maxSimilarity, similarity);
    statusElement.innerText = `類似度: ${maxSimilarity.toFixed(2)}`;

    if (maxSimilarity >= THRESHOLD_VALUE) {
      statusElement.innerText = `類似度: ${maxSimilarity.toFixed(2)}`;
      model.visible = true;
      clearInterval(interval);
      resetButton.style.display = "block";
    }

    // メモリ解放
    croppedFrame.delete();
    grayFrame.delete();
    frameKeypoints.delete();
    frameDescriptors.delete();
    matches.delete();
  }, 100);
};

function checkOpenCvReady() {
  if (typeof cv !== "undefined" && cv.getBuildInformation) {
    console.log("OpenCV.js is ready.");
    start();
  } else {
    console.log("OpenCV.js is not ready.");
    setTimeout(checkOpenCvReady, 100);
  }
}

async function getBackCamera() {
  // 一度 getUserMedia() を実行してカメラのラベル情報を取得可能にする
  try {
    await navigator.mediaDevices.getUserMedia({
      video: true,
    });
  } catch (error) {
    console.error("カメラの一時アクセスに失敗しました:", error);
  }

  // すべてのカメラデバイスを取得
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");

  // "back" または "environment" を含むカメラを探す
  const backCamera = videoDevices.find(
    (device) =>
      device.label.toLowerCase().includes("back") ||
      device.label.toLowerCase().includes("environment")
  );

  return backCamera ? backCamera.deviceId : null;
}

async function startCamera() {
  try {
    const backCameraId = await getBackCamera();

    let constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        // Androidの場合はdeviceIdを使用
        deviceId: backCameraId ? { exact: backCameraId } : undefined,
        // iPhoneの場合はfacingModeを使用
        facingMode: { exact: "environment" },
      },
    };

    // ストリームを取得
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (error) {
    console.error("カメラの起動に失敗しました:", error);
  }
}

// 初回の getUserMedia 呼び出しでデバイス情報を取得
async function initializeCamera() {
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    stream.getTracks().forEach((track) => track.stop()); // すぐに停止してデバイス情報だけ取得
    await startCamera();
  } catch (error) {
    console.error("初回カメラアクセスに失敗しました:", error);
  }
}

// カメラ一覧を取得し、外カメラを探す
async function selectCameraManually() {
  let devices = await navigator.mediaDevices.enumerateDevices();
  let videoDevices = devices.filter((device) => device.kind === "videoinput");

  if (videoDevices.length === 0) {
    console.error("カメラデバイスが見つかりません");
    return;
  }

  let backCamera = videoDevices.find((device) =>
    device.label.toLowerCase().includes("back")
  );

  let constraints = {
    video: {
      facingMode: { exact: "environment" },
      deviceId: backCamera
        ? { exact: backCamera.deviceId }
        : { exact: videoDevices[0].deviceId },
    },
  };

  try {
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (error) {
    console.error("カメラの手動選択に失敗しました:", error);
  }
}

// 📌 カメラ映像の取得
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("カメラのアクセスに失敗しました:", err);
  });

// 📌 Three.js のシーンを作成
const scene = new THREE.Scene();

// 📌 カメラ設定
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 2); // 3Dオブジェクトを表示する位置

// 📌 レンダラー設定（背景透明）
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 📌 ライト設定
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // 環境光
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(10, 10, 10); // ライトの方向
scene.add(directionalLight);

const loader = new THREE.GLTFLoader();

// 重みに基づいてランダムに選択する関数
function getRandomPokemon() {
  let totalWeight = pokemons.reduce((sum, p) => sum + p.weight, 0);
  let randomNum = Math.random() * totalWeight;

  for (let p of pokemons) {
    if (randomNum < p.weight) {
      return "assets/" + p.name;
    }
    randomNum -= p.weight;
  }
}

// ランダムに選ばれたポケモンをロード
const selectedPokemon = getRandomPokemon();
loader.load(selectedPokemon, function (gltf) {
  model = gltf.scene;
  setModel(model, selectedPokemon);
  model.position.set(0, -1, 0); // 位置調整
  model.visible = false;
  scene.add(model);
});

// 📌 アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  if (model) {
    model.rotation.y += 0.01; // モデルを回転
  }
  renderer.render(scene, camera);
}
animate();

// 📌 ウィンドウリサイズ対応
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

window.onload = () => {
  initializeCamera();
  checkOpenCvReady();
};

resetButton.addEventListener("click", () => {
  initializeCamera();
  checkOpenCvReady();
  maxSimilarity = 0;

  // 表示されてあるmodelを消す。
  model.visible = false;

  // ランダムに選ばれたポケモンをロード
  const selectedPokemon = getRandomPokemon();
  loader.load(selectedPokemon, function (gltf) {
    model = gltf.scene;
    setModel(model, selectedPokemon);
    model.position.set(0, -1, 0); // 位置調整
    model.visible = false;
    scene.add(model);
  });
});
