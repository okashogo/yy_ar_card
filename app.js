const video = document.getElementById("camera");
const canvas = document.getElementById("output");
const statusElement = document.getElementById("status");
const templateImgElement = document.getElementById("template-img");

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
    statusElement.innerText = `ステータス: カードが認識されていません (類似度: ${similarity.toFixed(
      2
    )})`;

    if (similarity >= 0.3) {
      statusElement.innerText = `ステータス: カードが認識されました！ (類似度: ${similarity.toFixed(
        2
      )})`;
      clearInterval(interval);
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

checkOpenCvReady();
